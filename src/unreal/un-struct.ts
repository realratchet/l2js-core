import UField from "./un-field";
import BufferValue from "../buffer-value";

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
        // debugger;
        let field: UStruct = this;

        while (field) {

            const index = field.childPropFields.findIndex(x => x.propertyName === tag.name);

            if (index === -1) {
                field = field.superField as UStruct;
                continue;
            }

            const property = field.childPropFields[index];

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
}

export default UStruct;
export { UStruct };