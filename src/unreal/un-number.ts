import BufferValue from "../buffer-value";

class FNumber<T extends NumberTypes_T> {
    protected readonly type: ValidTypes_T<T>;
    public value: number | BigInt;

    private constructor(dtype: ValidTypes_T<T>) {
        this.type = dtype;
    }

    public load(pkg: UPackage): this {
        this.value = pkg.read(new BufferValue(this.type)).value;

        return this;
    }

    public static forType<T extends NumberTypes_T>(dtype: ValidTypes_T<T>): new (...params: any) => FNumber<T> {
        class FNumberExt extends FNumber<T> {
            constructor() { super(dtype); }
        }

        return FNumberExt;
    }
}

export default FNumber;
export { FNumber };