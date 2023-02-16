import BufferValue from "../buffer-value";
import ObjectFlags_T from "./un-object-flags";
import * as UnProperties from "./un-properties";
import PropertyTag, { UNP_PropertyTypes } from "./un-property-tag";

abstract class UObject {
    public static CLEANUP_NAMESPACE = true;

    public readonly isObject = true;
    public skipRemaining: boolean = false;

    public objectName = "Exp_None";
    public exportIndex?: number = null;
    public exp?: UExport = null;

    protected readHeadOffset = 0;

    protected readHead: number = NaN;
    protected readStart: number = NaN;
    protected readTail: number = NaN;

    protected isLoading = false;
    protected isReady = false;

    protected pkg: UPackage;

    protected setReadPointers(exp: UExport) {
        this.readStart = this.readHead = exp.offset as number + this.readHeadOffset;
        this.readTail = this.readHead + (exp.size as number);
    }

    public get byteCount() { return this.readTail - this.readStart; }
    public get bytesUnread() { return this.readTail - this.readHead; }
    public get byteOffset() { return this.readHead - this.readStart; }

    protected readNamedProps(pkg: UPackage) {
        pkg.seek(this.readHead, "set");

        if (this.readHead < this.readTail) {
            do {
                const tag = PropertyTag.from(pkg, this.readHead);

                if (!tag.isValid()) break;

                this.loadProperty(pkg, tag);

                this.readHead = pkg.tell();

            } while (this.readHead < this.readTail);

        }

        this.readHead = pkg.tell();
    }

    protected getPropertyVarName(tag: PropertyTag) { return tag.name; }
    protected isValidProperty(varName: string) { return true; }

    protected setProperty(tag: PropertyTag, value: any) {
        const varName = this.getPropertyVarName(tag);
        const { name: propName, arrayIndex } = tag;

        if (!varName)
            throw new Error(`Unrecognized property '${propName}' for '${this.constructor.name}' of type '${value === null ? "NULL" : typeof (value) === "object" ? value.constructor.name : typeof (value)}'`);

        if (!this.isValidProperty(varName))
            throw new Error(`Cannot map property '${propName}' -> ${varName}`);

        if (tag.arrayIndex < 0 || (tag.arrayIndex > 0 && tag.arrayIndex >= this.getPropCount(tag.name)))
            throw new Error(`Something went wrong, expected index '${tag.arrayIndex} (max: '${this.getPropCount(tag.name)}')'.`);

        if ((this as any)[varName] instanceof Array) ((this as any)[varName] as Array<any>)[arrayIndex] = value;
        else if ((this as any)[varName] instanceof Set) ((this as any)[varName] as Set<any>).add(value);
        else if ((this as any)[varName] instanceof EnumeratedValue) (this as any)[varName].value = value;
        else (this as any)[varName] = value;

        // console.log(`Setting '${this.constructor.name}' property: ${propName}[${arrayIndex}] -> ${typeof (value) === "object" && value !== null ? value.constructor.name : value}`);

        return true;
    }


    protected readByteProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, pkg.read(new BufferValue(BufferValue.uint8)).value as number); }
    protected readIntProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, pkg.read(new BufferValue(BufferValue.int32)).value as number); }
    protected readFloatProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, pkg.read(new BufferValue(BufferValue.float)).value as number); }
    protected readBoolProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, tag.boolValue); }
    protected readObjectProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, pkg.read(new BufferValue(BufferValue.compat32)).value as number); }
    protected readNameProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, pkg.nameTable[pkg.read(new BufferValue(BufferValue.compat32)).value as number].name); }
    protected readStrProperty(pkg: UPackage, tag: PropertyTag) { this.setProperty(tag, pkg.read(new BufferValue(BufferValue.char)).value as number); }
    protected readStringProperty(pkg: UPackage, tag: PropertyTag) { throw new Error("Not yet implemented"); } // Never used?
    protected readArrayProperty(pkg: UPackage, tag: PropertyTag) { throw new Error("Not yet implemented"); }
    protected readClassProperty(pkg: UPackage, tag: PropertyTag) { throw new Error("Not yet implemented"); } // Never used?
    protected readVectorProperty(pkg: UPackage, tag: PropertyTag) { throw new Error("Not yet implemented"); } // Never used?
    protected readRotatorProperty(pkg: UPackage, tag: PropertyTag) { throw new Error("Not yet implemented"); } // Never used?
    protected readMapProperty(pkg: UPackage, tag: PropertyTag) { throw new Error("Not yet implemented"); } // Never used?
    protected readFixedProperty(pkg: UPackage, tag: PropertyTag) { throw new Error("Not yet implemented"); } // Never used?
    protected readStructProperty(pkg: UPackage, tag: PropertyTag) { throw new Error("Not yet implemented"); }

    protected loadProperty(pkg: UPackage, tag: PropertyTag) {
        const offStart = pkg.tell();
        const offEnd = offStart + tag.dataSize;

        switch (tag.type) {
            case UNP_PropertyTypes.UNP_ByteProperty: this.readByteProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_IntProperty: this.readIntProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_BoolProperty: this.readBoolProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_FloatProperty: this.readFloatProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_ObjectProperty: this.readObjectProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_NameProperty: this.readNameProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_StrProperty: this.readStrProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_StringProperty: this.readStringProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_ArrayProperty: this.readArrayProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_ClassProperty: this.readClassProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_VectorProperty: this.readVectorProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_RotatorProperty: this.readRotatorProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_MapProperty: this.readMapProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_FixedArrayProperty: this.readFixedProperty(pkg, tag); break;
            case UNP_PropertyTypes.UNP_StructProperty: this.readStructProperty(pkg, tag); break;
            default:
                pkg.seek(tag.dataSize);
                console.warn(`Unknown data type '${tag.type}' for '${tag.name}' skipping ${tag.dataSize} bytes.`);
                break;
        }

        pkg.seek(offEnd, "set");

        if (pkg.tell() < offEnd)
            console.warn(`Unread '${tag.name}' ${offEnd - pkg.tell()} bytes (${((offEnd - pkg.tell()) / 1024).toFixed(2)} kB) for package '${pkg.path}'`);
    }

    public setExport(pkg: UPackage, exp: UExport) {
        this.objectName = `Exp_${exp.objectName}`;
        this.exportIndex = exp.index;
        this.exp = exp;
        this.pkg = pkg.asReadable();
    }

    protected preLoad(pkg: UPackage, exp: UExport): void {
        const flags = exp.flags as number;

        if (!this.exp)
            this.setExport(pkg, exp);

        pkg.seek(exp.offset as number, "set");

        if (flags & ObjectFlags_T.HasStack && exp.size > 0) {
            const offset = pkg.tell();
            const compat32 = new BufferValue(BufferValue.compat32);
            const int64 = new BufferValue(BufferValue.int64);
            const int32 = new BufferValue(BufferValue.int32);

            const node = pkg.read(compat32).value as number;
            /*const stateNode =*/ pkg.read(compat32).value as number;
            /*const probeMask =*/ pkg.read(int64).value as number;
            /*const latentAction =*/ pkg.read(int32).value as number;

            if (node !== 0) {
                /*const offset =*/ pkg.read(compat32).value as number;
            }

            this.readHeadOffset = pkg.tell() - offset;
        }

        this.setReadPointers(exp);
    }

    public load(pkg: UPackage, exp: UExport): this {
        if (this.isLoading || this.isReady)
            return this;

        this.isLoading = true;

        // if (exp.objectName === "DefaultTexture")
        //     debugger;

        this.preLoad(pkg, exp);

        if (!isFinite(this.readHead))
            debugger;

        if (!isFinite(this.readTail))
            debugger;

        if ((this.readTail - this.readHead) > 0) {
            this.doLoad(pkg, exp);
            this.postLoad(pkg, exp);
        }

        this.isLoading = false;
        this.isReady = true;

        return this;
    }

    protected doLoad(pkg: UPackage, exp: UExport): void { this.readNamedProps(pkg); }

    protected postLoad(pkg: UPackage, exp: UExport): void {
        this.readHead = pkg.tell();

        if (this.skipRemaining) this.readHead = this.readTail;
        if (this.bytesUnread > 0 && this.bytesUnread !== this.readHeadOffset && this.careUnread) {
            const constructorName = (this.constructor as any).isDynamicClass ? `${(this.constructor as any).friendlyName}[Dynamic]` : this.constructor.name;
            console.warn(`Unread '${this.objectName}' (${constructorName}) ${this.bytesUnread} bytes (${((this.bytesUnread) / 1024).toFixed(2)} kB) in package '${pkg.path}'`);
        }

        if (UObject.CLEANUP_NAMESPACE) {
            Object.values(this.getPropertyMap()).forEach(propName => {
                if ((this as any)[propName] === undefined)
                    delete (this as any)[propName];
            });
        }
    }
}

class EnumeratedValue {
    public value: number;
    protected enumerations: Readonly<string[]>;

    constructor(value: number, enumerations: string[]) {
        this.value = value;
        this.enumerations = Object.freeze(enumerations);

        Object.seal(this);
    }

    valueOf(): number { return this.value; }
    toString() {
        return isFinite(this.value) && this.value < this.enumerations.length ? this.enumerations[this.value] : `<invalid '${this.value}'>`;
    }
}

export default UObject;
export { UObject, EnumeratedValue };