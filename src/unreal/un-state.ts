import UStruct from "./un-struct";
import BufferValue from "../buffer-value";

abstract class UState extends UStruct {
    protected probeMask: bigint;
    protected ignoreMask: bigint;
    protected stateFlags: number;
    protected labelTableOffset: number;
    protected probes: string[];

    public readonly isState = true;

    protected static getConstructorName() { return "State"; }

    protected doLoad(pkg: UPackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        this.readHead = pkg.tell();

        const uint64 = new BufferValue(BufferValue.uint64);
        const uint32 = new BufferValue(BufferValue.uint32);
        const uint16 = new BufferValue(BufferValue.uint16);

        this.probeMask = pkg.read(uint64).value;
        this.ignoreMask = pkg.read(uint64).value;
        this.stateFlags = pkg.read(uint32).value;
        this.labelTableOffset = pkg.read(uint16).value;
    }
}

export default UState;
export { UState };