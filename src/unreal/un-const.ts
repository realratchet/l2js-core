import UField from "./un-field";
import FString from "./un-string";
import type UObject from "./un-object";
import type APackage from "./un-package";
import type UExport from "./un-export";

class UConst extends UField {
    protected value: string;
    public constName: string;

    protected static getConstructorName() { return "Const"; }
    public toString() { return `Const[${this.value}]`; }

    protected preLoad(pkg: APackage, exp: UExport<UObject>): void {
        this.constName = exp.objectName;
        super.preLoad(pkg, exp);
    }

    protected doLoad(pkg: APackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        this.value = new FString().load(pkg).value;

        this.readHead = pkg.tell();
    }
}

export default UConst;
export { UConst };
