class BufferStream extends ArrayBuffer {
    public bytesLoaded: number;

    public constructor();
    public constructor(byteLength: number);
    public constructor(byteLength: number, bytesLoaded: number);

    public constructor() {
        let byteLength: number, bytesLoaded: number;

        if (arguments.length === 0) byteLength = bytesLoaded = 0;
        else if (arguments.length === 1) byteLength = byteLength = arguments[0];
        else if (arguments.length === 2) ([byteLength, bytesLoaded] = arguments);
        else throw new Error(`unknown parameters: ${arguments}`);

        super(byteLength);

        this.bytesLoaded = bytesLoaded;
    }

    public static async initialize(path: string): Promise<BufferStream> {
        const response = await fetch(path);

        if (!response.ok) throw new Error(response.statusText);

        const buffer = await response.arrayBuffer();

        Object.setPrototypeOf(buffer, BufferStream.prototype);
    
        const stream = buffer as BufferStream;
        stream.bytesLoaded = stream.byteLength;
    
        return stream;
    }
}

export default BufferStream;
export { BufferStream };