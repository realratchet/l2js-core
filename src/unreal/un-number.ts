import BufferValue from "../buffer-value";

class FNumber<T extends C.NumberTypes_T> {
    protected readonly type: C.ValidTypes_T<T>;
    public value: ReturnType<T>;

    private constructor(dtype: C.ValidTypes_T<T>) {
        this.type = dtype;
    }

    public load(pkg: C.AUPackage): this {
        this.value = pkg.read(new BufferValue<C.NumberTypes_T>(this.type)).value as ReturnType<T>;

        return this;
    }

    public static forType<T extends C.NumberTypes_T>(dtype: C.ValidTypes_T<T>): new (...params: any) => FNumber<T> {
        class FNumberExt extends FNumber<T> {
            constructor() { super(dtype); }
        }

        return FNumberExt;
    }
}

export default FNumber;
export { FNumber };

type ReturnType<T extends C.NumberTypes_T> = T extends C.PrimitiveNumberTypes_T
    ? number
    : T extends C.BigNumberTypes_T
    ? bigint
    : never;