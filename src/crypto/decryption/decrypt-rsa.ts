import { Inflate } from "pako";

type GMPLib = import("gmp-wasm").GMPLib;
type mpz_ptr = import("gmp-wasm").mpz_ptr;

const BLOCK_SIZE = 128;

class RSADecoder {
    protected gmp: GMPLib;
    protected buffer = new Uint8Array(BLOCK_SIZE);
    protected encodedBuffer: Uint8Array;
    protected startPosition = 0;
    protected position = 0;
    protected readOffset = 0;
    protected size = 0;
    protected rop: mpz_ptr;
    protected mod: mpz_ptr;
    protected base: mpz_ptr;
    protected block: number;
    protected exp: number;
    protected archiveSize = 0;

    public constructor(gmp: GMPLib, modulus: string, exponent: number, buffer: Uint8Array) {
        this.gmp = gmp;
        this.encodedBuffer = buffer;

        const rop = gmp.binding.mpz_t();
        gmp.binding.mpz_init(rop);

        const mod = gmp.binding.mpz_t();
        const ptrStrModulus = gmp.binding.malloc_cstr(modulus);
        gmp.binding.mpz_init_set_str(mod, ptrStrModulus, 16);
        gmp.binding.free(ptrStrModulus);

        const base = gmp.binding.mpz_t();
        gmp.binding.mpz_init(base);

        this.rop = rop;
        this.exp = exponent;
        this.mod = mod;
        this.base = base;
        this.block = gmp.binding.malloc(BLOCK_SIZE);
    }

    public cleanup() {
        this.gmp.binding.mpz_clear(this.rop);
        this.gmp.binding.mpz_clear(this.mod);
        this.gmp.binding.mpz_clear(this.base);
        this.gmp.binding.free(this.rop);
        this.gmp.binding.free(this.mod);
        this.gmp.binding.free(this.base);
        this.gmp.binding.free(this.block);
    }

    protected *read() {
        while (this.ensureFilled()) {
            const val = this.buffer.subarray(this.startPosition + this.position, this.startPosition + this.size);
            this.position = this.size;

            yield val;
        }
    }

    protected ensureFilled() {

        if (this.position !== this.size)
            return true;

        const { gmp, rop, base, mod, exp, block } = this;

        if (this.readOffset + BLOCK_SIZE >= this.encodedBuffer.length)
            return false;   // padding

        gmp.binding.mem.set(this.encodedBuffer.subarray(this.readOffset, this.readOffset + BLOCK_SIZE), block);
        gmp.binding.mpz_import(base, BLOCK_SIZE, 1, 1, 1, 0, block);
        gmp.binding.mpz_powm_ui(rop, base, exp, mod);

        const size = Math.ceil(gmp.binding.mpz_sizeinbase(rop, 2) / 8);
        gmp.binding.mem.fill(0, block, block + BLOCK_SIZE);
        gmp.binding.mpz_export(block + BLOCK_SIZE - size, 0, 1, 1, 1, 0, rop);
        this.buffer.set(gmp.binding.mem.subarray(block, block + BLOCK_SIZE));

        this.size = this.buffer[3] & 0xff;

        console.assert(this.size >= 0 && this.size <= (BLOCK_SIZE - 4), "Invalid block size.");

        this.startPosition = BLOCK_SIZE - this.size - (((BLOCK_SIZE - 4) - this.size) % 4);
        this.position = 0;
        this.readOffset = this.readOffset + this.startPosition + this.size;

        return true;
    }

    public decode() {
        this.ensureFilled();
        this.archiveSize = new DataView(this.buffer.buffer, this.startPosition).getUint32(0, true);
        this.position = this.position + 4;

        const inflator = new Inflate({ raw: false });

        for (let byte of this.read())
            inflator.push(byte);

        const result = inflator.result as Uint8Array;

        console.assert(result.byteLength === this.archiveSize, "Archive is damaged.");

        return result.buffer;
    }
}


function decryptRSA(modulus: string, exponent: number, gmp: import("gmp-wasm").GMPLib, buffer: Uint8Array) {
    const rsa = new RSADecoder(gmp, modulus, exponent, buffer);

    try {
        return rsa.decode();
    } finally {
        rsa.cleanup();
    }
}

export default decryptRSA;
export { decryptRSA };
