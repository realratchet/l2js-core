import BufferValue from "../buffer-value";

let decoder: TextDecoder = null;

class FString implements IConstructable {
    public value: string;

    public load(pkg: C.APackage): this {
        const bufLen = pkg.read(new BufferValue(BufferValue.compat32)).value;
        const buf = pkg.read(BufferValue.allocBytes(bufLen)).value;

        decoder = new TextDecoder("ascii") || decoder;

        this.value = decoder.decode(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength - 1));

        return this;
    }
}

export default FString;
export { FString };