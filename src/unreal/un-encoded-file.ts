import BufferValue, { PrimitiveNumberTypes_T, BigNumberTypes_T, ValueTypeNames_T, NumberTypes_T } from "../buffer-value";
import * as decoders from "../crypto/decryption/decoders";
import * as _gmp from "gmp-wasm";
import * as modKeys from "../crypto/keys/modulo";

let gmp: _gmp.GMPLib = null;

const decoderUTF16 = new TextDecoder("utf-16");

type EncodedFile_T = {
    read(target: number | "guid"): DataView<ArrayBuffer>;
    read(target: "char" | "utf16"): string;
    read<T extends PrimitiveNumberTypes_T | "compat32">(target: T): number;
    read<T extends BigNumberTypes_T>(target: T): bigint;
    read<T extends ValueTypeNames_T>(target: BufferValue<T>): BufferValue<T>;
};

type Seek_T = "current" | "set";

type EncodedSource_T = { readonly size: number; read(offset: number, length: number): DataView; decrypt(key: number, offset: number): void; close(): void };

const numberTypes = [
    "int64", "uint64",
    "float",
    "compat32",
    "int32", "uint32",
    "int8", "uint8",
    "int16", "uint16",
    "guid", "char", "utf16"
] as const;

type InstancedTypes = NumberTypes_T | "guid" | "char" | "utf16";
const buffInstances: Record<InstancedTypes, BufferValue<InstancedTypes>> = numberTypes.reduce((acc, t) => {
    acc[t] = new BufferValue(BufferValue[t]);
    return acc;
}, {} as any);
const tmpReadBytes = new DataView(new ArrayBuffer(0));


// const instances: Record<NumberTypes_T, BufferValue<any>> = {
//     compat32: new BufferValue(BufferValue.compat32)
// }



abstract class UEncodedFile implements EncodedFile_T {
    public readonly path: string;
    public readonly isReadable = false;

    protected moduloCryptKey: number;
    protected signature: number;

    protected handle: this = null;
    protected promiseDecoding: Promise<BufferValue>;
    protected buffer: ArrayBuffer = null;
    protected source: EncodedSource_T = null;
    protected offset = 0;
    protected contentOffset = 0;
    protected version: string;

    constructor(path: string) {
        this.path = path;
    }

    public free() {
        if (this.source) this.source.close();
        this.source = null;
        this.signature = undefined;
        this.moduloCryptKey = undefined;
        this.version = undefined;
        this.offset = 0;
        this.contentOffset = 0;
        this.buffer = null;
        this.promiseDecoding = null;
    }

    // a readable is only a cursor, the binary and tables are read through the handle so free() applies to every reader
    public asReadable(): this {

        // if (this.isReadable)
        //     throw new Error("Already readable!");

        const readable = Object.create(this);

        readable.isReadable = true;
        readable.handle = this;
        readable.offset = this.offset;

        return readable;
    }

    public ensureReadable() {
        if (!this.isReadable)
            throw new Error("Stream is not readable!");
    }

    public seek(offset: number, origin: Seek_T = "current") {
        this.ensureReadable();

        switch (origin) {
            case "current": this.offset = this.offset + offset; break;
            case "set": this.offset = offset + this.contentOffset; break;
            default: throw new Error(`Seek type not supported: ${origin}`);
        }
    }

    public readPrimitive(byteOffset: number, byteLength: number) {
        if (this.source) {
            const view = this.source.read(byteOffset + this.contentOffset, byteLength);
            return new DataView(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
        }
        return new DataView(this.buffer, byteOffset + this.contentOffset, byteLength)
    }

    protected readSource(target: BufferValue, copy: boolean): DataView {
        const type = (target as any).type;
        let length = type.bytes;

        if (type.name === "char") {
            const prefix = this.source.read(this.offset, Math.min(5, this.source.size - this.offset));
            const count = buffInstances.compat32.readValue(prefix.buffer as ArrayBuffer, prefix.byteOffset);
            length = count + Math.max(0, buffInstances.compat32.value as number);
        } else if (type.name === "utf16") {
            length = 4 + this.source.read(this.offset, 4).getUint32(0, true);
        } else if (type.name === "compat32") length = Math.min(5, this.source.size - this.offset);

        const view = this.source.read(this.offset, length);
        return copy ? new DataView(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)) : view;
    }

    public read(target: number | "guid"): DataView<ArrayBuffer>;
    public read(target: "char" | "utf16"): string;
    public read<T extends PrimitiveNumberTypes_T | "compat32">(target: T): number;
    public read<T extends BigNumberTypes_T>(target: T): bigint;
    public read<T extends ValueTypeNames_T>(target: BufferValue<T>): BufferValue<T>;

    public read(target: any) {
        this.ensureReadable();

        if (target in buffInstances) {
            target = buffInstances[target as NumberTypes_T | "guid"];

            const view = this.source ? this.readSource(target, false) : null;
            this.offset += target.readValue(view ? view.buffer : this.buffer, view ? view.byteOffset : this.offset);

            const value = target.value;

            if (target !== buffInstances.compat32) target.bytes = tmpReadBytes;
            return value;

        } else if (typeof target === "number") {
            const _target = BufferValue.allocBytes(target);

            const view = this.source ? this.readSource(_target, true) : null;
            this.offset += _target.readValue(view ? view.buffer : this.buffer, view ? view.byteOffset : this.offset);

            return _target.value;
        } else if (target instanceof BufferValue) {
            const view = this.source ? this.readSource(target, true) : null;
            this.offset += target.readValue(view ? view.buffer : this.buffer, view ? view.byteOffset : this.offset);

            return target;
        } else {
            throw new Error("Invalid argument");
        }
    }

    public tell() { return this.offset - this.contentOffset; }

    public dump(lineCount: number = 1, restore: boolean = true, printHeaders: boolean = true) {
        this.ensureReadable();

        let oldHeader = this.offset;
        let constructedString = "";
        let divisor = 0XF, lineCountHex = 1;
        const buff = BufferValue.allocBytes(2);

        do {
            if ((lineCount / divisor) < 1) break;
            divisor = divisor * 0X10 + 0XF; // shift divisor
            lineCountHex++;
        } while (true);

        const offsetHeader = printHeaders ? new Array(5 + lineCountHex).fill("-").join("") : null;

        if (printHeaders) {
            console.log(`${offsetHeader}--------------------------------------------------------`);
            console.log(`${offsetHeader}------------------- Dumping lines ----------------------`);
            console.log(`${offsetHeader}--------------------------------------------------------`);
        }

        for (let i = 0; i < lineCount; i++) {
            const bytes = Math.min((this.source ? this.source.size : this.buffer.byteLength) - this.offset, 8);
            const groups = new Array(bytes).fill('.').map(() => this.read(buff));

            const string1 = groups.map(g => g.hex.slice(2)).join(" ");
            const string2 = groups.map(g => g.string).join("");

            constructedString += string2;
            constructedString = constructedString.slice(-100);

            if (lineCount <= 256) {
                if (true || string1.match(/(^0005)|(^0077)|(^0007)/)) {

                    const extraArgs: any[] = [];

                    let finalString = string1;

                    const bits = i.toString(16).toUpperCase();
                    const head = new Array(lineCountHex - bits.length).fill("0").join("");

                    console.log(
                        [
                            `(0x${head}${bits})`,
                            finalString,
                            string2,
                        ].join(" "),
                        ...extraArgs
                    );
                } else {
                    console.log(
                        string1,
                        string2
                    );
                }
            }
        }

        if (printHeaders)
            console.log(`${offsetHeader}--------------------------------------------------------`);

        if (restore) this.offset = oldHeader;
    }

    public async decode(): Promise<this> {
        if (this.buffer) return this;
        if (!this.promiseDecoding) await this._doDecode();
        else await this.promiseDecoding;

        return this;
    }

    protected abstract readArrayBuffer(): Promise<ArrayBuffer>;

    protected _doDecode(): Promise<BufferValue> {
        this.ensureReadable();

        if (this.promiseDecoding) return this.promiseDecoding;

        // console.log(`%cStarted loading package: %c${this.path}`, "color: blue", "color: gray");

        // async IIFE because a throw inside new Promise(async resolve => ...) never rejects, it just hangs
        return this.handle.promiseDecoding = this.promiseDecoding = (async () => {
            this.buffer = await this.readArrayBuffer();

            const signature = this.read(new BufferValue(BufferValue.uint32));
            const HEADER_SIZE = 28;
            const HEADER_VER_OFFSET = 22;

            if (signature.value === 0x0069004C) {
                this.seek(HEADER_VER_OFFSET, "set");

                const vv = this.read(6);
                const version = decoderUTF16.decode(vv);

                this.seek(HEADER_SIZE, "set");

                let tStart;

                this.version = version;

                if (version.startsWith("1")) {

                    if (this.version === "111") {
                        this.moduloCryptKey = modKeys.modulo111;
                    } else {
                        this.moduloCryptKey = (this.read("uint8") as number) ^ modKeys.modulo121;
                    }

                    this.contentOffset = HEADER_SIZE;
                    this.seek(0, "set");

                    tStart = performance.now();

                    if (this.source) this.source.decrypt(this.moduloCryptKey, HEADER_SIZE);
                    else this.buffer = decoders.decryptModulo(new Uint8Array(this.buffer, HEADER_SIZE), this.moduloCryptKey);

                    this.read(signature);
                } else if (version.startsWith("4")) {
                    if (this.source) {
                        const view = this.source.read(0, this.source.size);
                        this.buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
                        this.source.close();
                        this.handle.source = null;
                    }
                    if (gmp === null) {
                        gmp = await _gmp.init();
                    }

                    this.buffer = decoders.decryptRSA(gmp, new Uint8Array(this.buffer, HEADER_SIZE));
                    this.contentOffset = 0;
                    this.seek(0, "set");

                } else {
                    throw new Error(`Unsupported file version: ${version}`)
                }

                const size = this.source ? this.source.size : this.buffer.byteLength;
                let sizeString: string;

                if (size >= szGB) sizeString = `${(size / szGB).toFixed(2)}GB`;
                else if (size >= szMB) sizeString = `${(size / szMB).toFixed(2)}MB`;
                else if (size >= szKB) sizeString = `${(size / szKB).toFixed(2)}kB`;
                else sizeString = `${size.toFixed(2)}B`;

                // if (size > 1024 * 1024)
                //     console.log(`'${this.path}' loaded in ${(performance.now() - tStart).toFixed(3)} ms (${sizeString})`);

                this.signature = signature.value;
                return signature;
            } else {
                // no encoding
                this.contentOffset = 0;
                this.signature = signature.value;

                return signature;
            }

        })();
    }

    public abstract toBuffer(): ArrayBuffer;
}

export default UEncodedFile;
export { UEncodedFile };
export type { Seek_T };

const szKB = 1024, szMB = szKB * 1024, szGB = szMB * 1024;
