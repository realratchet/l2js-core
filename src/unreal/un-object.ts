import BufferValue from "../buffer-value";
import UExport from "./un-export";
import ObjectFlags_T from "./un-object-flags";
import UPackage from "./un-package";
import PropertyTag, { UNP_PropertyTypes } from "./un-property/un-property-tag";
import * as UnContainers from "./un-property/un-containers";

abstract class UObject implements ISerializable {
    declare ["constructor"]: typeof UObject;

    public static readonly CLEANUP_NAMESPACE = true;
    public static readonly isSerializable = true;

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
        this.readStart = this.readHead = exp.offset + this.readHeadOffset;
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
            return ["Object"]

        let base = this as any;
        const dependencyChain = new Array<string>();

        do {
            dependencyChain.push(base.getConstructorName());
            base = base.__proto__;

        } while (base !== UObject);

        dependencyChain.push("Object");

        return dependencyChain.reverse();
    }

    /*
    NOTE: read Vector, Rotator, Color structs always as binary, or if archive version is 0x1C
     */

    protected readNamedProps(pkg: UPackage) {
        pkg.seek(this.readHead, "set");

        if (this.objectName === "Exp_NMovableSunLight0")
            debugger;

        if (this.readHead < this.readTail) {
            do {
                const tag = PropertyTag.from(pkg, this.readHead);

                if (this.objectName === "Exp_NMovableSunLight0") {
                    console.log(tag);
                    debugger;
                }

                if (!tag.isValid()) break;

                this.loadProperty(pkg, tag);

                this.readHead = pkg.tell();

            } while (this.readHead < this.readTail);
        }

        if (this.objectName === "Exp_NMovableSunLight0")
            debugger;

        this.readHead = pkg.tell();
    }

    protected getPropertyVarName(tag: PropertyTag) { return tag.name; }
    protected isValidProperty(varName: string) { return this.propertyDict.has(varName); }

    protected getPropertyMap() { return {}; }

    protected propertyDict = new Map<string, any>();

    // protected setProperty(tag: PropertyTag, value: any) {
    //     const varName = this.getPropertyVarName(tag);
    //     const { name: propName, arrayIndex } = tag;

    //     if (!varName)
    //         throw new Error(`Unrecognized property '${propName}' for '${this.constructor.name}' of type '${value === null ? "NULL" : typeof (value) === "object" ? value.constructor.name : typeof (value)}'`);

    //     if (!this.isValidProperty(varName))
    //         throw new Error(`Cannot map property '${propName}' -> ${varName}`);

    //     if (tag.arrayIndex < 0 || (tag.arrayIndex > 0 && tag.arrayIndex >= this.getPropCount(tag.name)))
    //         throw new Error(`Something went wrong, expected index '${tag.arrayIndex} (max: '${this.getPropCount(tag.name)}')'.`);

    //     const property = this.propertyDict.get(varName);

    //     debugger;

    //     if (property instanceof Array) { debugger; (property as Array<any>)[arrayIndex] = value; }
    //     else if (property instanceof UnContainers.EnumContainer) { debugger; property.value = value; }
    //     else this.propertyDict.set(varName, value);

    //     // console.log(`Setting '${this.constructor.name}' property: ${propName}[${arrayIndex}] -> ${typeof (value) === "object" && value !== null ? value.constructor.name : value}`);

    //     return true;
    // }

    public loadSelf() {
        if (!this.pkg || !this.pkg)
            return this;

        return this.load(this.pkg, this.exp);
    }

    // protected readByteProperty(pkg: UPackage, tag: PropertyTag) { debugger; this.setProperty(tag, pkg.read(new BufferValue(BufferValue.uint8)).value); }
    // protected readIntProperty(pkg: UPackage, tag: PropertyTag) { debugger; this.setProperty(tag, pkg.read(new BufferValue(BufferValue.int32)).value); }
    // protected readFloatProperty(pkg: UPackage, tag: PropertyTag) { debugger; this.setProperty(tag, pkg.read(new BufferValue(BufferValue.float)).value); }
    // protected readBoolProperty(pkg: UPackage, tag: PropertyTag) { debugger; this.setProperty(tag, tag.boolValue); }
    // protected readObjectProperty(pkg: UPackage, tag: PropertyTag) { debugger; this.setProperty(tag, pkg.read(new BufferValue(BufferValue.compat32)).value); }
    // protected readNameProperty(pkg: UPackage, tag: PropertyTag) { debugger; this.setProperty(tag, pkg.nameTable[pkg.read(new BufferValue(BufferValue.compat32)).value].name); }
    // protected readStrProperty(pkg: UPackage, tag: PropertyTag) { debugger; this.setProperty(tag, pkg.read(new BufferValue(BufferValue.char)).value); }
    // protected readStringProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    // protected readArrayProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); }
    // protected readClassProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    // protected readVectorProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    // protected readRotatorProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    // protected readMapProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    // protected readFixedProperty(pkg: UPackage, tag: PropertyTag) { debugger; throw new Error("Not yet implemented"); } // Never used?
    // protected readStructProperty(pkg: UPackage, tag: PropertyTag): any {

    //     debugger;

    //     const core = pkg.loader.getPackage("core", "Script");
    //     const native = pkg.loader.getPackage("native", "Script");

    //     const expStruct = core.fetchObjectByType<UStruct>("Struct", tag.structName);
    //     const StructConstructor = expStruct.buildClass<UStruct>(native);

    //     const struct = new StructConstructor();

    //     switch (tag.structName) {
    //         case "Color": return struct.load(pkg);
    //         case "Scale": return struct.load(pkg);
    //         case "Vector": return struct.load(pkg);
    //         case "Rotator": return struct.load(pkg);
    //     }

    //     throw new Error("Not yet implemented");
    // }

    protected loadNative(pkg: UPackage) {

        for (const [propName, propVal] of this.propertyDict.entries()) {
            if (propVal instanceof BufferValue) {
                pkg.read(propVal);
            } else if (propVal instanceof UObject) {
                propVal.load(pkg);
            } else if (propVal instanceof UnContainers.EnumContainer) {
                propVal.load(pkg);
            } else if (propVal instanceof UnContainers.ObjectContainer) {
                propVal.load(pkg);
            } else {
                debugger;
                throw new Error("Not implemented");
            }
        }

        this.isLoading = false;
        this.isReady = true;

        return this;
    }

    protected copy(other: UObject) {
        if (this.constructor !== other.constructor)
            throw new Error(`'${this.constructor.name}' !== '${other.constructor.name}'`);

        for (const [name, val] of other.propertyDict.entries())
            this.propertyDict.get(name).copy(val);
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

        if (property instanceof BufferValue) {
            pkg.read(property);
        } else if (property instanceof UnContainers.BoolContainer) {
            property.value = tag.boolValue;
        } else if (property instanceof UnContainers.ObjectContainer) {
            property.load(pkg);
        } else if (property instanceof UObject) {
            if (tag.type === UNP_PropertyTypes.UNP_StructProperty) property.load(pkg);
            else property.load(pkg, tag);
        } else if (property instanceof UnContainers.NameContainer) {
            property.load(pkg);
        } else {
            debugger;
        }

        // debugger;

        // debugger;
        // const offStart = pkg.tell();
        // const offEnd = offStart + tag.dataSize;

        // switch (tag.type) {
        //     case UNP_PropertyTypes.UNP_ByteProperty: this.readByteProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_IntProperty: this.readIntProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_BoolProperty: this.readBoolProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_FloatProperty: this.readFloatProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_ObjectProperty: this.readObjectProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_NameProperty: this.readNameProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_StrProperty: this.readStrProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_StringProperty: this.readStringProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_ArrayProperty: this.readArrayProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_ClassProperty: this.readClassProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_VectorProperty: this.readVectorProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_RotatorProperty: this.readRotatorProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_MapProperty: this.readMapProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_FixedArrayProperty: this.readFixedProperty(pkg, tag); break;
        //     case UNP_PropertyTypes.UNP_StructProperty: this.readStructProperty(pkg, tag); break;
        //     default:
        //         pkg.seek(tag.dataSize);
        //         console.warn(`Unknown data type '${tag.type}' for '${tag.name}' skipping ${tag.dataSize} bytes.`);
        //         break;
        // }


        if (pkg.tell() < offEnd)
            console.warn(`Unread '${tag.name}' ${offEnd - pkg.tell()} bytes (${((offEnd - pkg.tell()) / 1024).toFixed(2)} kB) for package '${pkg.path}'`);

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

        if (flags & ObjectFlags_T.HasStack) {
            debugger;
        }

        if (this.exp.objectName === "Location") {
            console.log(this)
            console.log(this.objectFlags);
            console.log(this.propertyFlags);
            debugger;
        }

        if (this.exp.objectName === "Region") {
            console.log(this)
            console.log(this.objectFlags);
            console.log(this.propertyFlags);
            debugger;
        }

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

            this.readHeadOffset = pkg.tell() - offset;
        }

        this.setReadPointers(exp);
    }

    public load(pkg: UPackage): this;
    public load(pkg: UPackage, info: UExport): this;
    public load(pkg: UPackage, info: PropertyTag): this;
    public load(pkg: UPackage, info?: any) {
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

    // public load(pkg: UPackage, exp?: UExport): this {
    //     if (this.isLoading || this.isReady)
    //         return this;

    //     this.isLoading = true;

    //     // if (exp.objectName === "DefaultTexture")
    //     //     debugger;

    //     this.preLoad(pkg, exp);

    //     if (!isFinite(this.readHead))
    //         debugger;

    //     if (!isFinite(this.readTail))
    //         debugger;

    //     if ((this.readTail - this.readHead) > 0) {
    //         this.doLoad(pkg, exp);
    //         this.postLoad(pkg, exp);
    //     }

    //     this.isLoading = false;
    //     this.isReady = true;

    //     return this;
    // }

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



export default UObject;
export { UObject };