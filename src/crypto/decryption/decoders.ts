import * as rsaKeys from "../keys/rsa";
import { decryptRSA as _decryptRSA } from "./decrypt-rsa";
import { decryptModulo as _decryptModulo } from "./decrypt-modulo";

function isBlockKey([modulus, exponent]: rsaKeys.RSAKey, buffer: Uint8Array) {
    const n = BigInt(`0x${modulus}`);
    let base = BigInt(`0x${Array.from(buffer.subarray(0, 128), x => x.toString(16).padStart(2, "0")).join("")}`) % n, result = BigInt(1);

    for (let e = exponent; e > 0; e >>= 1, base = base * base % n)
        if (e & 1) result = result * base % n;

    return result < BigInt(125) << BigInt(992); // right key gives a block of three zero bytes then size <= 124
}

function decryptRSA(gmp: import("gmp-wasm").GMPLib, buffer: Uint8Array): ArrayBuffer {
    const key = Object.values(rsaKeys.keys).find(key => isBlockKey(key, buffer));

    if (!key) throw new Error(`No known RSA key decrypts this file.`);

    return _decryptRSA(key[0], key[1], gmp, buffer);
}

function decryptModulo(array: Uint8Array, key: number): ArrayBuffer {
    return _decryptModulo(array, key);
}

export { decryptModulo, decryptRSA };