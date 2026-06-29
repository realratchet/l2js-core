import type BufferStream from "../../buffer-stream";

function decryptModulo(array: Uint8Array, cryptKey: number): BufferStream {
    for (let i = 0, len = array.length; i < len; i++)
        array[i] ^= cryptKey;

    return array.buffer as BufferStream;
}

export default decryptModulo;
export { decryptModulo };