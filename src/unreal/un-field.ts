import BufferValue from "../buffer-value";
import UObject from "./un-object";

abstract class UField extends UObject {
    public superFieldId: number = 0;
    public nextFieldId: number = 0;
    public _superField: UField;
    public _nextField: UField;

    public readonly isField = true;
    protected static getConstructorName() { return "Field"; }

    protected doLoad(pkg: UPackage, exp: UExport): void {
        // if (exp.objectName === "Pawn")
        //     debugger;

        if (this.constructor.name !== "UClass")
            super.doLoad(pkg, exp);

        const compat32 = new BufferValue(BufferValue.compat32);

        this.superFieldId = pkg.read(compat32).value;
        this.nextFieldId = pkg.read(compat32).value;

        // this.loadSuperfields();
    }

    protected collectDependencies<T extends UField = typeof this>() {
        const dependencyTree = [];
        let base = this as unknown as T;

        do {
            dependencyTree.push(base);

            base = base.superField as T;

        } while (base);

        return dependencyTree;
    }

    public get superField() {
        if (this._superField !== undefined)
            return this._superField;

        let lastBase: UField = this.loadSelf();

        do {
            if (this.superFieldId !== 0)
                this._superField = this.pkg.fetchObject<UField>(this.superFieldId);
            else
                this._superField = null;

            lastBase = lastBase._superField?.loadSelf() as UClass;
        } while (lastBase);

        return this._superField;
    }

    public get nextField() {
        if (this._nextField !== undefined)
            return this._nextField;

        let lastBase: UField = this.loadSelf();

        do {
            if (this.nextFieldId !== 0)
                this._nextField = this.pkg.fetchObject<UField>(this.nextFieldId);
            else
                this._nextField = null;

            lastBase = lastBase._nextField?.loadSelf() as UClass;
        } while (lastBase);

        return this._nextField;
    }
}

export default UField;
export { UField };