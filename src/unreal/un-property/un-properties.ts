import BufferValue from "../../buffer-value";
import { flagBitsToDict } from "../../utils/flags";
import FArray, { FObjectArray, FPrimitiveArray } from "../un-array";
import UClass from "../un-class";
import UField from "../un-field";
import UPackage from "../un-package";
import PropertyTag from "./un-property-tag";

abstract class UProperty<T1 = any, T2 = T1> extends UField {
    // declare ["constructor"]: typeof UProperty;

    public arrayDimensions: number;
    public propertyName: string;
    public propertyFlags: Readonly<Record<string, boolean>>;

    public isSet = false;
    public isDefault = false;

    protected flags: number;
    protected replicationOffset: number;
    protected categoryNameId: number;
    protected categoryName: string;

    protected propertyValue: T1[];

    // public readonly isNumericType: boolean = false;

    protected preLoad(pkg: UPackage, exp: UExport): void {
        super.preLoad(pkg, exp);

        this.propertyName = exp.objectName;
    }

    protected doLoad(pkg: UPackage, exp: UExport): void {
        super.doLoad(pkg, exp);

        this.readHead = pkg.tell();

        const uint32 = new BufferValue(BufferValue.uint32);
        const uint16 = new BufferValue(BufferValue.uint16);
        const compat32 = new BufferValue(BufferValue.compat32);

        this.arrayDimensions = pkg.read(uint32).value;
        this.flags = pkg.read(uint32).value;
        this.propertyFlags = Object.freeze(flagBitsToDict(this.flags, PropertyFlags_T as any));

        this.categoryNameId = pkg.read(compat32).value;
        this.categoryName = pkg.nameTable[this.categoryNameId].name as string;

        if (this.flags & PropertyFlags_T.Net)
            this.replicationOffset = pkg.read(uint16).value;

        this.propertyValue = new Array<T1>(this.arrayDimensions);

        this.readHead = pkg.tell();
    }

    public getPropertyValue(index: number = null): T2 | T2[] {
        return this.arrayDimensions === 1
            ? this.propertyValue[0] as any as T2
            : index === null
                ? this.propertyValue as any as T2[]
                : this.propertyValue[index] as any as T2;
    }

    public copy(other: UProperty<T1, T2>) {
        this.isReady = other.isReady;
        this.isLoading = other.isLoading;
        this.isDefault = other.isDefault;

        this.arrayDimensions = other.arrayDimensions;
        this.flags = other.flags;
        this.propertyFlags = other.propertyFlags;
        this.categoryNameId = other.categoryNameId;
        this.categoryName = other.categoryName;
        this.replicationOffset = other.replicationOffset;

        this.propertyValue = new Array(this.arrayDimensions);

        this.pkg = other.pkg;
        this.exp = other.exp;

        return this;
    }

    public clone() {

        const Constructor = this.constructor as any as new () => UProperty<T1, T2>;
        const clone = new Constructor();

        clone.copy(this);

        return clone;
    }

    public abstract readProperty(pkg: UPackage, tag: PropertyTag): UProperty<T1, T2>;

    public toString(className: string, classTemplate: string, value: string) {
        return `${className}${classTemplate ? `<${classTemplate}>` : ""}[${this.arrayDimensions > 1 ? value : "..."}]${this.arrayDimensions > 1 ? `(${this.arrayDimensions})` : ""}`;
    }
}

abstract class UBaseExportProperty<T1 extends UField, T2 = T1, T3 = T2> extends UProperty<T2, T3> {
    protected valueId: number;
    public _value: T1;

    public get value() {
        if (this.valueId !== 0 && !this._value)
            this._value = this.pkg.fetchObject(this.valueId);

        return this._value;
    }

    protected doLoad(pkg: UPackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        const compat32 = new BufferValue(BufferValue.compat32);

        this.valueId = pkg.read(compat32).value;
        this.readHead = pkg.tell();
    }

    public copy(other: UBaseExportProperty<T1, T2, T3>): this {
        super.copy(other);

        this.valueId = other.valueId;

        return this;
    }
}

class UObjectProperty<T extends UObject = UObject> extends UBaseExportProperty<UClass, number, T> {
    protected propertyValuePkg: UPackage;

    public readProperty(pkg: UPackage, tag: PropertyTag) {
        this.propertyName = tag.name;

        if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
            debugger;

        this.propertyValuePkg = pkg;
        this.propertyValue[tag.arrayIndex] = pkg.read(new BufferValue(BufferValue.compat32)).value;
        this.isSet = true;

        return this;
    }

    public getPropertyValue(index: number = null) {
        return this.arrayDimensions === 1
            ? this.propertyValuePkg.fetchObject<T>(this.propertyValue[0])
            : index === null
                ? this.propertyValue.map(i => this.propertyValuePkg.fetchObject<T>(i))
                : this.propertyValuePkg.fetchObject<T>(this.propertyValue[index]);
    }

    public toString() {
        const friendlyName = this.valueId === 0 ? null : (this._value?.friendlyName || "<eval>");
        const object = this.arrayDimensions === 1 ? this.propertyValue[0] === 0 ? null : (this.getPropertyValue(0).toString() || "<eval>") : null;

        return super.toString("ObjectProperty", friendlyName, object);
    }
}


class UClassProperty extends UBaseExportProperty<UClass, number, UClass> {
    protected metaClassId: number;
    protected _metaClass: UClass;

    protected propertyValuePkg: UPackage;

    public getPropertyValue(index: number = null) {
        return this.arrayDimensions === 1
            ? this.propertyValuePkg.fetchObject<UClass>(this.propertyValue[0])
            : index === null
                ? this.propertyValue.map(i => this.propertyValuePkg.fetchObject<UClass>(i))
                : this.propertyValuePkg.fetchObject<UClass>(this.propertyValue[index]);
    }

    protected doLoad(pkg: UPackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        const compat32 = new BufferValue(BufferValue.compat32);

        this.metaClassId = pkg.read(compat32).value;
        this.readHead = pkg.tell();
    }

    public get metaClass() {
        if (this.metaClassId !== 0 && !this._metaClass)
            this._metaClass = this.pkg.fetchObject(this.metaClassId);

        return this._value;
    }

    public copy(other: UClassProperty): this {
        super.copy(other);

        this.metaClassId = other.metaClassId;

        return this;
    }

    public readProperty(pkg: UPackage, tag: PropertyTag) {
        this.propertyName = tag.name;

        if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
            debugger;

        this.propertyValuePkg = pkg;
        this.propertyValue[tag.arrayIndex] = pkg.read(new BufferValue(BufferValue.compat32)).value;
        this.isSet = true;

        return this;
    }

    public toString() {
        const friendlyName = this.valueId === 0 ? null : (this._value?.friendlyName || "<eval>");
        const object = this.arrayDimensions === 1 ? this.propertyValue[0] === 0 ? null : (this.getPropertyValue(0).toString() || "<eval>") : null;

        return super.toString("ClassProperty", friendlyName, object);
    }
}

class UStructProperty<T extends UObject = UObjectProperty> extends UBaseExportProperty<UStruct, T, T> {
    public readProperty(pkg: UPackage, tag: PropertyTag) {
        this.propertyName = tag.name;

        // if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
        //     debugger;

        const native = pkg.loader.getNativePackage();
        const verArchive = pkg.header.getArchiveFileVersion();

        const Constructor = this.value.buildClass<T>(native);
        const struct = new Constructor();
        const isNative = ["Vector", "Rotator", "Color"].includes(tag.structName) || verArchive < 0x76;

        struct.load(pkg, isNative ? null : tag);

        this.propertyValue[tag.arrayIndex] = struct;
        this.isSet = true;

        return this;
    }

    public toString() {
        const friendlyName = this.valueId === 0 ? null : (this._value?.friendlyName || "<eval>");
        const object = this.arrayDimensions === 1 ? this.propertyValue[0] ? null : (this.getPropertyValue(0).toString() || "<eval>") : null;

        return super.toString("StructProperty", friendlyName, object);
    }
}

abstract class UNumericProperty<T extends NumberTypes_T | StringTypes_T> extends UProperty<ReturnType<T>, ReturnType<T>> implements IBufferValueProperty<T> {
    declare ["constructor"]: typeof UNumericProperty & { dtype: ValidTypes_T<T> };

    public readProperty(pkg: UPackage, tag: PropertyTag) {
        this.propertyName = tag?.name || null;

        if (this.arrayDimensions !== 1 || tag && tag.arrayIndex !== 0)
            debugger;

        this.propertyValue[tag?.arrayIndex || 0] = pkg.read(new BufferValue<T>(this.constructor.dtype)).value;
        this.isSet = true;

        return this;
    }

    public toString() {
        return super.toString(this.constructor.name, undefined, this.arrayDimensions === 1 ? this.propertyValue[0].toString() : null);
    }
}

class UFloatProperty extends UNumericProperty<"float"> {
    public static dtype = BufferValue.float;

    declare ["constructor"]: typeof UNumericProperty & typeof UFloatProperty;
}

class UIntProperty extends UNumericProperty<"int32"> {
    public static dtype = BufferValue.int32;

    declare ["constructor"]: typeof UNumericProperty & typeof UIntProperty;
}

class UStrProperty extends UProperty<string, string> {
    public readProperty(pkg: UPackage, tag: PropertyTag) {
        this.propertyName = tag?.name || null;

        if (this.arrayDimensions !== 1 || tag && tag.arrayIndex !== 0)
            debugger;

        if (!tag)
            debugger;

        this.propertyValue[tag.arrayIndex] = pkg.read(BufferValue.allocBytes(tag.dataSize)).string;
        this.isSet = true;

        return this;
    }

    public toString() {
        return super.toString(this.constructor.name, undefined, this.arrayDimensions === 1 ? this.propertyValue[0].toString() : null);
    }
}

class UDelegateProperty extends UProperty<any, any> {
    public readProperty(pkg: UPackage, tag: PropertyTag): UProperty<any, any> {
        throw new Error("Method not implemented.");
    }
}

class UBoolProperty extends UProperty<boolean, boolean> {
    public readProperty(_pkg: UPackage, tag: PropertyTag) {
        if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
            debugger;

        this.propertyValue[tag.arrayIndex] = tag.boolValue;

        return this;
    }

    toString() {
        return super.toString("BoolProperty", undefined, this.arrayDimensions === 1 ? this.propertyValue[0].toString() : null);
    }
}



class UNameProperty extends UProperty<number, string> {
    protected propertyValuePkg: UPackage;

    public readProperty(pkg: UPackage, tag: PropertyTag) {
        this.propertyName = tag.name;

        if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
            debugger;

        this.propertyValuePkg = pkg;
        this.propertyValue[tag.arrayIndex] = pkg.read(new BufferValue(BufferValue.compat32)).value;
        this.isSet = true;

        return this;
    }

    public getPropertyValue(index: number = null) {
        const nameTable = this.propertyValuePkg.nameTable;

        return this.arrayDimensions === 1
            ? nameTable[this.propertyValue[0]].name
            : index === null
                ? this.propertyValue.map(i => nameTable[i].name)
                : nameTable[this.propertyValue[index]].name;
    }

    public toString() {
        const object = this.arrayDimensions === 1 ? this.propertyValue[0] === 0 ? null : (this.getPropertyValue(0).toString() || "<eval>") : null;

        return super.toString("NameProperty", undefined, object);
    }
}

class UByteProperty extends UBaseExportProperty<UEnum, number, number> {

    declare ["constructor"]: typeof UNumericProperty & { dtype: ValidTypes_T<"uint8"> };

    public static dtype = BufferValue.uint8;

    public readProperty(pkg: UPackage, tag: PropertyTag) {
        this.propertyName = tag?.name || null;

        if (this.arrayDimensions !== 1 || tag && tag.arrayIndex !== 0)
            debugger;

        this.propertyValue[tag?.arrayIndex || 0] = pkg.read(new BufferValue(this.constructor.dtype)).value;
        this.isSet = true;

        return this;
    }

    public toString() {
        if (!this.valueId) {
            if (this.arrayDimensions > 1)
                return super.toString("ByteProperty", undefined, undefined);

            return super.toString("ByteProperty", undefined, this.propertyValue[0].toString());
        }

        if (!this._value) {
            if (this.arrayDimensions > 1)
                return super.toString("ByteProperty", "<eval>", undefined);

            return super.toString("ByteProperty", "<eval>", this.propertyValue[0].toString());
        }

        const name = this._value?.friendlyName;
        const enumerations = this._value.names;

        if (this.arrayDimensions > 1)
            return super.toString("ByteProperty", name, this.propertyValue[0].toString());

        const value = this.propertyValue[0];
        const valueName = isFinite(value) && value < enumerations.length ? enumerations[value] : `<invalid '${value}'>`;

        return super.toString("ByteProperty", name, valueName);
    }
}

type ArrayType = FArray<any> | FPrimitiveArray<any> | FObjectArray<any>;

class UArrayProperty extends UBaseExportProperty<UProperty<ArrayType, ArrayType>, ArrayType, ArrayType> {

    public readProperty(pkg: UPackage, tag: PropertyTag) {
        this.propertyName = tag.name;

        if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
            debugger;

        const type = this.value.loadSelf();

        if (type instanceof UStructProperty)
            this.propertyValue[tag.arrayIndex] = new FArray(type.value.buildClass(pkg.loader.getNativePackage())).load(pkg, tag);
        else if (type instanceof UObjectProperty)
            this.propertyValue[tag.arrayIndex] = new FObjectArray().load(pkg, tag);
        else if (type instanceof UIntProperty) {
            this.propertyValue[tag.arrayIndex] = new FPrimitiveArray(BufferValue.int32).load(pkg, tag);
        } else if (type instanceof UFloatProperty) {
            this.propertyValue[tag.arrayIndex] = new FPrimitiveArray(BufferValue.float).load(pkg, tag);
        } else if (type instanceof UByteProperty) {
            this.propertyValue[tag.arrayIndex] = new FPrimitiveArray(BufferValue.uint8).load(pkg, tag);
        } else {
            debugger;
            throw new Error("Not yet implemented!");
        }

        return this;
    }

}

export { UProperty, UNumericProperty, UFloatProperty, UIntProperty, UStrProperty, UDelegateProperty, UBoolProperty, UNameProperty, UObjectProperty, UClassProperty, UStructProperty, UByteProperty, UArrayProperty };

enum PropertyFlags_T {
    Edit = 0x00000001,          // Property is user - settable in the editor.
    Const = 0x00000002,         // Actor's property always matches class's default actor property.
    Input = 0x00000004,         // Variable is writable by the input system.
    ExportObject = 0x00000008,  // Object can be exported with actor.
    OptionalParm = 0x00000010,  // Optional parameter(if Param is set).
    Net = 0x00000020,           // Property is relevant to network replication
    ConstRef = 0x00000040,      // Reference to a constant object.
    Parm = 0x00000080,          // Function / When call parameter
    OutParm = 0x00000100,       // Value is copied out after function call.
    SkipParm = 0x00000200,      // Property is a short - circuitable evaluation function parm.
    ReturnParm = 0x00000400,    // Return value.
    CoerceParm = 0x00000800,    // Coerce args into this function parameter
    Native = 0x00001000,        // Property is native : C++ code is responsible for serializing it.
    Transient = 0x00002000,     // Property is transient : shouldn't be saved, zerofilled at load time.
    Config = 0x00004000,        // Property should be loaded / saved as permanent profile.
    Localized = 0x00008000,     // Property should be loaded as localizable text
    Travel = 0x00010000,        // Property travels across levels / servers.
    EditConst = 0x00020000,     // Property is uneditable in the editor
    GlobalConfig = 0x00040000,  // Load config from base class, not subclass.
    OnDemand = 0x00100000,      // Object or dynamic array loaded on demand only.
    New = 0x00200000,           // Automatically create inner object
    NeedCtorLink = 0x00400000   // Fields need construction / destruction
};

type ReturnType<T extends ValueTypeNames_T> = T extends NumberTypes_T
    ? T extends BigNumberTypes_T ? bigint : number
    : T extends StringTypes_T ? string : DataView;