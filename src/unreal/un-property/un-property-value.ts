import BufferValue from "../../buffer-value";
import UPackage from "../un-package";

abstract class UPropValue {
    public name: string;

    public abstract load(pkg: UPackage): this;
    public constructor(name: string) {
        this.name = name;
    }
}

class UPropValueUint8 extends UPropValue {
    static dtype = BufferValue.uint8;
    public value = new BufferValue(this.constructor.dtype);

    ["constructor"]: typeof UPropValueUint8;

    public static load(pkg: UPackage): this {
        pkg.read(this.value);

        return this;
    }
}

export default UPropValue;
export { UPropValue, UPropValueUint8 };