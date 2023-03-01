import UField from "./un-field";
import { FNameArray } from "./un-array";
import UExport from "./un-export";

class UEnum extends UField {
    public readonly names = new FNameArray();
    public friendlyName: string;

    protected preLoad(pkg: UPackage, exp: UExport<UObject>): void {
        super.preLoad(pkg, exp);

        this.friendlyName = exp.objectName;
    }

    protected doLoad(pkg: UPackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        this.names.load(pkg);
    }
}

export default UEnum;
export { UEnum };