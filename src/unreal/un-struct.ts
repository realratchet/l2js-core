import UField from "./un-field";
import BufferValue from "../buffer-value";
import ObjectFlags_T from "./un-object-flags";
import UObject from "./un-object";
import { UArrayProperty, UProperty } from "./un-property/un-properties";
import FArray from "./un-array";

class UStruct extends UField {
    protected textBufferId: number;

    protected firstChildPropId: number;
    public readonly childPropFields: UProperty[] = [];

    public friendlyName: string;
    protected line: number;
    protected textPos: number;
    protected unkObjectId: number = 0;
    protected unkObject: UObject;
    protected scriptSize: number;
    protected kls: new () => UObject;

    public readonly isStruct = true;

    protected static getConstructorName() { return "Struct"; }
    protected defaultProperties = new Set<string>();

    protected readArray(pkg: UPackage, tag: PropertyTag) {
        let field: UStruct = this;

        while (field) {

            const index = field.childPropFields.findIndex(x => x.propertyName === tag.name);

            if (index === -1) {
                field = field.superField as any as UStruct;
                continue;
            }

            const property = field.childPropFields[index];

            // debugger;

            const constr = property.createObject();
            const value = constr(pkg, tag);

            this.setProperty(tag, value);

            return true;

        }

        throw new Error("Broken");
    }

    protected setProperty(tag: PropertyTag, value: any) {
        debugger;
        let field: UStruct = this;

        while (field) {

            const index = field.childPropFields.findIndex(x => x.propertyName === tag.name);

            if (index === -1) {
                field = field.superField as UStruct;
                continue;
            }

            const property = field.childPropFields[index];

            console.log(property);

            if (property.arrayDimensions > 1) {
                (this as any)[tag.name] = (this as any)[tag.name] || new Array(property.arrayDimensions);

                if (tag.arrayIndex in (this as any)[tag.name])
                    debugger;

                (this as any)[tag.name][tag.arrayIndex] = value;
            } else {
                if (tag.name in (this as any))
                    debugger;

                (this as any)[tag.name] = value;
            }

            this.defaultProperties.add(tag.name);


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

                const field = pkg.fetchObject<UProperty>(childPropId).loadSelf();

                this.childPropFields.push(field);

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

            if (base.constructor !== UStruct)
                debugger;

            const { childPropFields, defaultProperties } = base;

            for (const field of childPropFields) {
                if (!(field instanceof UProperty)) continue;

                const propertyName = field.propertyName;

                debugger;

                if (field instanceof UArrayProperty) {
                    if (field.arrayDimensions !== 1)
                        debugger;

                    if (defaultProperties.has(propertyName))
                        debugger;

                    clsNamedProperties[propertyName] = (field.dtype as FArray).clone((this as any)[propertyName]);
                    continue;
                }

                clsNamedProperties[propertyName] = field.arrayDimensions > 1
                    ? propertyName in this
                        ? (this as any)[propertyName]
                        : new Array(field.arrayDimensions)
                    : (this as any)[propertyName];
            }

            for (const propertyName of Object.keys(defaultProperties))
                clsNamedProperties[propertyName] = (this as any)[propertyName];
        }

        const friendlyName = this.friendlyName;
        const hostClass = this;
        const Constructor = lastNative
            ? pkg.getConstructor(lastNative.friendlyName as NativeTypes_T) as any as typeof UObject
            : pkg.getStructConstructor(this.friendlyName) as any as typeof UObject;

        if (lastNative)
            debugger;

        const cls = {
            [this.friendlyName]: class extends Constructor {
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

                    for (const [name, value] of Object.entries(clsNamedProperties)) {
                        const varname = name in oldProps ? oldProps[name] : name;

                        if (!(name in oldProps)) {
                            newProps[varname] = varname;
                            missingProps.push(varname);
                        }

                        if (value !== undefined || !(varname in this))
                            (this as any)[varname] = value;
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

        this.kls = cls as any;

        return this.kls as any as new () => T;
    }
}

export default UStruct;
export { UStruct };