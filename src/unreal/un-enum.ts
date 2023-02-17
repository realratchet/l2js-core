import UField from "./un-field";
import { FNameArray } from "./un-array";

class UEnum extends UField {
    protected names = new FNameArray();

    protected doLoad(pkg: UPackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        this.names.load(pkg);
    }
}

export default UEnum;
export { UEnum };