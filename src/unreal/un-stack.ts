import BufferValue from "../buffer-value";
import UPackage from "./un-package";

class UStack {

    public nodeId: number;
    public stateNodeId: number;
    public probeMask: bigint;
    public latentAction: number;
    public offset: number;

    private constructor() { }

    public static loadStack(pkg: UPackage) {
        const compat32 = new BufferValue(BufferValue.compat32);
        const int64 = new BufferValue(BufferValue.int64);
        const int32 = new BufferValue(BufferValue.int32);

        const stack = new UStack();

        stack.nodeId = pkg.read(compat32).value;
        stack.stateNodeId = pkg.read(compat32).value;

        stack.probeMask = pkg.read(int64).value;
        stack.latentAction = pkg.read(int32).value;

        if (stack.nodeId !== 0) {
            stack.offset = pkg.read(compat32).value;
        }

        return stack;
    }
}

export default UStack;
export { UStack };