import UField from "./un-field";
import BufferValue from "../buffer-value";
import ObjectFlags_T from "./un-object-flags";
import UObject from "./un-object";
import * as UnProperties from "./un-property/un-properties";
import FArray from "./un-array";

class UStruct extends UField {
    declare ["constructor"]: typeof UStruct;

    protected textBufferId: number;

    protected firstChildPropId: number;
    public readonly childPropFields = new Map<string, UnProperties.UProperty | UFunction>();

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

        throw new Error("Broken");
    }

    protected setProperty(tag: PropertyTag, value: any) {
        let field: UStruct = this;

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
            this.unkObjectId = pkg.read(compat32).value;
        }

        this.line = pkg.read(int32).value;
        this.textPos = pkg.read(int32).value;

        this.scriptSize = pkg.read(uint32).value;

        this.readScript(pkg);

        this.readHead = pkg.tell();

        if (this.firstChildPropId !== 0) {
            let childPropId = this.firstChildPropId;

            while (Number.isFinite(childPropId) && childPropId !== 0) {

                const field = pkg.fetchObject<UnProperties.UProperty>(childPropId).loadSelf();

                this.childPropFields.set(field.propertyName, field);

                childPropId = field.nextFieldId;
            }
        }
    }

    protected readScript(pkg: UPackage) { pkg.seek(this.scriptSize); }

    public buildClass<T extends UObject = UObject>(pkg: UNativePackage): new () => T {
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

                if (field instanceof UnProperties.UArrayProperty) {
                    debugger;
                    if (field.arrayDimensions !== 1)
                        debugger;

                    if (defaultProperties.has(propertyName))
                        debugger;

                    clsNamedProperties[propertyName] = (field.dtype as FArray).clone((this as any)[propertyName]);
                    continue;
                }

                if (this.propertyDict.has(propertyName))
                    clsNamedProperties[propertyName] = this.propertyDict.get(propertyName);
                else if (field.arrayDimensions > 1) {
                    const arr = clsNamedProperties[propertyName] = new Array(field.arrayDimensions);

                    if (field.isNumericType) {
                        for (let i = 0; i < field.arrayDimensions; i++)
                            arr[i] = (field as any as IBufferValueProperty).createBuffer();
                    } else {
                        debugger;
                    }
                } else if (field.isNumericType) {
                    clsNamedProperties[propertyName] = (field as any as IBufferValueProperty).createBuffer();
                } else if (field instanceof UnProperties.UObjectProperty || field instanceof UnProperties.UNameProperty || field instanceof UnProperties.UByteProperty) {
                    clsNamedProperties[propertyName] = field;
                } else if (field instanceof UnProperties.UStructProperty) {
                    clsNamedProperties[propertyName] = field.value.buildClass(pkg);
                } else if (field instanceof UnProperties.UBoolProperty) {
                    clsNamedProperties[propertyName] = field;
                } else {
                    debugger;
                }
            }

            for (const propertyName of Object.keys(defaultProperties)) {
                debugger;
                clsNamedProperties[propertyName] = (this as any)[propertyName];
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
            [this.friendlyName]: class DynamicStruct extends Constructor {
                public static readonly isDynamicClass = true;
                public static readonly friendlyName = friendlyName;
                public static readonly hostClass = hostClass;
                public static readonly nativeClass = lastNative;
                public static readonly inheretenceChain = Object.freeze(inheretenceChain);

                protected newProps: Record<string, string> = {};

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

                        if (!(value instanceof BufferValue))
                            debugger;

                        this.propertyDict.set(varname, value);

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

        const cls = eval([
            `(function() {`,
            `    const ${Constructor.name} = _clsBase;`,
            `    return class ${friendlyName} extends ${Constructor.name} {`,
            `        /*`,
            `        */`,
            `}`,
            `})();`,
        ].join("\n"));

        console.log(cls);

        debugger;

        this.kls = cls as any;

        return this.kls as any as new () => T;
    }
}

export default UStruct;
export { UStruct };