import UField from "./un-field";
import { FNameArray } from "./un-array";
import UExport from "./un-export";
import type UObject from "./un-object";
import type APackage from "./un-package";

class UEnum extends UField {
    public readonly names = new FNameArray();
    public friendlyName: string;

    protected static getConstructorName() { return "Enum"; }

    protected preLoad(pkg: APackage, exp: UExport<UObject>): void {
        super.preLoad(pkg, exp);

        this.friendlyName = exp.objectName;
    }

    protected doLoad(pkg: APackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        this.names.load(pkg);
    }

    public toString() { return `Enum[${this.friendlyName}]`; }
}

export default UEnum;
export { UEnum };
