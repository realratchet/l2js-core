import UPackage from "./un-package";
import BufferValue from "../buffer-value";
import PropertyTag from "./un-property/un-property-tag";
import UExport from "./un-export";
import FNumber from "./un-number";

class FArray<T extends UObject | FNumber<ValueTypeNames_T> | IConstructable, R = T & number> extends Array<R> implements IConstructable {
    protected Constructor: { new(...pars: any): T };

    public getElemCount() { return this.length; }
    public getElem(idx: number): R { return this[idx]; }

    public constructor(constr: { new(...pars: any): T }) {
        super();

        this.Constructor = constr;
    }

    public map<T2>(fnMap: (value: R, index: number, array: R[]) => T2): T2[] { return [...this].map(fnMap); }

    public load(pkg: UPackage, tag?: PropertyTag): this {
        const hasTag = tag !== null && tag !== undefined;
        const beginIndex = hasTag ? pkg.tell() : null;
        const count = pkg.read(new BufferValue(BufferValue.compat32)).value;
        const headerOffset = hasTag ? pkg.tell() - beginIndex : null;
        const dataSize = hasTag ? tag.dataSize - headerOffset : null;

        this.length = count;

        if (count === 0) return this;

        const elementSize = hasTag ? dataSize / this.length : null;

        for (let i = 0, len = this.length; i < len; i++) {
            const exp = hasTag ? (function () {
                const exp = new UExport();

                exp.size = elementSize;
                exp.objectName = `${tag.name}[${i + 1}/${count}]`
                exp.offset = pkg.tell();

                return exp;
            })() : null;

            this[i] = new (this.Constructor as any)(elementSize).load(pkg, exp);
        }

        if (hasTag) console.assert((pkg.tell() - beginIndex - tag.dataSize) === 0);

        return this;
    }

    public clone(other: FArray<T, R>): this {
        if (!other)
            return this;

        this.Constructor = other.Constructor;

        for (const v of other)
            this.push(v);

        return this;
    }
}

class FIndexArray extends FArray<FNumber<"compat32">> {
    public constructor() {
        super(FNumber.forType(BufferValue.compat32));
    }
}

class FNameArray extends Array<string> implements IConstructable {
    protected indexArray = new FIndexArray();

    public load(pkg: UPackage, tag?: PropertyTag): this {
        this.indexArray.load(pkg, tag);

        let i = 0;

        for (const index of this.indexArray)
            this[i++] = pkg.nameTable[index.value].name;

        return this;
    }

    public loadSelf(): this { return this; }

    public clone(other: FNameArray): this {
        if (!other)
            return this;

        this.indexArray = other.indexArray;

        for (const v of other)
            this.push(v);

        return this;
    }
}

export default FArray;
export { FArray, FIndexArray, FNameArray };