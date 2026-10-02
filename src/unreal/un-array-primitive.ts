import BufferValue, { NumberTypes_T, StringTypes_T, ValidTypes_T, PrimitiveNumberTypes_T, BigNumberTypes_T } from "../buffer-value";
import type APackage from "./un-package";

type PrimitiveArrayTypes_T = NumberTypes_T | StringTypes_T;

class FArrayPrimitive<T extends PrimitiveArrayTypes_T> {
    protected readonly type: ValidTypes_T<T>;
    public value: ReturnType<T>;

    private constructor(dtype: ValidTypes_T<T>) {
        this.type = dtype;
    }

    public load(pkg: APackage): this {
        this.value = pkg.read(new BufferValue<PrimitiveArrayTypes_T>(this.type)).value as ReturnType<T>;

        return this;
    }

    public static forType<T extends PrimitiveArrayTypes_T>(dtype: ValidTypes_T<T>): new (...params: any) => FArrayPrimitive<T> {
        class FArrayPrimitiveExt extends FArrayPrimitive<T> {
            constructor() { super(dtype); }
        }

        return FArrayPrimitiveExt;
    }
}

export default FArrayPrimitive;
export { FArrayPrimitive };

type ReturnType<T extends PrimitiveArrayTypes_T> =
    | T extends PrimitiveNumberTypes_T | "compat32" ? number
    : T extends BigNumberTypes_T ? bigint
    : T extends StringTypes_T ? string
    : never;
