import UStruct from "./un-struct";
import BufferValue from "../buffer-value";
import { flagBitsToDict } from "../utils/flags";

abstract class UState<Class extends C.UObject = C.UObject> extends UStruct<Class> {
    protected probeMask: bigint;
    protected ignoreMask: bigint;
    protected _stateFlags: number;
    protected labelTableOffset: number;
    protected probes: string[];
    protected stateFlags: C.FlagDict<EnumKeys.EStateFlags_T>;

    public readonly isState = true;

    protected static getConstructorName() { return "State"; }
    public toString() { return `State[${this.friendlyName}]`; }

    protected doLoad(pkg: C.APackage, exp: C.UExport<C.UObject>): void {
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
        this.stateFlags = flagBitsToDict(this._stateFlags, EStateFlags_T);

        this.labelTableOffset = pkg.read(uint16).value;

        // debugger;

        // if (exp.objectName === "Pawn")
        //     debugger;
    }
}

enum EStateFlags_T {
    // State flags.
    STATE_Editable = 0x00000001,	// State should be user-selectable in UnrealEd.
    STATE_Auto = 0x00000002,	// State is automatic (the default state).
    STATE_Simulated = 0x00000004,   // State executes on client side.
};

export default UState;
export { UState, EStateFlags_T };


