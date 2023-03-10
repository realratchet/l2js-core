import UField from "./un-field";
import FString from "./un-string";

class UConst extends UField {
    protected value: string;

    protected static getConstructorName() { return "Const"; }
    public toString() { return `Const[${this.value}]`; }

    protected doLoad(pkg: UPackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        this.value = new FString().load(pkg).value;
        this.readHead = pkg.tell();
    }
}

export default UConst;
export { UConst };