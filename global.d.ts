type ValueTypeNames_T = "int64" | "uint64" | "int32" | "uint32" | "int16" | "uint16" | "int8" | "uint8" | "guid" | "char" | "buffer" | "compat32" | "float" | "utf16";

type ValidTypes_T<T extends ValueTypeNames_T> = {
    bytes?: number;
    signed: boolean;
    name: T;
    dtype?: BigInt64ArrayConstructor | BigUint64ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int8ArrayConstructor | Uint8ArrayConstructor | Float32ArrayConstructor;
};

type Seek_T = "current" | "set";