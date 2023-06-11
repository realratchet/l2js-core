import BufferValue from "../buffer-value";
import UExport from "./un-export";
import FNumber from "./un-number";

class FArray<T extends C.UObject | FNumber<C.NumberTypes_T> | IConstructable> extends Array<T> implements IConstructable {
    protected Constructor: { new(...pars: any): T };

    public getElemCount() { return this.length; }
    public getElem(idx: number): T { return this[idx]; }
    public getConstructor() { return this.Constructor; }

    public constructor(constr: { new(...pars: any): T }) {
        super();

        if (!constr)
            debugger;

        this.Constructor = constr;
    }

    public map<T2>(fnMap: (value: T, index: number, array: T[]) => T2): T2[] { return [...this].map(fnMap); }

    public load(pkg: C.APackage, tag?: C.PropertyTag): this {
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

    public copy(other: FArray<T>): this {
        if (!other)
            debugger;

        if (!other)
            return this;

        this.Constructor = other.Constructor;

        for (const v of other)
            this.push(v);

        return this;
    }

    public clone(): FArray<T> { return new FArray(this.Constructor).copy(this); }
}

class FIndexArray extends FArray<FNumber<"compat32">> {
    public constructor() {
        super(FNumber.forType(BufferValue.compat32));
    }
}

class FObjectArray<T extends C.UObject = C.UObject> extends Array<T> implements IConstructable {
    protected indexArray = new FIndexArray();

    public load(pkg: C.APackage, tag?: C.PropertyTag): this {
        this.indexArray.load(pkg, tag);

        let i = 0;

        for (const index of this.indexArray)
            this[i++] = pkg.fetchObject<T>(index.value);

        return this;
    }

    public getIndexList(): number[] { return this.indexArray.map(v => v.value); }

    public loadSelf(): this {
        for (const obj of this)
            obj.loadSelf();

        return this;
    }

    public copy(other: FObjectArray<T>): this {
        if (!other)
            return this;

        this.indexArray = other.indexArray;

        for (const v of other)
            this.push(v);

        return this;
    }

    public clone(): FObjectArray<T> { return new FObjectArray<T>().copy(this); }
}

class FNameArray extends Array<string> implements IConstructable {
    protected indexArray = new FIndexArray();

    public load(pkg: C.APackage, tag?: C.PropertyTag): this {
        this.indexArray.load(pkg, tag);

        let i = 0;

        for (const index of this.indexArray)
            this[i++] = pkg.nameTable[index.value].name;

        return this;
    }

    public loadSelf(): this { return this; }

    public copy(other: FNameArray): this {
        if (!other)
            return this;

        this.indexArray = other.indexArray;

        for (const v of other)
            this.push(v);

        return this;
    }

    public clone(): FNameArray { return new FNameArray().copy(this); }
}

class FPrimitiveArray<T extends C.NumberTypes_T> implements IConstructable {
    protected array: DataView;
    protected Constructor: C.ValidTypes_T<T>;

    public getElemCount() { return this.array ? this.array.byteLength / this.Constructor.bytes : 0; }
    public getElem(idx: number): number {
        let funName: string = null;

        switch (this.Constructor.name) {
            case "int64": funName = "getBigInt64"; break;
            case "uint64": funName = "getBigUint64"; break;
            case "compat32":
            case "int32":
                funName = "getInt32";
                break;
            case "float": funName = "getFloat32"; break;
            case "uint32": funName = "getUint32"; break;
            case "int8": funName = "getInt8"; break;
            case "uint8": funName = "getUint8"; break;
            case "int16": funName = "getInt16"; break;
            case "uint16": funName = "getUint16"; break;
            default: throw new Error(`Unknown type: ${this.Constructor.name}`);
        }

        return (this.array as any)[funName](idx * this.Constructor.bytes, true);

    }

    public constructor(constr: C.ValidTypes_T<T>) { this.Constructor = constr; }

    public map<T>(fnMap: (value: any, index: number, array: any[]) => T): T[] { return [...(this as any as Array<T>)].map(fnMap); }

    public load(pkg: C.APackage, tag?: C.PropertyTag): this {
        const hasTag = tag !== null && tag !== undefined;
        const beginIndex = hasTag ? pkg.tell() : null;
        const count = pkg.read(new BufferValue(BufferValue.compat32));
        const elementCount = count.value as number;

        if (elementCount === 0) {
            this.array = new DataView(new ArrayBuffer(0));
            return this;
        }

        const byteLength = elementCount * this.Constructor.bytes;

        this.array = pkg.readPrimitive(pkg.tell(), byteLength);

        pkg.seek(byteLength);

        if (hasTag && (pkg.tell() - beginIndex - tag.dataSize) !== 0) debugger;
        if (hasTag) console.assert((pkg.tell() - beginIndex - tag.dataSize) === 0);

        return this;
    }

    public getArrayBufferSlice() {
        return this.array.buffer.slice(this.array.byteOffset, this.array.byteOffset + this.getByteLength());
    }

    public getTypedArray() {
        try {
            return new this.Constructor.dtype(this.array.buffer, this.array.byteOffset, this.getElemCount());
        } catch (e) {
            if (e.message.includes("should be a multiple of"))
                return new this.Constructor.dtype(this.getArrayBufferSlice());

            throw e;
        }
    }

    public getByteLength() { return this.array.byteLength; }
}

class FPrimitiveArrayLazy<T extends C.NumberTypes_T> extends FPrimitiveArray<T>{
    public unkLazyInt: number;

    public load(pkg: C.APackage, tag?: C.PropertyTag): this {

        this.unkLazyInt = pkg.read(new BufferValue(BufferValue.int32)).value as number;

        super.load(pkg, tag);

        return this;
    }
}

export default FArray;
export { FArray, FIndexArray, FNameArray, FPrimitiveArray, FObjectArray, FPrimitiveArrayLazy };