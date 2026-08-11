import UField from "./un-field";
import ObjectFlags_T from "./un-object-flags";
import UObject, { LazyPropertyValue } from "./un-object";
import UNativeRegistry from "./un-native-registry";
import APackage from "./un-package";
import PropertyTag, { UNP_PropertyTypes } from "./un-property/un-property-tag";
import * as UnProperties from "./un-property/un-properties";

type MakeParams<T> = ConstructorParameters<{ new(): never } & T>;
type GenericConstructorParameters<T> = ConstructorParameters<new (...args: any[]) => T>;
type ScriptBytecodeEntry_T = { offset: number, type: string, value: any, tokenName?: string };

class UStruct<Class extends UObject = UObject> extends UField {
    declare ["constructor"]: typeof UStruct;

    protected textBufferId: number;

    protected firstChildPropId: number;
    public readonly childPropFields = new Map<string, UnProperties.UProperty>();
    public readonly childFunctions = new Array<C.UFunction>();
    public readonly childEnums = new Array<C.UEnum>();
    public readonly childStructs = new Array<UStruct>();
    public readonly childConsts = new Array<C.UConst>();
    public readonly childStates = new Array<C.UState>();

    public friendlyName: string;
    protected line: number;
    protected textPos: number;
    protected unkObjectId: number = 0;
    protected unkObject: UObject;
    protected scriptSize: number;
    protected kls: new () => Class;

    public readonly isStruct = true;

    protected static getConstructorName() { return "Struct"; }
    protected defaultProperties = new Map<string, any>();

    protected findValidProperty(varName: string) {

        let parent: UStruct = this;

        while (parent?.loadSelf()) {
            if (parent.childPropFields.has(varName))
                return parent.childPropFields.get(varName);

            parent = parent.superField;
        }

        return null;
    }

    protected loadProperty(pkg: APackage, tag: PropertyTag): void {
        const offStart = pkg.tell();
        const offEnd = offStart + tag.dataSize;

        const varName = this.getPropertyVarName(tag);
        const { name: propName } = tag;

        if (!varName)
            throw new Error(`Unrecognized property '${propName}' for '${this.constructor.name}' of type '${tag.getTypeName()}'`);

        const property = this.findValidProperty(varName);

        if (!property) {
            console.warn(`Cannot map property '${propName}' -> '${varName}' for '${this.constructor.name}', skipping`);
            pkg.seek(offEnd, "set");
            return;
        }

        if (!this.propertyDict.has(varName))
            this.propertyDict.set(varName, property.getDefaultValue());

        const defaultProperty = property.loadSelf().readProperty(pkg, tag, this.propertyDict);

        this.defaultProperties.set(varName, defaultProperty);

        // if (pkg.tell() < offEnd)
        //     console.warn(`Unread '${tag.name}' ${offEnd - pkg.tell()} bytes (${((offEnd - pkg.tell()) / 1024).toFixed(2)} kB) for package '${pkg.path}'`);

        pkg.seek(offEnd, "set");
    }

    protected setProperty(tag: PropertyTag, value: any) {
        debugger;


        let field: UStruct = this;

        if (value === undefined)
            debugger;

        while (field) {
            if (!field.childPropFields.has(tag.name)) {
                field = field.superField as UStruct;
                continue;
            }

            const property = field.childPropFields.get(tag.name);

            if (!(property instanceof UnProperties.UProperty))
                continue;

            if (property.arrayDimensions > 1) {
                if (!this.defaultProperties.has(tag.name))
                    this.defaultProperties.set(tag.name, new Array(property.arrayDimensions));

                const arr = this.defaultProperties.get(tag.name) as any[];

                if (tag.arrayIndex in arr)
                    debugger;

                arr[tag.arrayIndex] = value;
            } else {
                if (this.defaultProperties.has(tag.name))
                    debugger;

                this.defaultProperties.set(tag.name, value);
            }

            return true;
        }

        debugger;
        throw new Error("Broken");
    }

    protected doLoad(pkg: APackage, exp: C.UExport<UObject>): void {
        super.doLoad(pkg, exp);

        this.readHead = pkg.tell();

        const verArchive = pkg.header.getArchiveFileVersion();

        this.textBufferId = pkg.read("compat32");
        this.firstChildPropId = pkg.read("compat32");

        const nameId = pkg.read("compat32");

        this.friendlyName = pkg.nameTable[nameId].name as string;

        console.assert(typeof this.friendlyName === "string" && this.friendlyName !== "None", "Must have a friendly name");

        if (0x77 < verArchive) {
            this.unkObjectId = pkg.read("compat32");    // struct flags?

            // if (this.unkObjectId !== 0)
            //     debugger;
        }

        this.line = pkg.read("int32");
        this.textPos = pkg.read("int32");

        this.scriptSize = pkg.read("uint32");

        if (this.firstChildPropId !== 0) {
            let childPropId = this.firstChildPropId;

            while (Number.isFinite(childPropId) && childPropId !== 0) {

                const field = pkg.fetchObject(childPropId).loadSelf() as UnProperties.UProperty | UField;

                if (field instanceof UnProperties.UProperty) {
                    this.childPropFields.set(field.propertyName, field);
                } else if (field instanceof UField) {

                    switch (field.constructor.getConstructorName()) {
                        case "Function": this.childFunctions.push(field as C.UFunction); break;
                        case "Enum": this.childEnums.push(field as C.UEnum); break;
                        case "Struct": this.childStructs.push(field as C.UStruct); break;
                        case "Const": this.childConsts.push(field as C.UConst); break;
                        case "State": this.childStates.push(field as C.UState); break;
                        default: debugger; break;
                    }
                } else {
                    debugger;
                }

                childPropId = field.nextFieldId;
            }

        }

        this.readScript(pkg);

        this.readHead = pkg.tell();
    }

    protected readScript(pkg: APackage) {
        const native = pkg.loader.getNativePackage();
        const core = pkg.loader.getCorePackage();

        while (this.bytecodeLength < this.scriptSize)
            this.readToken(native, core, pkg, 0);

        // Finalize bytecode plain text
        this.bytecodePlainText = this.bytecodePlainTextParts.join("");
        this.bytecodePlainTextParts = null; // Free memory
    }

    // TODO: make sure constructor infers constructor parameters
    public buildClass<T extends UObject = Class>(pkgNative: C.ANativePackage): new (...args: any) => T {
        if (this.kls)
            return this.kls as any as new () => T;

        // if (this.friendlyName === "Mover") debugger;
        // if (this.friendlyName === "L2Event") debugger;

        this.loadSelf();
        const dependencyTree = this.collectDependencies<UStruct>();

        if (!this.isReady)
            debugger;

        const clsNamedProperties: Record<string, UnProperties.UProperty> = {};
        const defaultNamedProperties: Record<string, any> = {};
        const inheretenceChain = new Array<string>();
        const clsInheritedProps: Record<string, string[]> = {};

        let lastNative: UStruct = null;

        for (const base of dependencyTree.reverse()) {

            inheretenceChain.push(base.friendlyName);
            const propNames = clsInheritedProps[base.friendlyName] = new Array<string>();

            if (!base.exp || base.exp.anyFlags(ObjectFlags_T.RF_Native))
                lastNative = base;

            if (base.constructor !== this.constructor && (base.constructor as any as UStruct)?.friendlyName !== this.constructor.getConstructorName())
                debugger;

            const { childPropFields, defaultProperties } = base;

            for (const field of childPropFields.values()) {
                if (!(field instanceof UnProperties.UProperty)) continue;

                clsNamedProperties[field.propertyName] = UObject.LAZY_CLONE_ON_USE ? field : field.nativeClone();
                propNames.push(field.propertyName);
            }

            for (const propertyName of defaultProperties.keys())
                defaultNamedProperties[propertyName] = base.propertyDict.get(propertyName);
        }

        const friendlyName = this.friendlyName;
        const hostClass = this;
        const Constructor = lastNative
            ? pkgNative.getConstructor(lastNative.friendlyName as C.NativeTypes_T) as any as typeof UObject
            : pkgNative.getStructConstructor(this.friendlyName) as any as typeof UObject;

        const pkgEngine = pkgNative.loader.getEnginePackage();

        const clsExtendedProperties = Object.assign({}, clsNamedProperties);
        const clsUnserializedProperties = Constructor.collectUnserializedProperties();
        const dynamicTag = this.getDynamicTag(friendlyName);

        for (const [propertyName, propertyType, ...propsExtra] of clsUnserializedProperties) {
            if (propertyName in clsExtendedProperties)
                throw new Error(`Trying to override already serialized property: ${propertyName}<${propertyType}>`)

            let propertyExt: Record<string, any>;
            let propertySubType: ["Struct" | "Class", string] = null;

            if (propertyType === "ArrayProperty") {
                [propertySubType, propertyExt] = propsExtra as [["Struct" | "Class", string], PropertyExtraPars_T?];
            }

            const property = addUnserializedProperty(pkgEngine, propertyName, propertyType, propertySubType, propertyExt);

            clsExtendedProperties[propertyName] = property;
        }

        const clsExtendedPropertyEntries = Object.entries(clsExtendedProperties);

        // ue name comparisons are case-insensitive, old packages may serialize property names with different casing
        const clsPropertyNamesByLower: Record<string, string> = {};

        for (const key of Object.keys(clsExtendedProperties))
            clsPropertyNamesByLower[key.toLowerCase()] = key;

        // @ts-ignore
        const _clsBase = {
            [friendlyName]: class DynamicStruct extends Constructor {
                public static readonly isDynamicClass = true;
                public static readonly friendlyName = friendlyName;
                public static readonly hostClass = hostClass;
                public static readonly nativeClass = lastNative;
                public static readonly inheretenceChain = Object.freeze(inheretenceChain);
                public static readonly inheritedProps = Object.freeze(clsInheritedProps);

                public static _propertyMapCache: Record<string, string> = null;
                public static _classLayout: Map<string, any> = null;

                protected static getConstructorName(): string { return friendlyName; }
                protected findPropReader<T1 = any, T2 = any>(propName: string): C.UProperty<T1, T2> {
                    if (propName in clsExtendedProperties)
                        return clsExtendedProperties[propName];

                    const canonical = clsPropertyNamesByLower[propName.toLowerCase()];

                    if (canonical !== undefined)
                        return clsExtendedProperties[canonical];

                    return null; // unknown property - callers skip it via the tag size
                }

                protected makeLayout() {
                    const ctor = this.constructor as any;

                    if (!ctor._classLayout)
                        buildClassLayout(ctor, this);
                }

                public toString() { return Constructor === UObject ? dynamicTag : Constructor.prototype.toString.call(this); }

                // public constructor(...args: any) {
                //     super(...args);

                //     this.initialize();
                // }
            }
        }[this.friendlyName];

        // runs once per dynamic class, bakes the defaults template and moves friendly-name defaults onto the prototype
        const buildClassLayout = (ctor: any, instance: UObject) => {
            let propNames = ctor._propertyMapCache as Record<string, string>;

            if (!propNames)
                propNames = ctor._propertyMapCache = (instance as any).getPropertyMap();

            const layout = new Map<string, any>();

            for (const [propName, property] of clsExtendedPropertyEntries) {
                let defaultValue = getDefaultValue(propName, property, defaultNamedProperties);

                if (defaultValue === null && property.type === UNP_PropertyTypes.UNP_StructProperty)
                    defaultValue = new PendingStructDefault(property as C.UStructProperty, pkgNative); // stateless - safe to share across instances
                else if (defaultValue !== null && typeof defaultValue === "object" && !(defaultValue instanceof LazyPropertyValue))
                    defaultValue = new PerInstanceDefault(propName, property, defaultNamedProperties); // mutable - must not be shared across instances

                layout.set(propName, defaultValue);
            }

            const proto = ctor.prototype;

            for (const [propName, varName] of Object.entries(propNames)) {
                if (!layout.has(propName)) continue;

                const defaultValue = layout.get(propName);

                if (defaultValue instanceof LazyPropertyValue) {
                    Object.defineProperty(proto, varName, {
                        configurable: true,
                        get() {
                            const resolved = this.propertyDict.get(propName);

                            Object.defineProperty(this, varName, { value: resolved, writable: true, enumerable: true, configurable: true });

                            return resolved;
                        },
                        set(v: any) {
                            Object.defineProperty(this, varName, { value: v, writable: true, enumerable: true, configurable: true });
                        }
                    });
                } else Object.defineProperty(proto, varName, { value: defaultValue, writable: true, enumerable: true, configurable: true });
            }

            proto.isConstructed = true;

            ctor._classLayout = layout;
        };

        const clsNamedPropertiesKeys = Object.keys(clsNamedProperties);
        const cls = eval([
            `(function() {`,
            `    const ${Constructor.name} = _clsBase;`,
            ...
            (
                clsNamedPropertiesKeys.length > 0
                    ? [
                        `    return class ${friendlyName} extends ${Constructor.name} {`,
                        ...Object.entries(clsInheritedProps).reverse().map(([k, p]) => { return `        /* <${k}>:    ${p.join(", ")} */` }),
                        `}`,
                    ]
                    : [`    return class ${friendlyName} extends ${Constructor.name} {}`]
            ),
            `})();`,
        ].join("\n"));

        (Constructor as any).onClassCreated?.(cls);

        this.kls = cls as any;

        // console.log(`%cRegistered new class: %c${friendlyName}`, "color: blue", "color: green")

        return this.kls as any as new () => T;
    }

    public getDynamicTag(friendlyName: string) { return `[S*]${friendlyName}`; }

    public getScriptSize() { return this.scriptSize; }
    public getScriptBytecode(): readonly ScriptBytecodeEntry_T[] { return this.bytecode; }
    public getScriptName(index: number) { return this.pkg.nameTable[index].name as string; }
    public getScriptObjectPath(index: number) { return index === 0 ? null : this.pkg.getObjectPath(index); }

    protected bytecodePlainTextParts: string[] = [];
    protected bytecodePlainText = "";
    protected bytecode: ScriptBytecodeEntry_T[] = [];
    protected bytecodeLength = 0;

    protected readOptionalDebugInfo(native: C.ANativePackage, core: APackage, pkg: APackage, depth: number): void {
        if (this.bytecodeLength >= this.scriptSize) return;

        const pos = pkg.tell();
        const token = pkg.read("uint8") as ExprToken_T;
        const version = token === ExprToken_T.DebugInfo ? pkg.read("int32") as number : -1;

        pkg.seek(pos, "set");

        if (version === 100) this.readToken(native, core, pkg, depth);
    }

    protected readToken(native: C.ANativePackage, core: APackage, pkg: APackage, depth: number): ExprToken_T {
        if (depth === 64) throw new Error("Too deep");

        depth++;

        const tokenValue = pkg.read("uint8") as ExprToken_T;
        let tokenValue2 = tokenValue;

        const tokenHex = `0x${tokenValue.toString(16)}`;

        const isNativeFunc = tokenValue >= ExprToken_T.ExtendedNative;
        const tokenName = tokenValue >= ExprToken_T.FirstNative && UNativeRegistry.hasNativeFunc(tokenValue)
            ? UNativeRegistry.getNativeFuncName(tokenValue)
            : ExprToken_T[tokenValue] || (isNativeFunc ? `Native${tokenValue}` : null);

        if (!tokenName) throw new Error(`Unknown token name: ${tokenValue}`);

        const tokenOffset = this.bytecodeLength;
        const tokenIndex = this.bytecode.length;

        this.bytecodeLength = this.bytecodeLength + 1;
        this.bytecode.push({ offset: tokenOffset, type: isNativeFunc ? "nativeCall" : "token", value: tokenValue, tokenName });

        let tokenDebug = new Array(depth - 1).fill("\t").join("");

        tokenDebug += tokenName + "\r\n";
        this.bytecodePlainTextParts.push(tokenDebug);

        if (tokenValue < ExprToken_T.ExtendedNative) {
            switch (tokenValue) {
                case ExprToken_T.LocalVariable:
                case ExprToken_T.InstanceVariable:
                case ExprToken_T.DefaultVariable:
                case ExprToken_T.NativeParm: {
                    const objectIndex = pkg.read("compat32") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "propertyRef", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;
                } return tokenValue2;
                case ExprToken_T.ObjectConst: {
                    const objectIndex = pkg.read("compat32") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "objectRef", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;
                } return tokenValue2;
                case ExprToken_T.Return:
                case ExprToken_T.GotoLabel:
                case ExprToken_T.EatString:
                case ExprToken_T.DynArrayLength:
                    this.readToken(native, core, pkg, depth);
                    return tokenValue2;
                case ExprToken_T.Switch:
                case ExprToken_T.PrimitiveCast:
                    this.bytecode.push({ offset: this.bytecodeLength, type: "byte", value: pkg.read("uint8") as number });
                    this.bytecodeLength = this.bytecodeLength + 1;
                    this.readToken(native, core, pkg, depth);
                    return tokenValue2;
                case ExprToken_T.Jump:
                    this.bytecode.push({ offset: this.bytecodeLength, type: "codeOffset", value: pkg.read("uint16") as number });
                    this.bytecodeLength = this.bytecodeLength + 2;
                    break;
                case ExprToken_T.JumpIfNot:
                    this.bytecode.push({ offset: this.bytecodeLength, type: "codeOffset", value: pkg.read("uint16") as number });
                    this.bytecodeLength = this.bytecodeLength + 2;
                    this.readToken(native, core, pkg, depth);
                    return tokenValue2;
                case ExprToken_T.Assert:
                    this.bytecode.push({ offset: this.bytecodeLength, type: "line", value: pkg.read("uint16") as number });
                    this.bytecodeLength = this.bytecodeLength + 2;
                    this.readToken(native, core, pkg, depth);
                    return tokenValue2;
                case ExprToken_T.Skip:
                    this.bytecode.push({ offset: this.bytecodeLength, type: "skipOffset", value: pkg.read("uint16") as number });
                    this.bytecodeLength = this.bytecodeLength + 2;
                    this.readToken(native, core, pkg, depth);
                    return tokenValue2;
                case ExprToken_T.Stop:
                case ExprToken_T.Nothing:
                case ExprToken_T.EndFunctionParms:
                case ExprToken_T.Self:
                case ExprToken_T.IntZero:
                case ExprToken_T.IntOne:
                case ExprToken_T.True:
                case ExprToken_T.False:
                case ExprToken_T.NoObject:
                case ExprToken_T.IteratorPop:
                case ExprToken_T.IteratorNext:
                    return tokenValue2;
                case ExprToken_T.BoolVariable:
                    this.readToken(native, core, pkg, depth);
                    return tokenValue2;
                case ExprToken_T.Case: {
                    const value = pkg.read("uint16") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "codeOffset", value });
                    this.bytecodeLength = this.bytecodeLength + 2;

                    if (value !== 0xffff)
                        this.readToken(native, core, pkg, depth);

                } return tokenValue2;
                case ExprToken_T.LabelTable:
                    if ((this.bytecodeLength & 3) !== 0) {
                        debugger;
                        throw new Error("Invalid bytecode length");
                    }

                    while (true) {
                        const label = new FLabelField().load(pkg);

                        this.bytecode.push({ offset: this.bytecodeLength, type: "label", value: label });
                        this.bytecodeLength += 8;

                        if (label.isNone()) break;

                    }

                    return tokenValue2;
                case ExprToken_T.Let:
                case ExprToken_T.DynArrayElement:
                case ExprToken_T.LetBool:
                case ExprToken_T.ArrayElement:
                case ExprToken_T.LetDelegate:
                    this.readToken(native, core, pkg, depth);
                    this.readToken(native, core, pkg, depth);
                    break;
                case ExprToken_T.New:
                    this.readToken(native, core, pkg, depth);
                    this.readToken(native, core, pkg, depth);
                    this.readToken(native, core, pkg, depth);
                    this.readToken(native, core, pkg, depth);
                    break;
                case ExprToken_T.ClassContext:
                case ExprToken_T.Context:
                    this.readToken(native, core, pkg, depth);

                    this.bytecode.push({ offset: this.bytecodeLength, type: "contextSkipOffset", value: pkg.read("uint16") as number });
                    this.bytecodeLength = this.bytecodeLength + 2;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "uint8", value: pkg.read("uint8") as number });
                    this.bytecodeLength = this.bytecodeLength + 1;

                    this.readToken(native, core, pkg, depth);
                    return tokenValue2;
                case ExprToken_T.MetaCast:
                case ExprToken_T.DynamicCast: {
                    const objectIndex = pkg.read("compat32") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "classRef", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;

                    this.readToken(native, core, pkg, depth);

                } return tokenValue2;
                case ExprToken_T.StructMember: {
                    const objectIndex = pkg.read("compat32") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "propertyRef", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;

                    this.readToken(native, core, pkg, depth);

                } return tokenValue2;
                case ExprToken_T.VirtualFunction:
                case ExprToken_T.GlobalFunction: {
                    const nameIndex = pkg.read("compat32") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "nameRef", value: nameIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;

                    while (this.readToken(native, core, pkg, depth) !== ExprToken_T.EndFunctionParms);

                    this.readOptionalDebugInfo(native, core, pkg, depth);
                } return tokenValue2;
                case ExprToken_T.FinalFunction: {
                    const objectIndex = pkg.read("compat32") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "functionRef", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;

                    while (this.readToken(native, core, pkg, depth) !== ExprToken_T.EndFunctionParms);

                    this.readOptionalDebugInfo(native, core, pkg, depth);

                } return tokenValue2;
                case ExprToken_T.IntConst:
                    this.bytecode.push({ offset: this.bytecodeLength, type: "uint32", value: pkg.read("uint32") as number });
                    this.bytecodeLength = this.bytecodeLength + 4;
                    return tokenValue2;
                case ExprToken_T.FloatConst:
                    this.bytecode.push({ offset: this.bytecodeLength, type: "float", value: pkg.read("float") as number });
                    this.bytecodeLength = this.bytecodeLength + 4;
                    break;
                case ExprToken_T.StringConst: {
                    let constant = "";

                    do {
                        const charCode = pkg.read("uint8") as number;

                        if (charCode === 0) break;

                        constant = constant + String.fromCharCode(charCode);

                    } while (true);

                    this.bytecode.push({ offset: this.bytecodeLength, type: "string", value: constant });
                    this.bytecodeLength = this.bytecodeLength + constant.length + 1;

                } return tokenValue2;
                case ExprToken_T.NameConst: {
                    const nameIndex = pkg.read("compat32") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "nameRef", value: nameIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;
                } return tokenValue2;
                case ExprToken_T.RotationConst: {
                    const struct = core.fetchObjectByType<UStruct>("Struct", "Rotator");
                    const FRotator = struct.buildClass(native);

                    this.bytecode.push({ offset: this.bytecodeLength, type: "rotator", value: new FRotator().load(pkg) });
                    this.bytecodeLength = this.bytecodeLength + 4 * 3;
                } return tokenValue2;
                case ExprToken_T.VectorConst: {
                    const struct = core.fetchObjectByType<UStruct>("Struct", "Vector");
                    const FVector = struct.buildClass(native);

                    this.bytecode.push({ offset: this.bytecodeLength, type: "vector", value: new FVector().load(pkg) });

                    this.bytecodeLength = this.bytecodeLength + 4 * 3;
                } break;
                case ExprToken_T.ByteConst:
                case ExprToken_T.IntConstByte:
                    this.bytecode.push({ offset: this.bytecodeLength, type: "byte", value: pkg.read("uint8") as number });
                    this.bytecodeLength = this.bytecodeLength + 1;
                    break;
                case ExprToken_T.Iterator:
                    this.readToken(native, core, pkg, depth);
                    this.bytecode.push({ offset: this.bytecodeLength, type: "codeOffset", value: pkg.read("uint16") as number });
                    this.bytecodeLength = this.bytecodeLength + 2;
                    break;
                case ExprToken_T.StructCmpEq:
                case ExprToken_T.StructCmpNe: {
                    // 1981

                    debugger;

                    const objectIndex = pkg.read("compat32") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "structRef", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;

                    this.readToken(native, core, pkg, depth);
                    this.readToken(native, core, pkg, depth);
                } break;
                case ExprToken_T.UnicodeStringConst: {
                    let constant = "";

                    while (true) {
                        const charCode = pkg.read("uint16") as number;

                        this.bytecodeLength = this.bytecodeLength + 2;

                        if (charCode === 0) break;

                        constant = constant + String.fromCharCode(charCode);
                    }

                    this.bytecode.push({ offset: tokenOffset + 1, type: "string", value: constant });
                } return tokenValue2;
                case ExprToken_T.DynArrayInsert:
                case ExprToken_T.DynArrayRemove:
                    this.readToken(native, core, pkg, depth);
                    this.readToken(native, core, pkg, depth);
                    this.readToken(native, core, pkg, depth);
                    break;
                case ExprToken_T.DebugInfo: {
                    this.bytecode.push({ offset: this.bytecodeLength, type: "int32", value: pkg.read("int32") as number });
                    this.bytecodeLength = this.bytecodeLength + 4;
                    this.bytecode.push({ offset: this.bytecodeLength, type: "int32", value: pkg.read("int32") as number });
                    this.bytecodeLength = this.bytecodeLength + 4;
                    this.bytecode.push({ offset: this.bytecodeLength, type: "int32", value: pkg.read("int32") as number });
                    this.bytecodeLength = this.bytecodeLength + 4;

                    let identifier = "";

                    while (true) {
                        const charCode = pkg.read("uint8") as number;

                        this.bytecodeLength = this.bytecodeLength + 1;

                        if (charCode === 0) break;

                        identifier = identifier + String.fromCharCode(charCode);
                    }

                    this.bytecode.push({ offset: this.bytecodeLength - identifier.length - 1, type: "string", value: identifier });
                } return tokenValue2;
                case ExprToken_T.DelegateFunction: {
                    const propertyIndex = pkg.read("compat32") as number;
                    const nameIndex = pkg.read("compat32") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "propertyRef", value: propertyIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;
                    this.bytecode.push({ offset: this.bytecodeLength, type: "nameRef", value: nameIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;
                } return tokenValue2;
                case ExprToken_T.DelegateProperty: {
                    const nameIndex = pkg.read("compat32") as number;

                    this.bytecode.push({ offset: this.bytecodeLength, type: "nameRef", value: nameIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;
                } return tokenValue2;
                default: debugger; throw new Error(`Bad token '${tokenHex}'`);
            }
        } else {
            if (tokenValue < ExprToken_T.FirstNative) {
                const nativeIndex = (tokenValue - ExprToken_T.ExtendedNative) * 0x100 + pkg.read("uint8") as number;
                const callEntry = this.bytecode[tokenIndex];

                callEntry.value = nativeIndex;
                callEntry.tokenName = UNativeRegistry.hasNativeFunc(nativeIndex) ? UNativeRegistry.getNativeFuncName(nativeIndex) : `Native${nativeIndex}`;

                this.bytecode.push({ offset: this.bytecodeLength, type: "nativeIndex", value: nativeIndex });
                this.bytecodeLength = this.bytecodeLength + 1;
            }

            while (this.readToken(native, core, pkg, depth) !== ExprToken_T.EndFunctionParms);

            this.readOptionalDebugInfo(native, core, pkg, depth);
        }

        depth++;

        return tokenValue2;
    }
}

export default UStruct;
export { UStruct, ScriptBytecodeEntry_T };

// struct-typed property default with no explicit class default, deferred because readValue() usually overwrites it anyway
class PendingStructDefault<T extends UObject = UObject> extends LazyPropertyValue<T> {
    protected readonly property: C.UStructProperty;
    protected readonly pkgNative: C.ANativePackage;

    public constructor(property: C.UStructProperty, pkgNative: C.ANativePackage) {
        super();

        this.property = property;
        this.pkgNative = pkgNative;
    }

    public resolve(): T {
        return this.property.initializeDefault(this.pkgNative) as T;
    }
}

// mutable class default (fixed-size array, struct/object clone), shared copies would leak writes between instances
class PerInstanceDefault<T = any> extends LazyPropertyValue<T> {
    protected readonly propName: string;
    protected readonly property: UnProperties.UProperty;
    protected readonly defaultNamedProperties: Record<string, any>;

    public constructor(propName: string, property: UnProperties.UProperty, defaultNamedProperties: Record<string, any>) {
        super();

        this.propName = propName;
        this.property = property;
        this.defaultNamedProperties = defaultNamedProperties;
    }

    public resolve(): T {
        return getDefaultValue(this.propName, this.property, this.defaultNamedProperties) as T;
    }
}

function getUnsetDefaultValue(pkgNative: C.ANativePackage, property: UnProperties.UProperty) {
    switch (property.type) {
        case UNP_PropertyTypes.UNP_ByteProperty:
        case UNP_PropertyTypes.UNP_FloatProperty:
        case UNP_PropertyTypes.UNP_BoolProperty:
        case UNP_PropertyTypes.UNP_IntProperty:
        case UNP_PropertyTypes.UNP_StrProperty:
        case UNP_PropertyTypes.UNP_ObjectProperty:
        case UNP_PropertyTypes.UNP_NameProperty:
        case UNP_PropertyTypes.UNP_ClassProperty:
        case UNP_PropertyTypes.UNP_NameProperty:
        case UNP_PropertyTypes.UNP_ArrayProperty:
            return property.getDefaultValue();
        // case UNP_PropertyTypes.UNP_ClassProperty:
        // case UNP_PropertyTypes.UNP_StructProperty:
        // case UNP_PropertyTypes.UNP_ObjectProperty:
        //     if (property.arrayDimensions > 1)
        //         return defaultValue.map((x: UObject) => x?.nativeClone() ?? null);

        //     return defaultValue.nativeClone();
        default:
            debugger;
            throw new Error(`Property type '${property.getTypeName()}' not yet implemented.`)
    }
}

function getDefaultValue(propName: string, property: UnProperties.UProperty, defaultNamedProperties: Record<string, any>) {
    if (!(propName in defaultNamedProperties))
        return property.getDefaultValue(); //getUnsetDefaultValue(pkgNative, property);

    const defaultValue = defaultNamedProperties[propName];

    switch (property.type) {
        case UNP_PropertyTypes.UNP_ByteProperty:
        case UNP_PropertyTypes.UNP_FloatProperty:
        case UNP_PropertyTypes.UNP_BoolProperty:
        case UNP_PropertyTypes.UNP_IntProperty:
        case UNP_PropertyTypes.UNP_StrProperty:
        case UNP_PropertyTypes.UNP_NameProperty:
            if (property.arrayDimensions > 1)
                return defaultValue.slice();

            return defaultValue;
        case UNP_PropertyTypes.UNP_ClassProperty:
        case UNP_PropertyTypes.UNP_StructProperty:
        case UNP_PropertyTypes.UNP_ObjectProperty:
            if (property.arrayDimensions > 1)
                return defaultValue.map((x: UObject) => x?.nativeClone() ?? null);

            return defaultValue?.nativeClone() ?? null; // defaultproperties can set None
        case UNP_PropertyTypes.UNP_ArrayProperty:
            return defaultValue?.nativeClone() ?? defaultValue?.slice() ?? null;
        default:
            debugger;
            throw new Error(`Property type '${property.getTypeName()}' not yet implemented.`)
    }
}


function addUnserializedProperty(pkg: C.AEnginePackage, propertyName: string, properytType: C.PropertyTypes_T, propertySubType: ["Struct" | "Class", string], extraProps?: PropertyExtraPars_T): UnProperties.UProperty<any, any> {
    const parameters = Object.assign({}, extraProps, { propertyName, pkg });

    let Property: any;

    const subValueId = propertySubType ? pkg.findObjectRef(...propertySubType) : null;

    if (propertySubType) parameters["valueId"] = subValueId;

    switch (properytType) {
        case "ObjectProperty": Property = UnProperties.UObjectProperty; break;
        case "BoolProperty": Property = UnProperties.UBoolProperty; break;
        case "ArrayProperty": Property = UnProperties.UArrayProperty; break;
        case "FloatProperty": Property = UnProperties.UFloatProperty; break;
        case "IntProperty": Property = UnProperties.UIntProperty; break;
        case "ByteProperty": Property = UnProperties.UByteProperty; break;
        default: throw new Error(`Not implemented property type '${properytType}' for '${propertyName}'`);
    }

    return new Property(parameters);
}

enum ExprToken_T {
    // Variable references
    LocalVariable = 0x00,    // A local variable
    InstanceVariable = 0x01,    // An object variable
    DefaultVariable = 0x02,    // Default variable for a concrete object

    // Tokens
    Return = 0x04,    // Return from function
    Switch = 0x05,    // Switch
    Jump = 0x06,    // Goto a local address in code
    JumpIfNot = 0x07,    // Goto if not expression
    Stop = 0x08,    // Stop executing state code
    Assert = 0x09,    // Assertion
    Case = 0x0A,    // Case
    Nothing = 0x0B,    // No operation
    LabelTable = 0x0C,    // Table of labels
    GotoLabel = 0x0D,    // Goto a label
    EatString = 0x0E, // Ignore a dynamic string
    Let = 0x0F,    // Assign an arbitrary size value to a variable
    DynArrayElement = 0x10, // Dynamic array element
    New = 0x11, // New object allocation
    ClassContext = 0x12, // Class default metaobject context
    MetaCast = 0x13, // Metaclass cast
    LetBool = 0x14, // Let boolean variable
    Unknown0x15 = 0x15,
    EndFunctionParms = 0x16,    // End of function call parameters
    Self = 0x17,    // Self object
    Skip = 0x18,    // Skippable expression
    Context = 0x19,    // Call a function through an object context
    ArrayElement = 0x1A,    // Array element
    VirtualFunction = 0x1B,    // A function call with parameters
    FinalFunction = 0x1C,    // A prebound function call with parameters
    IntConst = 0x1D,    // Int constant
    FloatConst = 0x1E,    // Floating point constant
    StringConst = 0x1F,    // String constant
    ObjectConst = 0x20,    // An object constant
    NameConst = 0x21,    // A name constant
    RotationConst = 0x22,    // A rotation constant
    VectorConst = 0x23,    // A vector constant
    ByteConst = 0x24,    // A byte constant
    IntZero = 0x25,    // Zero
    IntOne = 0x26,    // One
    True = 0x27,    // Bool True
    False = 0x28,    // Bool False
    NativeParm = 0x29, // Native function parameter offset
    NoObject = 0x2A,    // NoObject
    Unknown0x2b = 0x2B,
    IntConstByte = 0x2C,    // Int constant that requires 1 byte
    BoolVariable = 0x2D,    // A bool variable which requires a bitmask
    DynamicCast = 0x2E,    // Safe dynamic class casting
    Iterator = 0x2F, // Begin an iterator operation
    IteratorPop = 0x30, // Pop an iterator level
    IteratorNext = 0x31, // Go to next iteration
    StructCmpEq = 0x32,    // Struct binary compare-for-equal
    StructCmpNe = 0x33,    // Struct binary compare-for-unequal
    UnicodeStringConst = 0x34, // Unicode string constant
    //
    StructMember = 0x36, // Struct member
    DynArrayLength = 0x37,
    GlobalFunction = 0x38, // Call non-state version of a function
    PrimitiveCast = 0x39,
    DynArrayInsert = 0x40,
    DynArrayRemove = 0x41,
    DebugInfo = 0x42,
    DelegateFunction = 0x43,
    DelegateProperty = 0x44,
    LetDelegate = 0x45,
    ExtendedNative = 0x60,
    FirstNative = 0x70,
};

class FLabelField implements IConstructable {
    public name: string = "None";
    public offset: number;

    public load(pkg: APackage): this {
        const nameIndex = pkg.read("compat32") as number;

        this.name = pkg.nameTable[nameIndex].name;
        this.offset = pkg.read("uint32") as number;

        return this;
    }

    public isNone() { return this.name === "None"; }
}

// class FixedArrayContainer<T> implements ReadonlyArray<T> {
//     protected readonly property: UnProperties.UProperty<any, any>;
//     public length: number;
//     readonly [n: number]: T;

//     constructor(property: UnProperties.UProperty) {
//         if (property.arrayDimensions <= 1)
//             throw new Error(`Invalid array length '${property.arrayDimensions} <= 1'`);

//         this.property = property;
//         this.length = property.arrayDimensions;

//         for (let i = 0, len = property.arrayDimensions; i < len; i++) {
//             Object.defineProperty(this, i, {
//                 get: this.getValue.bind(this, i),
//                 set: this.setValue.bind(this, i)
//             });
//         }
//     }

//     protected toArray(): T[] {
//         const arr = new Array(this.length);

//         for (let i = 0, len = this.length; i < len; i++)
//             arr[i] = this[i];

//         return arr;
//     }

//     public getValue(index: number): T { return this.property.getPropertyValue(index); }

//     public setValue(index: number, value: T): void {
//         debugger;

//         throw new Error("Not implemented error");
//     }

//     public toString() { return `FixedArray[${this.property}]`; }


//     public filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): S[];
//     public filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): T[];
//     public filter<S>(predicate: unknown, thisArg?: unknown): T[] | S[] {
//         return this.toArray().filter(predicate as any, thisArg);
//     }


//     public toLocaleString(): string {
//         throw new Error("Method not implemented.");
//     }
//     public concat(...items: ConcatArray<T>[]): T[];
//     public concat(...items: (T | ConcatArray<T>)[]): T[];
//     public concat(..._items: unknown[]): T[] {
//         throw new Error("Method not implemented.");
//     }
//     public join(separator?: string): string {
//         throw new Error("Method not implemented.");
//     }
//     slice(start?: number, end?: number): T[] {
//         throw new Error("Method not implemented.");
//     }
//     indexOf(searchElement: T, fromIndex?: number): number {
//         throw new Error("Method not implemented.");
//     }
//     lastIndexOf(searchElement: T, fromIndex?: number): number {
//         throw new Error("Method not implemented.");
//     }
//     every<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): this is readonly S[];
//     every(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
//     every(predicate: unknown, thisArg?: unknown): boolean {
//         throw new Error("Method not implemented.");
//     }
//     some(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean {
//         throw new Error("Method not implemented.");
//     }
//     forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void, thisArg?: any): void {
//         throw new Error("Method not implemented.");
//     }
//     map<U>(callbackfn: (value: T, index: number, array: readonly T[]) => U, thisArg?: any): U[] {
//         throw new Error("Method not implemented.");
//     }

//     reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
//     reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T, initialValue: T): T;
//     reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;
//     reduce<U>(callbackfn: unknown, initialValue?: unknown): T | U {
//         throw new Error("Method not implemented.");
//     }
//     reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
//     reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T, initialValue: T): T;
//     reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;
//     reduceRight<U>(callbackfn: unknown, initialValue?: unknown): T | U {
//         throw new Error("Method not implemented.");
//     }
//     find<S extends T>(predicate: (this: void, value: T, index: number, obj: readonly T[]) => value is S, thisArg?: any): S;
//     find(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): T;
//     find<S extends T>(predicate: unknown, thisArg?: unknown): T | S {
//         throw new Error("Method not implemented.");
//     }
//     findIndex(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): number {
//         throw new Error("Method not implemented.");
//     }
//     entries(): IterableIterator<[number, T]> {
//         throw new Error("Method not implemented.");
//     }
//     keys(): IterableIterator<number> {
//         throw new Error("Method not implemented.");
//     }
//     values(): IterableIterator<T> {
//         throw new Error("Method not implemented.");
//     }
//     includes(searchElement: T, fromIndex?: number): boolean {
//         throw new Error("Method not implemented.");
//     }
//     flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | readonly U[], thisArg?: This): U[] {
//         throw new Error("Method not implemented.");
//     }
//     flat<A, D extends number = 1>(this: A, depth?: D): FlatArray<A, D>[] {
//         throw new Error("Method not implemented.");
//     }
//     at(index: number): T {
//         throw new Error("Method not implemented.");
//     }
//     [Symbol.iterator](): IterableIterator<T> {
//         throw new Error("Method not implemented.");
//     }
// }
