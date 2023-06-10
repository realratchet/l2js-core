import UStruct from "./un-struct";
import BufferValue from "../buffer-value";
import { flagBitsToDict } from "../utils/flags";

abstract class UState extends UStruct {
    protected probeMask: bigint;
    protected ignoreMask: bigint;
    protected _stateFlags: number;
    protected labelTableOffset: number;
    protected probes: string[];
    protected stateFlags: Record<string, boolean>;

    public readonly isState = true;

    protected static getConstructorName() { return "State"; }
    public toString() { return `State[${this.friendlyName}]`; }

    protected doLoad(pkg: C.AUPackage, exp: C.UExport<C.UObject>): void {
        super.doLoad(pkg, exp);

        this.readHead = pkg.tell();

        const uint64 = new BufferValue(BufferValue.uint64);
        const uint32 = new BufferValue(BufferValue.uint32);
        const uint16 = new BufferValue(BufferValue.uint16);

        // if (exp.objectName === "Pawn")
        //     debugger;

        this.probeMask = pkg.read(uint64).value;
        this.ignoreMask = pkg.read(uint64).value;
        this._stateFlags = pkg.read(uint32).value;
        this.stateFlags = flagBitsToDict(this._stateFlags, EStateFlags as any);

        this.labelTableOffset = pkg.read(uint16).value;

        // debugger;

        // if (exp.objectName === "Pawn")
        //     debugger;
    }
}

export default UState;
export { UState };


enum EStateFlags {
    // State flags.
    STATE_Editable = 0x00000001,	// State should be user-selectable in UnrealEd.
    STATE_Auto = 0x00000002,	// State is automatic (the default state).
    STATE_Simulated = 0x00000004,   // State executes on client side.
};