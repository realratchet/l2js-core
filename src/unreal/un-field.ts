import BufferValue from "src/buffer-value";
import UObject from "./un-object";

abstract class UField extends UObject {
    public superFieldId: number = 0;
    public nextFieldId: number = 0;
    public superField: UField;
    public nextField: UField;

    public readonly isField = true;

    protected doLoad(pkg: UPackage, exp: UExport): void {
        if (this.constructor.name !== "UClass")
            super.doLoad(pkg, exp);

        const compat32 = new BufferValue(BufferValue.compat32);

        this.superFieldId = pkg.read(compat32).value as number;
        this.nextFieldId = pkg.read(compat32).value as number;
    }
}

export default UField;
export { UField };