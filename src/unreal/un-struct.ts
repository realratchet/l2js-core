import UField from "./un-field";
import BufferValue from "../buffer-value";
import ObjectFlags_T from "./un-object-flags";
import UObject from "./un-object";
import * as UnContainers from "./un-property/un-containers";
import * as UnProperties from "./un-property/un-properties";
import FArray, { FIndexArray, FPrimitiveArray } from "./un-array";
import UNativeRegistry from "./un-native-registry";
import UPackage from "./un-package";
import PropertyTag, { UNP_PropertyTypes } from "./un-property/un-property-tag";

class UStruct extends UField {
    declare ["constructor"]: typeof UStruct;

    protected textBufferId: number;

    protected firstChildPropId: number;
    public readonly childPropFields = new Map<string, UnProperties.UProperty | UFunction>();
    public readonly childFunctions = new Array<UFunction>();
    public readonly childEnums = new Array<UEnum>();
    public readonly childStructs = new Array<UStruct>();
    public readonly childConsts = new Array<UConst>();
    public readonly childStates = new Array<UState>();

    public friendlyName: string;
    protected line: number;
    protected textPos: number;
    protected unkObjectId: number = 0;
    protected unkObject: UObject;
    protected scriptSize: number;
    protected kls: new () => UObject;

    public readonly isStruct = true;

    protected static getConstructorName() { return "Struct"; }
    protected defaultProperties = new Map<string, any>();

    protected readArray(pkg: UPackage, tag: PropertyTag) {
        let field: UStruct = this;

        while (field) {


            if (!field.childPropFields.has(tag.name)) {
                field = field.superField as any as UStruct;
                continue;
            }

            const property = field.childPropFields.get(tag.name);

            debugger;

            const constr = property.createObject();
            const value = constr(pkg, tag);

            this.setProperty(tag, value);

            return true;

        }

        debugger;
        throw new Error("Broken");
    }

    protected isValidProperty(varName: string) { return true; }

    protected readByteProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, pkg.read(new BufferValue(BufferValue.uint8))); }
    protected readIntProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, pkg.read(new BufferValue(BufferValue.int32))); }
    protected readFloatProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, pkg.read(new BufferValue(BufferValue.float))); }
    protected readBoolProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, new UnContainers.BoolContainer(tag.boolValue)); }
    protected readObjectProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, new UnContainers.ObjectContainer("<Not Evaled>").load(pkg)); }
    protected readNameProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, new UnContainers.NameContainer(pkg.nameTable, pkg.read(new BufferValue(BufferValue.compat32)).value)); }
    protected readStrProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, pkg.read(new BufferValue(BufferValue.char))); }
    protected readStringProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    protected readArrayProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); }
    protected readClassProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    protected readVectorProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    protected readRotatorProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    protected readMapProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    protected readFixedProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    protected readStructProperty(pkg: UPackage, tag: PropertyTag): any {

        const core = pkg.loader.getPackage("core", "Script");
        const native = pkg.loader.getPackage("native", "Script");

        const expStruct = core.fetchObjectByType<UStruct>("Struct", tag.structName);
        const StructConstructor = expStruct.buildClass<UStruct>(native);

        const struct = new StructConstructor();

        switch (tag.structName) {
            case "Color":
            case "Scale":
            case "Vector":
            case "Rotator":
                struct.load(pkg);
                break;
            default: throw new Error("Not yet implemented");
        }

        this.setProperty(tag, struct);

    }

    protected loadProperty(pkg: UPackage, tag: PropertyTag): void {
        const offStart = pkg.tell();
        const offEnd = offStart + tag.dataSize;

        const varName = this.getPropertyVarName(tag);
        const { name: propName, arrayIndex } = tag;

        if (!varName)
            throw new Error(`Unrecognized property '${propName}' for '${this.constructor.name}' of type '${tag.getTypeName()}'`);

        if (!this.isValidProperty(varName))
            throw new Error(`Cannot map property '${propName}' -> ${varName}`);

        switch (tag.type) {
            case UNP_PropertyTypes.UNP_ByteProperty: this.readByteProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_IntProperty: this.readIntProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_BoolProperty: this.readBoolProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_FloatProperty: this.readFloatProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_ObjectProperty: this.readObjectProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_NameProperty: this.readNameProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_StrProperty: this.readStrProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_StringProperty: this.readStringProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_ArrayProperty: this.readArrayProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_ClassProperty: this.readClassProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_VectorProperty: this.readVectorProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_RotatorProperty: this.readRotatorProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_MapProperty: this.readMapProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_FixedArrayProperty: this.readFixedProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_StructProperty: this.readStructProperty(pkg, tag); break;
            default:
                pkg.seek(tag.dataSize);
                console.warn(`Unknown data type '${tag.type}' for '${tag.name}' skipping ${tag.dataSize} bytes.`);
                break;
        }

        pkg.seek(offEnd, "set");

        if (pkg.tell() < offEnd)
            console.warn(`Unread '${tag.name}' ${offEnd - pkg.tell()} bytes (${((offEnd - pkg.tell()) / 1024).toFixed(2)} kB) for package '${pkg.path}'`);
    }

    protected setProperty(tag: PropertyTag, value: any) {
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

            console.log(property);

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

    protected doLoad(pkg: UPackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        this.readHead = pkg.tell();

        const verArchive = pkg.header.getArchiveFileVersion();

        const compat32 = new BufferValue(BufferValue.compat32);
        const uint32 = new BufferValue(BufferValue.uint32);
        const int32 = new BufferValue(BufferValue.int32);

        this.textBufferId = pkg.read(compat32).value;
        this.firstChildPropId = pkg.read(compat32).value;

        const nameId = pkg.read(compat32).value;

        this.friendlyName = pkg.nameTable[nameId].name as string;

        console.assert(typeof this.friendlyName === "string" && this.friendlyName !== "None", "Must have a friendly name");

        if (0x77 < verArchive) {
            this.unkObjectId = pkg.read(compat32).value;    // struct flags?

            if (this.unkObjectId !== 0)
                debugger;
        }

        this.line = pkg.read(int32).value;
        this.textPos = pkg.read(int32).value;

        this.scriptSize = pkg.read(uint32).value;

        // if (exp.objectName === "Pawn")
        //     debugger;

        // if (exp.objectName === "Vector")
        //     debugger;


        if (this.firstChildPropId !== 0) {
            let childPropId = this.firstChildPropId;

            while (Number.isFinite(childPropId) && childPropId !== 0) {

                // if (childPropId === 4869)
                //     debugger;

                const field = pkg.fetchObject<UnProperties.UProperty | UField>(childPropId).loadSelf();

                if (field instanceof UnProperties.UProperty)
                    this.childPropFields.set(field.propertyName, field);
                else if (field instanceof UField) {
                    switch (field.constructor.getConstructorName()) {
                        case "Function": this.childFunctions.push(field as UFunction); break;
                        case "Enum": this.childEnums.push(field as UEnum); break;
                        case "Struct": this.childStructs.push(field as UStruct); break;
                        case "Const": this.childConsts.push(field as UConst); break;
                        case "State": this.childStates.push(field as UState); break;
                        default: debugger; break;
                    }

                } else {
                    debugger;
                }

                childPropId = field.nextFieldId;
            }

        }

        // if (exp.objectName === "Pawn")
        //     debugger;

        this.readScript(pkg);

        this.readHead = pkg.tell();
    }

    protected readScript(pkg: UPackage) {
        const native = pkg.loader.getPackage("native", "Script");
        const core = pkg.loader.getPackage("core", "Script");

        // if (this.exp.objectName === "GetCollisionExtent")
        //     debugger;

        while (this.bytecodeLength < this.scriptSize)
            this.readToken(native, core, pkg, 0);
    }

    public buildClass<T extends UObject = UObject>(pkg: UNativePackage): new () => T {
        // if (this.exp.objectName === "Vector")
        //     debugger;

        if (this.kls)
            return this.kls as any as new () => T;

        this.loadSelf();
        const dependencyTree = this.collectDependencies<UStruct>();

        if (!this.isReady)
            debugger;

        const clsNamedProperties: Record<string, any> = {};
        const inheretenceChain = new Array<string>();

        let lastNative: UStruct = null;

        for (const base of dependencyTree.reverse()) {

            inheretenceChain.push(base.friendlyName);

            if (!base.exp || base.exp.anyFlags(ObjectFlags_T.Native))
                lastNative = base;

            if (base.constructor !== this.constructor && (base.constructor as any as UStruct)?.friendlyName !== this.constructor.getConstructorName())
                debugger;

            const { childPropFields, defaultProperties } = base;

            for (const field of childPropFields.values()) {
                if (!(field instanceof UnProperties.UProperty)) continue;

                const propertyName = field.propertyName;

                // debugger;

                // if (this.propertyDict.has(propertyName))
                //     clsNamedProperties[propertyName] = this.propertyDict.get(propertyName);
                // else
                clsNamedProperties[propertyName] = buildProperty(pkg, field);
            }

            // debugger;

            for (const [propertyName, propertyValue] of defaultProperties.entries()) {
                if (!clsNamedProperties[propertyName].copy)
                    throw new Error(`Must be copyable '${clsNamedProperties[propertyName].constructor.name}'`);

                clsNamedProperties[propertyName].copy(propertyValue);
            }
        }

        const friendlyName = this.friendlyName;
        const hostClass = this;
        const Constructor = lastNative
            ? pkg.getConstructor(lastNative.friendlyName as NativeTypes_T) as any as typeof UObject
            : pkg.getStructConstructor(this.friendlyName) as any as typeof UObject;

        // if (lastNative)
        //     debugger;

        // if (friendlyName === "Vector")
        //     debugger;

        // @ts-ignore
        const _clsBase = {
            [friendlyName]: class DynamicStruct extends Constructor {
                public static readonly isDynamicClass = true;
                public static readonly friendlyName = friendlyName;
                public static readonly hostClass = hostClass;
                public static readonly nativeClass = lastNative;
                public static readonly inheretenceChain = Object.freeze(inheretenceChain);

                protected newProps: Record<string, string> = {};

                protected static getConstructorName(): string { return friendlyName; }

                constructor() {
                    super();

                    const oldProps = this.getPropertyMap();
                    const newProps = this.newProps;
                    const missingProps = [];

                    // if (friendlyName === "Vector")
                    //     debugger;

                    for (const [name, value] of Object.entries(clsNamedProperties)) {
                        const varname = name in oldProps ? oldProps[name] : name;

                        if (!(name in oldProps)) {
                            newProps[varname] = varname;
                            missingProps.push(varname);
                        }

                        if (!value)
                            debugger;

                        if (value instanceof BufferValue) {
                            this.propertyDict.set(varname, value);
                        } else if (value.getConstructorName?.()) {
                            this.propertyDict.set(varname, new value());
                        } else if (value instanceof UnContainers.UContainer) {
                            this.propertyDict.set(varname, value);
                        } else if (value instanceof Array) {
                            this.propertyDict.set(varname, value);
                        } else if (value instanceof FPrimitiveArray) {
                            this.propertyDict.set(varname, value);
                        } else if (value instanceof UObject) {
                            this.propertyDict.set(varname, value);
                        } else {
                            debugger;
                        }


                        // if (value !== undefined || !(varname in this))
                        //     (this as any)[varname] = value;
                    }

                    if (missingProps.length > 0 && lastNative)
                        console.warn(`Native type '${friendlyName}' is missing property '${missingProps.join(", ")}'`);
                }

                protected getPropertyMap(): Record<string, string> {
                    return {
                        ...super.getPropertyMap(),
                        ...this.newProps
                    };
                }

                public toString() { return Constructor === UObject ? `[D|S]${friendlyName}` : Constructor.prototype.toString.call(this); }
            }
        }[this.friendlyName];

        const clsNamedPropertiesKeys = Object.keys(clsNamedProperties);

        const cls = eval([
            `(function() {`,
            `    const ${Constructor.name} = _clsBase;`,
            ...
            (
                clsNamedPropertiesKeys.length > 0
                    ? [
                        `    return class ${friendlyName} extends ${Constructor.name} {`,
                        `        /* ${clsNamedPropertiesKeys.join(", ")} */`,
                        `}`,
                    ]
                    : [`    return class ${friendlyName} extends ${Constructor.name} {}`]
            ),
            `})();`,
        ].join("\n"));

        // console.log(cls);

        // debugger;

        this.kls = cls as any;

        return this.kls as any as new () => T;
    }

    protected bytecodePlainText = "";
    protected bytecode: { type: string, value: any, tokenName?: string }[] = [];
    protected bytecodeLength = 0;

    protected readToken(native: UNativePackage, core: UPackage, pkg: UPackage, depth: number): ExprToken_T {
        if (depth === 64) throw new Error("Too deep");

        const uint8 = new BufferValue(BufferValue.uint8);
        const uint16 = new BufferValue(BufferValue.uint16);
        const uint32 = new BufferValue(BufferValue.uint32);
        const compat32 = new BufferValue(BufferValue.compat32);
        const float = new BufferValue(BufferValue.float);
        const char = new BufferValue(BufferValue.char);

        depth++;



        // debugger;

        const tokenValue = pkg.read(uint8).value as ExprToken_T;
        let tokenValue2 = tokenValue;

        const tokenHex = `0x${tokenValue.toString(16)}`;

        // debugger;

        const isNativeFunc = UNativeRegistry.hasNativeFunc(tokenValue);
        const tokenName = isNativeFunc ? UNativeRegistry.getNativeFuncName(tokenValue) : ExprToken_T[tokenValue];

        if (!tokenName) throw new Error(`Unknown token name: ${tokenValue}`);

        this.bytecodeLength = this.bytecodeLength + 1;
        this.bytecode.push({ type: isNativeFunc ? "call" : "token", value: tokenValue, tokenName });

        let tokenDebug = new Array(depth - 1).fill("\t").join("");

        tokenDebug += tokenName + "\r\n";
        this.bytecodePlainText += tokenDebug;



        if (tokenValue < ExprToken_T.MaxConversion) {
            switch (tokenValue) {
                case ExprToken_T.LocalVariable:
                case ExprToken_T.InstanceVariable:
                case ExprToken_T.DefaultVariable:
                case ExprToken_T.ObjectConst:
                case ExprToken_T.NativeParm: {
                    const objectIndex = pkg.read(compat32).value as number;

                    this.bytecode.push({ type: "compat", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;
                } return tokenValue2;
                case ExprToken_T.Return:
                case ExprToken_T.GotoLabel:
                case ExprToken_T.EatString:
                case ExprToken_T.UnkMember:
                    this.readToken(native, core, pkg, depth);
                    return tokenValue2;
                case ExprToken_T.Switch:
                case ExprToken_T.MinConversion:
                    this.bytecode.push({ type: "byte", value: pkg.read(uint8).value as number });
                    this.bytecodeLength = this.bytecodeLength + 1;
                    this.readToken(native, core, pkg, depth);
                    return tokenValue2;
                case ExprToken_T.Jump:
                    this.bytecode.push({ type: "uint16", value: pkg.read(uint16).value as number });
                    this.bytecodeLength = this.bytecodeLength + 2;
                    break;
                case ExprToken_T.JumpIfNot:
                case ExprToken_T.Assert:
                case ExprToken_T.Skip:
                    this.bytecode.push({ type: "uint16", value: pkg.read(uint16).value as number });
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
                case ExprToken_T.BoolVariable:
                case ExprToken_T.IteratorPop:
                case ExprToken_T.IteratorNext:
                    return tokenValue2;
                case ExprToken_T.Case: {
                    const value = pkg.read(uint16).value as number;

                    this.bytecode.push({ type: "uint16", value });
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

                        this.bytecode.push({ type: "label", value: label });
                        this.bytecodeLength += 8;

                        if (label.isNone()) break;

                    }

                    return tokenValue2;
                case ExprToken_T.Let:
                case ExprToken_T.DynArrayElement:
                case ExprToken_T.LetBool:
                case ExprToken_T.ArrayElement:
                case ExprToken_T.FloatToBool:
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

                    this.bytecode.push({ type: "uint16", value: pkg.read(uint16).value as number });
                    this.bytecodeLength = this.bytecodeLength + 2;

                    this.bytecode.push({ type: "uint8", value: pkg.read(uint8).value as number });
                    this.bytecodeLength = this.bytecodeLength + 1;

                    this.readToken(native, core, pkg, depth);
                    return tokenValue2;
                case ExprToken_T.MetaCast:
                case ExprToken_T.DynamicCast:
                case ExprToken_T.StructMember: {
                    const objectIndex = pkg.read(compat32).value as number;

                    this.bytecode.push({ type: "compat", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;

                    this.readToken(native, core, pkg, depth);

                } return tokenValue2;
                case ExprToken_T.VirtualFunction:
                case ExprToken_T.GlobalFunction: {
                    const objectIndex = pkg.read(compat32).value as number;

                    this.bytecode.push({ type: "compat", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;

                    while (this.readToken(native, core, pkg, depth) !== ExprToken_T.EndFunctionParms);

                    if (this.bytecodeLength < this.scriptSize) {
                        const pos = pkg.tell();
                        const token2 = pkg.read(uint8).value as ExprToken_T;

                        // this.bytecodeLength = this.bytecodeLength + 1;

                        if (token2 === ExprToken_T.BoolToFloat) {
                            debugger;
                        }

                        pkg.seek(pos, "set");
                    }
                } return tokenValue2;
                case ExprToken_T.FinalFunction: {
                    const objectIndex = pkg.read(compat32).value as number;

                    this.bytecode.push({ type: "compat", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;

                    while (this.readToken(native, core, pkg, depth) !== ExprToken_T.EndFunctionParms);

                    if (this.bytecodeLength < this.scriptSize) {
                        const pos = pkg.tell();
                        const token2 = pkg.read(uint8).value as ExprToken_T;

                        if (token2 === ExprToken_T.BoolToFloat) {
                            debugger;
                        }

                        pkg.seek(pos, "set");
                    }

                } return tokenValue2;
                case ExprToken_T.IntConst:
                    this.bytecode.push({ type: "uint32", value: pkg.read(uint32).value as number });
                    this.bytecodeLength = this.bytecodeLength + 4;
                    return tokenValue2;
                case ExprToken_T.FloatConst:
                    this.bytecode.push({ type: "float", value: pkg.read(float).value as number });
                    this.bytecodeLength = this.bytecodeLength + 4;
                    break;
                case ExprToken_T.StringConst: {
                    let constant = "";

                    do {
                        const charCode = pkg.read(uint8).value as number;

                        if (charCode === 0) break;

                        constant = constant + String.fromCharCode(charCode);

                    } while (true);

                    this.bytecodeLength = this.bytecodeLength + constant.length + 1;
                    this.bytecode.push({ type: "string", value: constant });

                } return tokenValue2;
                case ExprToken_T.NameConst:
                case ExprToken_T.FloatToInt: {
                    const objectIndex = pkg.read(compat32).value as number;

                    // debugger;

                    this.bytecode.push({ type: "compat", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;
                } return tokenValue2;
                case ExprToken_T.RotationConst: {
                    const struct = core.fetchObjectByType<UStruct>("Struct", "Rotator");
                    const FRotator = struct.buildClass(native);

                    this.bytecode.push({ type: "rotator", value: new FRotator().load(pkg) });
                    this.bytecodeLength = this.bytecodeLength + 4 * 3;
                } return tokenValue2;
                case ExprToken_T.VectorConst: {
                    const struct = core.fetchObjectByType<UStruct>("Struct", "Vector");
                    const FVector = struct.buildClass(native);

                    this.bytecode.push({ type: "vector", value: new FVector().load(pkg) });

                    this.bytecodeLength = this.bytecodeLength + 4 * 3;
                } break;
                case ExprToken_T.ByteConst:
                case ExprToken_T.IntConstByte:
                    this.bytecode.push({ type: "byte", value: pkg.read(uint8).value as number });
                    this.bytecodeLength = this.bytecodeLength + 1;
                    break;
                case ExprToken_T.Iterator:
                    this.readToken(native, core, pkg, depth);
                    this.bytecode.push({ type: "uint16", value: pkg.read(uint16).value as number });
                    this.bytecodeLength = this.bytecodeLength + 2;
                    break;
                case ExprToken_T.StructCmpEq:
                case ExprToken_T.StructCmpNe: {
                    // 1981

                    debugger;

                    const objectIndex = pkg.read(compat32).value as number;

                    this.bytecode.push({ type: "compat", value: objectIndex });
                    this.bytecodeLength = this.bytecodeLength + 4;

                    this.readToken(native, core, pkg, depth);
                    this.readToken(native, core, pkg, depth);
                } break;
                case ExprToken_T.UnicodeStringConst:
                    // do
                    // {
                    //     likelyReadUint16((int)v3, v9 + *likelyBytecodeLength);
                    //     likelyBytecodeLength8 = *likelyBytecodeLength + 2;
                    //     *likelyBytecodeLength = likelyBytecodeLength8;
                    //     v9 = this[21];
                    // }
                    // while ( *(_BYTE *)(likelyBytecodeLength8 + v9 - 1) );
                    debugger;
                    throw new Error("do something here");
                    break;
                case ExprToken_T.BoolToByte:
                case ExprToken_T.BoolToInt:
                    this.readToken(native, core, pkg, depth);
                    this.readToken(native, core, pkg, depth);
                    this.readToken(native, core, pkg, depth);
                    break;
                case ExprToken_T.BoolToFloat:
                    // sub_10104296(v3, v11);
                    // v28 = *likelyBytecodeLength + 4;
                    // *likelyBytecodeLength = v28;
                    // sub_10104296(v3, v28 + this[21]);
                    // v29 = *likelyBytecodeLength + 4;
                    // *likelyBytecodeLength = v29;
                    // sub_10104296(v3, v29 + this[21]);
                    // *likelyBytecodeLength += 4;
                    // do
                    // {
                    //     likelyReadByte(v3, this[21] + *likelyBytecodeLength);
                    //     v30 = *likelyBytecodeLength + 1;
                    //     *likelyBytecodeLength = v30;
                    // }
                    // while ( *(_BYTE *)(v30 + this[21] - 1) );
                    debugger;
                    throw new Error("do something here");
                    break;
                case ExprToken_T.FloatToByte:
                    // (*(void (__thiscall **)(_DWORD *, int))(*v3 + 24))(v3, v11);
                    // likelyBytecodeLength5 = *likelyBytecodeLength + 4;
                    // *likelyBytecodeLength = likelyBytecodeLength5;
                    // (*(void (__thiscall **)(_DWORD *, int))(*v3 + 28))(v3, likelyBytecodeLength5 + this[21]);
                    // *likelyBytecodeLength += 4;
                    debugger;
                    throw new Error("do something here");
                    break;
                default: debugger; throw new Error(`Bad token '${tokenHex}'`);
            }
        } else {
            if (tokenValue >= ExprToken_T.MaxConversion && tokenValue < ExprToken_T.FirstNative) {
                this.bytecode.push({ type: "uint8", value: pkg.read(uint8).value as number });
                this.bytecodeLength = this.bytecodeLength + 1;
            }

            while (this.readToken(native, core, pkg, depth) !== ExprToken_T.EndFunctionParms);

            if (this.bytecodeLength < this.scriptSize) {
                const pos = pkg.tell();
                const token2 = pkg.read(uint8).value as ExprToken_T;

                // this.bytecode.push(token2);
                // this.bytecodeLength++;

                if (token2 === ExprToken_T.BoolToFloat) {
                    debugger;
                    throw new Error("do something here");
                }

                pkg.seek(pos, "set");
            }
        }

        depth++;

        return tokenValue2;
    }
}

export default UStruct;
export { UStruct };

function buildStructProperty(pkg: UNativePackage, field: UnProperties.UArrayProperty) {
    if (field.arrayDimensions !== 1)
        debugger;

    const childProperty = field.value;

    if (childProperty.isNumericType) {
        const dtype = (childProperty as UNumericProperty).constructor.dtype;
        const arr = new FPrimitiveArray(dtype);

        return arr;
    }

    if (childProperty instanceof UnProperties.UStructProperty) {
        const cls = buildProperty(pkg, childProperty);
        const arr = new FArray(cls);

        return arr;
    }

    if (childProperty instanceof UnProperties.UObjectProperty) {
        return new FIndexArray();
    }


    debugger;
}

function buildProperty(pkg: UNativePackage, field: UProperty): any {
    if (field instanceof UnProperties.UArrayProperty)
        return buildStructProperty(pkg, field);

    if (field.arrayDimensions > 1) {
        const arr = new Array(field.arrayDimensions);

        if (field.isNumericType) {
            for (let i = 0; i < field.arrayDimensions; i++)
                arr[i] = (field as any as IBufferValueProperty).buildBuffer();
        } else {
            debugger;
        }

        return arr;
    }

    if (field.isNumericType)
        return (field as any as IBufferValueProperty).buildBuffer();


    if (field instanceof UnProperties.UNameProperty)
        return field.buildContainer(pkg.nameTable);

    if (field instanceof UnProperties.UObjectProperty || field instanceof UnProperties.UClassProperty)
        return field.buildContainer();

    if (field instanceof UnProperties.UByteProperty)
        return field.buildContainer();

    if (field instanceof UnProperties.UStructProperty)
        return new (field.value.buildClass(pkg))();

    if (field instanceof UnProperties.UBoolProperty)
        return field.buildContainer();


    debugger;
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
    UnkMember = 0x37,
    //
    GlobalFunction = 0x38, // Call non-state version of a function

    // Native conversions.
    MinConversion = 0x39,    // Minimum conversion token
    RotatorToVector = 0x39,
    ByteToInt = 0x3A,
    ByteToBool = 0x3B,
    ByteToFloat = 0x3C,
    IntToByte = 0x3D,
    IntToBool = 0x3E,
    IntToFloat = 0x3F,
    BoolToByte = 0x40,
    BoolToInt = 0x41,
    BoolToFloat = 0x42,
    FloatToByte = 0x43,
    FloatToInt = 0x44,
    FloatToBool = 0x45,
    Unknown0x46 = 0x46,
    ObjectToBool = 0x47,
    NameToBool = 0x48,
    StringToByte = 0x49,
    StringToInt = 0x4A,
    StringToBool = 0x4B,
    StringToFloat = 0x4C,
    StringToVector = 0x4D,
    StringToRotator = 0x4E,
    VectorToBool = 0x4F,
    VectorToRotator = 0x50,
    RotatorToBool = 0x51,
    ByteToString = 0x52,
    IntToString = 0x53,
    BoolToString = 0x54,
    FloatToString = 0x55,
    ObjectToString = 0x56,
    NameToString = 0x57,
    VectorToString = 0x58,
    RotatorToString = 0x59,
    MaxConversion = 0x60,    // Maximum conversion token
    ExtendedNative = 0x60,

    UnkToken0x3f = 0x3f,

    UnkToken0x61 = 0x61,
    UnkToken0x62 = 0x62,
    UnkToken0x6f = 0x6f,

    FirstNative = 0x70,
};

class FLabelField implements IConstructable {
    public name: string = "None";
    public offset: number;

    public load(pkg: UPackage): this {
        const compat32 = new BufferValue(BufferValue.compat32);
        const uint32 = new BufferValue(BufferValue.uint32);

        const nameIndex = pkg.read(compat32).value as number;

        this.name = pkg.nameTable[nameIndex].name;
        this.offset = pkg.read(uint32).value as number;

        return this;
    }

    public isNone() { return this.name === "None"; }

}