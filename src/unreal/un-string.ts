import BufferValue from "../buffer-value";

class FString implements IConstructable {
    public value: string;

    public load(pkg: UPackage): this {

        const bufLen = pkg.read(new BufferValue(BufferValue.compat32)).value;
        const buf = pkg.read(BufferValue.allocBytes(bufLen)).value;

        this.value = new TextDecoder("ascii").decode(buf.buffer.slice(0, -1));

        return this;
    }
}

export default FString;
export { FString };