import * as modKeys from "../keys/modulo";
import { decryptModulo as decryptModulo } from "../decryption/decrypt-modulo";

function encryptModulo(array: Uint8Array, key: number) {
    return decryptModulo(array, modKeys.modulo ^ key);
}

export { encryptModulo };