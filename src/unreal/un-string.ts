let decoder: TextDecoder = null;

class FString implements IConstructable {
    public value: string;

    public load(pkg: C.APackage): this {
        const bufLen = pkg.read("compat32");
        const buf = pkg.read(bufLen).value;

        decoder = decoder ?? new TextDecoder("ascii");

        this.value = decoder.decode(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength - 1));

        return this;
    }
}

export default FString;
export { FString };