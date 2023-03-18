import BufferValue from "../buffer-value";
import UExport from "./un-export";
import ObjectFlags_T from "./un-object-flags";
import UPackage from "./un-package";
import PropertyTag from "./un-property/un-property-tag";


abstract class UObject implements ISerializable {
    declare ["constructor"]: typeof UObject;

    public static readonly CLEANUP_NAMESPACE = true;
    public static readonly isSerializable = true;

    public readonly isObject = true;

    public objectName = "Exp_None";
    public exportIndex?: number = null;
    public exp?: UExport = null;

    protected skipRemaining = false;
    protected careUnread = true;

    protected readHead: number = NaN;
    protected readStart: number = NaN;
    protected readTail: number = NaN;

    protected isLoading = false;
    protected isReady = false;

    protected pkg: UPackage;
    protected propertyDict = new Map<string, UProperty>();

    protected setReadPointers(exp: UExport) {
        this.readStart = this.readHead = exp.offset;
        this.readTail = this.readHead + exp.size;
    }

    public get byteCount() { return this.readTail - this.readStart; }
    public get bytesUnread() { return this.readTail - this.readHead; }
    public get byteOffset() { return this.readHead - this.readStart; }

    public get objectFlags() { return this.exp ? this.exp.objectFlags : {} };

    protected static getConstructorName(): string {
        debugger;
        throw new Error("Must be implemented by inheriting class because JS does not support inheritence chain.");
    }

    public static get inheritenceChain() {
        if (this === UObject)
            return ["Object"];

        let base = this as any;
        const dependencyChain = new Array<string>();

        do {
            dependencyChain.push(base.getConstructorName());
            base = base.__proto__;

        } while (base !== UObject);

        dependencyChain.push("Object");

        return dependencyChain.reverse();
    }

    protected readNamedProps(pkg: UPackage, _exp: UExport) {
        pkg.seek(this.readHead, "set");


        if (this.readHead < this.readTail) {
            do {
                // if (_exp.objectName === "NMovableSunLight0")
                //     debugger;

                const tag = PropertyTag.from(pkg, this.readHead);

                // if (this.exp.objectName.includes("NMovableSunLight")) {
                //     console.log(`${this.exp.objectName} -> ${tag.name} ${this.readHead - this.readStart} of ${this.byteCount}`);

                //     if (!tag.isValid())
                //         debugger;

                // }

                if (!tag.isValid()) break;

                this.loadProperty(pkg, tag);

                this.readHead = pkg.tell();

            } while (this.readHead < this.readTail);
        }

        this.readHead = pkg.tell();
    }

    protected getPropertyVarName(tag: PropertyTag) { return tag.name; }
    protected isValidProperty(varName: string) { return this.propertyDict.has(varName) ? this.propertyDict.get(varName) : null; }

    protected getPropertyMap() { return {}; }



    public loadSelf() {
        if (!this.pkg || !this.pkg)
            return this;

        return this.load(this.pkg, this.exp);
    }

    protected loadNative(pkg: UPackage) {
        for (const [propName, propVal] of this.propertyDict.entries())
            propVal.readProperty(pkg, null);

        this.isLoading = false;
        this.isReady = true;

        return this;
    }

    protected copy(other: UObject): this {
        if (this.constructor !== other.constructor)
            throw new Error(`'${this.constructor.name}' !== '${other.constructor.name}'`);

        for (const [name, val] of other.propertyDict.entries())
            this.propertyDict.get(name).copy(val);

        return this;
    }

    protected loadProperty(pkg: UPackage, tag: PropertyTag) {
        const offStart = pkg.tell();
        const offEnd = offStart + tag.dataSize;

        const varName = this.getPropertyVarName(tag);
        const { name: propName, arrayIndex } = tag;

        if (!varName)
            throw new Error(`Unrecognized property '${propName}' for '${this.constructor.name}' of type '${tag.getTypeName()}'`);

        if (!this.isValidProperty(varName))
            throw new Error(`Cannot map property '${propName}' -> ${varName}`);

        const property = this.propertyDict.get(varName);

        if (property.isSet)
            debugger;

        if (property.arrayDimensions !== 1 || tag.arrayIndex !== 0)
            debugger;

        property.readProperty(pkg, tag);

        if (pkg.tell() < offEnd)
            console.warn(`Unread '${tag.name}' ${offEnd - pkg.tell()} bytes (${((offEnd - pkg.tell()) / 1024).toFixed(2)} kB) for package '${pkg.path}'`);

        if (pkg.tell() > offEnd)
            throw new Error(`Reader exceeded by '${tag.name}' ${offEnd - pkg.tell()} bytes (${((offEnd - pkg.tell()) / 1024).toFixed(2)} kB) for package '${pkg.path}'`);


        pkg.seek(offEnd, "set");
    }

    public setExport(pkg: UPackage, exp: UExport) {
        this.objectName = `Exp_${exp.objectName}`;
        this.exportIndex = exp.index;
        this.exp = exp;
        this.pkg = pkg.asReadable();
    }

    protected preLoad(pkg: UPackage, exp: UExport): void {
        const flags = exp.flags;

        if (!this.exp)
            this.setExport(pkg, exp);

        pkg.seek(exp.offset, "set");
        this.setReadPointers(exp);

        if (flags & ObjectFlags_T.HasStack && exp.size > 0) {

            const offset = pkg.tell();
            const compat32 = new BufferValue(BufferValue.compat32);
            const int64 = new BufferValue(BufferValue.int64);
            const int32 = new BufferValue(BufferValue.int32);

            const nodeId = pkg.read(compat32).value;
            const stateNodeId = pkg.read(compat32).value;

            const node = pkg.fetchObject(nodeId);
            const stateNode = pkg.fetchObject(stateNodeId);

            const probeMask = pkg.read(int64).value;
            const latentAction = pkg.read(int32).value;

            if (node !== null) {
                const offset = pkg.read(compat32).value;

                if (offset !== -1) {
                    debugger;
                }
            }
        }

       this.readHead = pkg.tell();
    }

    public load(pkg: UPackage): this;
    public load(pkg: UPackage, info: UExport): this;
    public load(pkg: UPackage, info: PropertyTag): this;
    public load(pkg: UPackage, info?: any) {
        // if (info?.objectName === "NMovableSunLight0")
        //     debugger;

        if (info instanceof UExport)
            return this.loadWithExport(pkg, info);

        if (info instanceof PropertyTag)
            return this.loadWithPropertyTag(pkg, info);

        return this.loadNative(pkg);
    }

    protected loadWithPropertyTag(pkg: UPackage, tag: PropertyTag): this {
        const exp = new UExport();

        exp.objectName = `${tag.name}[Struct]`;
        exp.offset = pkg.tell();
        exp.size = tag.dataSize;
        exp.isFake = true;

        return this.loadWithExport(pkg, exp);
    }

    protected loadWithExport(pkg: UPackage, exp: UExport): this {
        if (this.isLoading || this.isReady)
            return this;

        this.isLoading = true;

        if (this.isReady)
            debugger;

        this.preLoad(pkg, exp);

        if (!isFinite(this.readHead))
            debugger;

        if (!isFinite(this.readTail))
            debugger;

        if (this.isReady)
            debugger;

        if ((this.readTail - this.readHead) > 0) {
            this.doLoad(pkg, exp);
            this.postLoad(pkg, exp);
        }

        this.isLoading = false;
        this.isReady = true;

        return this;
    }

    protected doLoad(pkg: UPackage, exp: UExport): void { this.readNamedProps(pkg, exp); }

    protected postLoad(pkg: UPackage, exp: UExport): void {
        this.readHead = pkg.tell();

        if (this.skipRemaining) this.readHead = this.readTail;
        if (this.bytesUnread > 0 && this.careUnread) {
            debugger;
            const constructorName = (this.constructor as any).isDynamicClass ? `${(this.constructor as any).friendlyName}[Dynamic]` : this.constructor.name;
            console.warn(`Unread '${this.objectName}' (${constructorName}) ${this.bytesUnread} bytes (${((this.bytesUnread) / 1024).toFixed(2)} kB) in package '${pkg.path}'`);
        }

        if (UObject.CLEANUP_NAMESPACE) {
            // Object.values(this.getPropertyMap()).forEach(propName => {
            //     if ((this as any)[propName] === undefined)
            //         delete (this as any)[propName];
            // });
        }
    }
}



export default UObject;
export { UObject };