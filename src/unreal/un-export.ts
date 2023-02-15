import * as FlagUtils from "../utils/flags";
import ObjectFlags_T from "./un-object-flags";

class UExport {
    public index: number;

    public idClass: number;
    public idSuper: number;
    public idPackage: number;

    public idObjectName: number;
    public objectName: string = "None";

    public _flags: ObjectFlags_T;
    public objectFlags: Readonly<Record<ObjectFlags_T, boolean>>;

    public size: number;
    public offset: number;

    public allFlags(flags: ObjectFlags_T): boolean { return FlagUtils.allFlags(this.flags, flags); }
    public anyFlags(flags: ObjectFlags_T): boolean { return FlagUtils.anyFlags(this.flags, flags); }

    get flags() { return this._flags; }
    set flags(flags: number) {
        this._flags = flags;
        this.objectFlags = Object.freeze(FlagUtils.flagBitsToDict(flags, ObjectFlags_T as any));
    }

    public toString() { return `Export(id=${this.index + 1}, name=${this.objectName}, flags=[${Object.entries(this.objectFlags).filter(([, v]) => v).map(([k,]) => k).join(",")}])`; }
}

export default UExport;
export { UExport };