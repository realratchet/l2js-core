import BufferValue from "../../buffer-value";
import { flagBitsToDict } from "../../utils/flags";
import FArray, { FObjectArray, FPrimitiveArray } from "../un-array";
import UClass from "../un-class";
import UField from "../un-field";
import UObject from "../un-object";
import APackage from "../un-package";
import PropertyTag from "./un-property-tag";
import { pathToPkgName } from "../../asset-loader";

type PropertyConstructorParams_T = {
    arrayDimensions: number,
    flags: number,
    categoryNameId: number,
    categoryName: string
}

abstract class UProperty<T1 = any, T2 = T1> extends UField {
    public arrayDimensions: number;
    public propertyName: string;
    public propertyFlags: C.FlagDict<EnumKeys.PropertyFlags_T>;

    protected flags: number;
    protected replicationOffset: number;
    protected categoryNameId: number;
    protected categoryName: string;

    public isSet: boolean[];
    public isDefault: boolean[];
    public propertyValue: T1[];
    protected propertyValuePkg: APackage;

    public constructor(
        {
            arrayDimensions = 1,
            flags = 0,
            categoryNameId = 0,
            categoryName = "None",
        }: PropertyConstructorParams_T = {} as PropertyConstructorParams_T
    ) {
        super();

        this.arrayDimensions = arrayDimensions;
        this.flags = flags;

        this.propertyFlags = flagBitsToDict(this.flags, PropertyFlags_T);
        this.propertyValue = new Array<T1>(this.arrayDimensions);

        this.categoryNameId = categoryNameId;
        this.categoryName = categoryName

        this.isSet = new Array(this.arrayDimensions).fill(false);
        this.isDefault = new Array(this.arrayDimensions).fill(false);

        for (let i = 0; i < this.arrayDimensions; i++) {
            this.propertyValue[i] = this.makeDefault();

            if (this.propertyValue[i] === undefined)
                debugger;

        }
    }

    protected preLoad(pkg: APackage, exp: C.UExport): void {
        super.preLoad(pkg, exp);

        this.propertyName = exp.objectName;
    }

    protected doLoad(pkg: APackage, exp: C.UExport): void {
        super.doLoad(pkg, exp);

        this.readHead = pkg.tell();

        const uint32 = new BufferValue(BufferValue.uint32);
        const uint16 = new BufferValue(BufferValue.uint16);
        const compat32 = new BufferValue(BufferValue.compat32);

        this.arrayDimensions = pkg.read(uint32).value;
        this.flags = pkg.read(uint32).value;
        this.propertyFlags = flagBitsToDict(this.flags, PropertyFlags_T);

        this.categoryNameId = pkg.read(compat32).value;
        this.categoryName = pkg.nameTable[this.categoryNameId].name;

        if (this.flags & PropertyFlags_T.Net)
            this.replicationOffset = pkg.read(uint16).value;

        this.propertyValue = new Array<T1>(this.arrayDimensions);
        this.propertyValuePkg = pkg;

        this.isSet = new Array(this.arrayDimensions).fill(false);
        this.isDefault = new Array(this.arrayDimensions).fill(false);

        for (let i = 0; i < this.arrayDimensions; i++) {
            this.propertyValue[i] = this.makeDefault();

            if (this.propertyValue[i] === undefined)
                debugger;

        }

        this.readHead = pkg.tell();
    }

    protected abstract makeDefault(): T1;

    public getPropertyValue(index: number = null): T2 | T2[] {
        return this.arrayDimensions === 1
            ? this.propertyValue[0] as any as T2
            : index === null
                ? this.propertyValue as any as T2[]
                : this.propertyValue[index] as any as T2;
    }

    public copy(other: UProperty<T1, T2>) {
        if (this.constructor.name !== other.constructor.name)
            throw new Error("Invalid constructor");

        this.isReady = other.isReady;
        this.isLoading = other.isLoading;
        this.isDefault = other.isDefault.slice();
        this.isSet = new Array(other.arrayDimensions).fill(false);

        this.arrayDimensions = other.arrayDimensions;
        this.flags = other.flags;
        this.propertyName = other.propertyName;
        this.propertyFlags = other.propertyFlags;
        this.categoryNameId = other.categoryNameId;
        this.categoryName = other.categoryName;
        this.replicationOffset = other.replicationOffset;

        this.propertyValue = new Array(this.arrayDimensions);
        this.propertyValuePkg = other.propertyValuePkg;

        for (let i = 0; i < this.arrayDimensions; i++) {
            const prop = other.propertyValue[i];
            const dtype = typeof prop;

            if (dtype === "object") {
                if (prop instanceof BufferValue)
                    this.propertyValue[i] = prop.nativeClone() as T1;
                else if (prop === null)
                    this.propertyValue[i] = prop;
                else if (prop instanceof UObject) {
                    this.propertyValue[i] = prop.nativeClone() as T1;
                } else if (prop instanceof BooleanValue) {
                    this.propertyValue[i] = prop.nativeClone() as T1;
                } else {
                    debugger;
                    throw new Error("Not implemented")
                }
            } else if (dtype === "boolean") {
                this.propertyValue[i] = prop;
            } else {
                debugger
            }

        }

        this.pkg = other.pkg;
        this.exp = other.exp;

        return this;
    }

    public nativeClone() {
        const Constructor = this.constructor as any as new () => UProperty<T1, T2>;
        const clone = new Constructor();

        clone.copy(this);

        return clone;
    }

    public abstract readProperty(pkg: APackage, tag: PropertyTag): UProperty<T1, T2>;
    public toJSON() { throw new Error("Not implemented message."); }

    public toString(className: string, classTemplate: string, value: string) {
        return `${className}${classTemplate ? `<${classTemplate}>` : ""}[${this.arrayDimensions === 1 ? value : "..."}]${this.arrayDimensions > 1 ? `(${this.arrayDimensions})` : ""}(${this.propertyName})`;
    }
}

abstract class UBaseExportProperty<T1 extends UField, T2 = T1, T3 = T2> extends UProperty<T2, T3> {
    public valueId: number;
    public _value: T1;

    public get value() {
        if (this.valueId !== 0 && !this._value)
            this._value = this.pkg.fetchObject(this.valueId);

        return this._value;
    }

    protected doLoad(pkg: APackage, exp: C.UExport<UObject>): void {
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

class UObjectProperty<T extends UObject = UObject> extends UBaseExportProperty<UClass, BufferValue<"compat32">, T> {
    public readProperty(pkg: APackage, tag: PropertyTag) {
        this.propertyName = tag.name;

        pkg.read(this.propertyValue[tag.arrayIndex]);
        this.propertyValuePkg = pkg;
        this.isSet[tag.arrayIndex] = true;

        return this;
    }

    protected makeDefault(): BufferValue<"compat32"> {
        return new BufferValue(BufferValue.compat32);
    }

    public getPropertyValue(index: number = null) {
        return this.arrayDimensions === 1
            ? this.propertyValuePkg.fetchObject<T>(this.propertyValue[0].value)
            : index === null
                ? this.propertyValue.map(i => this.propertyValuePkg.fetchObject<T>(i.value))
                : this.propertyValuePkg.fetchObject<T>(this.propertyValue[index].value);
    }

    public toString() {
        const friendlyName = this.valueId === 0 ? null : (this._value?.friendlyName || "<eval>");
        const object = this.arrayDimensions === 1 ? this.propertyValue[0].value === 0 ? null : (this.getPropertyValue(0).toString() || "<eval>") : null;

        return super.toString("ObjectProperty", friendlyName, object);
    }

    public toJSON() {
        const pkg = this.propertyValuePkg;
        const values = this.propertyValue.map(v => v.value);
        const names = values.map(v => pkg.getPackageName(v));

        return {
            type: "object",
            package: pathToPkgName(pkg.path),
            value: this.arrayDimensions === 1 ? values[0] : values,
            names: this.arrayDimensions === 1 ? names[0] : names,
            category: this.categoryName,
            isSet: this.isSet,
            isDefault: this.isDefault
        };
    }
}


class UClassProperty extends UBaseExportProperty<UClass, BufferValue<"compat32">, UClass> {

    protected metaClassId: number;
    protected _metaClass: UClass;

    protected makeDefault(): BufferValue<"compat32"> {
        return new BufferValue(BufferValue.compat32);
    }

    public getPropertyValue(index: number = null) {
        debugger;
        return this.arrayDimensions === 1
            ? this.propertyValuePkg.fetchObject<UClass>(this.propertyValue[0].value)
            : index === null
                ? this.propertyValue.map(i => this.propertyValuePkg.fetchObject<UClass>(i.value))
                : this.propertyValuePkg.fetchObject<UClass>(this.propertyValue[index].value);
    }

    protected doLoad(pkg: APackage, exp: C.UExport<UObject>): void {
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

    public readProperty(pkg: APackage, tag: PropertyTag) {
        this.propertyName = tag.name;

        if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
            debugger;

        this.propertyValuePkg = pkg;
        pkg.read(this.propertyValue[tag.arrayIndex]);
        this.isSet[tag.arrayIndex] = true;

        return this;
    }

    public toString() {
        const friendlyName = this.valueId === 0 ? null : (this._value?.friendlyName || "<eval>");
        const object = this.arrayDimensions === 1 ? this.propertyValue[0].value === 0 ? null : (this.getPropertyValue(0).toString() || "<eval>") : null;

        return super.toString("ClassProperty", friendlyName, object);
    }

    public toJSON() {
        const values = this.propertyValue.map(v => v.value);


        return {
            type: "class",
            package: pathToPkgName(this.propertyValuePkg.path),
            value: this.arrayDimensions === 1 ? values[0] : values,
            category: this.categoryName,
            isSet: this.isSet,
            isDefault: this.isDefault
        };
    }
}

class UStructProperty<T extends UObject = UObjectProperty> extends UBaseExportProperty<C.UStruct, T, T> {
    public readProperty(pkg: APackage, tag: PropertyTag) {
        this.propertyName = tag?.name ?? this.propertyName ?? "None";

        // if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
        //     debugger;

        const native = pkg.loader.getNativePackage();
        const verArchive = pkg.header.getArchiveFileVersion();

        const Constructor = this.value.buildClass<T>(native);
        const struct = new Constructor();
        const isNative = ["Vector", "Rotator", "Color"].includes(tag?.structName || null) || verArchive < 0x76;

        struct.load(pkg, isNative ? null : tag);

        this.propertyValue[tag?.arrayIndex || 0] = struct;
        this.propertyValuePkg = pkg;
        this.isSet[tag?.arrayIndex] = true;

        return this;
    }

    protected makeDefault(): T { return null; }

    public toString() {
        const friendlyName = this.valueId === 0 ? null : (this._value?.friendlyName || "<eval>");
        const object = this.arrayDimensions === 1
            ? this.propertyValue[0]
                ? (this.getPropertyValue(0).toString() || "<eval>")
                : null
            : null;

        return super.toString("StructProperty", friendlyName, object);
    }

    public toJSON(): any {
        const unserialized = this.getPropertyValue();
        const value = unserialized instanceof Array
            ? unserialized.map(v => v?.toJSON() || null)
            : (unserialized?.toJSON() || null);

        return {
            type: "struct",
            name: this.value.friendlyName,
            value,
            category: this.categoryName,
            isSet: this.isSet,
            isDefault: this.isDefault
        };
    }
}

abstract class UNumericProperty<T extends C.NumberTypes_T | C.StringTypes_T> extends UProperty<BufferValue<T>, ReturnType<T>> implements IBufferValueProperty<T> {
    declare ["constructor"]: typeof UNumericProperty & { dtype: C.ValidTypes_T<T> };

    public readProperty(pkg: APackage, tag: PropertyTag) {
        this.propertyName = tag?.name ?? this.propertyName ?? "None";

        pkg.read(this.propertyValue[tag?.arrayIndex || 0]);
        this.propertyValuePkg = pkg;
        this.isSet[tag?.arrayIndex || 0] = true;

        return this;
    }

    public toString() {
        return super.toString(this.constructor.name, undefined, this.arrayDimensions === 1 ? this.propertyValue[0].toString() : null);
    }

    protected makeDefault() {
        return new BufferValue<T>(this.constructor.dtype);
    }

    public getPropertyValue(index: number = null): ReturnType<T> | ReturnType<T>[] {
        const value = super.getPropertyValue(index) as any as BufferValue<T> | BufferValue<T>[];

        if (value instanceof Array)
            return value.map(v => v.value);

        return value.value;
    }

    public toJSON() {
        return {
            type: this.constructor.dtype.name,
            value: this.getPropertyValue(),
            category: this.categoryName,
            isSet: this.isSet,
            isDefault: this.isDefault
        };
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

class UStrProperty extends UProperty<BufferValue<"char">, string> {
    protected makeDefault(): BufferValue<"char"> {
        return new BufferValue(BufferValue.char);
    }

    public readProperty(pkg: APackage, tag: PropertyTag) {
        this.propertyName = tag?.name ?? this.propertyName ?? "None";

        if (this.arrayDimensions !== 1 || tag && tag.arrayIndex !== 0)
            debugger;

        if (!tag)
            debugger;

        pkg.read(this.propertyValue[tag.arrayIndex]);

        this.propertyValuePkg = pkg;
        this.isSet[tag.arrayIndex] = true;

        return this;
    }

    public toString() {
        return super.toString(this.constructor.name, undefined, this.arrayDimensions === 1 ? this.propertyValue[0].string : null);
    }

    public getPropertyValue(index: number = null): string | string[] {
        const value = super.getPropertyValue(index) as any as BufferValue<"buffer"> | BufferValue<"buffer">[];

        if (value instanceof Array)
            return value.map(v => v.string);

        return value.string;
    }

    public toJSON(): any {
        return {
            type: "string",
            value: this.getPropertyValue(),
            category: this.categoryName,
            isSet: this.isSet,
            isDefault: this.isDefault
        };
    }
}

class UDelegateProperty extends UProperty<any, any> {
    public readProperty(pkg: APackage, tag: PropertyTag): UProperty<any, any> {
        throw new Error("Method not implemented.");
    }

    protected makeDefault() {
        throw new Error("Method not implemented.");
    }
}

class BooleanValue {
    public value: boolean;

    public constructor(value: boolean = false) { this.value = value; }
    public nativeClone() { return new BooleanValue(this.value); }

    toString() { return `Boolean[${this.value}]`; }
}

class UBoolProperty extends UProperty<BooleanValue, boolean> {
    protected makeDefault(): BooleanValue {
        return new BooleanValue();
    }

    public readProperty(pkg: APackage, tag: PropertyTag) {
        if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
            debugger;

        this.propertyValuePkg = pkg;
        this.propertyValue[tag.arrayIndex].value = tag.boolValue;
        this.isSet[tag.arrayIndex] = true;
        this.propertyName = tag.name;

        return this;
    }

    public getPropertyValue(index: number = null): boolean | boolean[] {
        const value = super.getPropertyValue(index) as any as BooleanValue | BooleanValue[];

        if (value instanceof Array)
            return value.map(v => v.value);

        return value.value;
    }

    public toString() {
        return super.toString("BoolProperty", undefined, this.arrayDimensions === 1 ? this.propertyValue[0].value.toString() : null);
    }

    public toJSON(): any {
        return {
            type: "boolean",
            value: this.getPropertyValue(),
            category: this.categoryName,
            isSet: this.isSet,
            isDefault: this.isDefault
        };
    }
}

class UNameProperty extends UProperty<BufferValue<"compat32">, string> {
    public readProperty(pkg: APackage, tag: PropertyTag) {
        this.propertyName = tag.name;

        if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
            debugger;

        this.propertyValuePkg = pkg;
        pkg.read(this.propertyValue[tag.arrayIndex]);
        this.isSet[tag.arrayIndex] = true;

        return this;
    }

    protected makeDefault(): BufferValue<"compat32"> {
        return new BufferValue(BufferValue.compat32);
    }

    public getPropertyValue(index: number = null) {
        const nameTable = this.propertyValuePkg.nameTable;

        return this.arrayDimensions === 1
            ? nameTable[this.propertyValue[0].value].name
            : index === null
                ? this.propertyValue.map(i => nameTable[i.value].name)
                : nameTable[this.propertyValue[index].value].name;
    }

    public toString() {
        const object = this.arrayDimensions === 1 ? this.propertyValue[0].value === 0 ? null : (this.getPropertyValue(0).toString() || "<eval>") : null;

        return super.toString("NameProperty", undefined, object);
    }

    public toJSON(): any {
        return {
            type: "name",
            value: this.getPropertyValue(),
            category: this.categoryName,
            isSet: this.isSet,
            isDefault: this.isDefault
        };
    }
}

class UByteProperty extends UBaseExportProperty<C.UEnum, BufferValue<"uint8">, number> {

    declare ["constructor"]: typeof UNumericProperty & { dtype: C.ValidTypes_T<"uint8"> };

    public static dtype = BufferValue.uint8;

    public readProperty(pkg: APackage, tag: PropertyTag) {
        this.propertyName = tag?.name ?? this.propertyName ?? "None";

        if (this.arrayDimensions !== 1 || tag && tag.arrayIndex !== 0)
            debugger;

        pkg.read(this.propertyValue[tag?.arrayIndex || 0]);
        this.propertyValuePkg = pkg;
        this.isSet[tag?.arrayIndex || 0] = true;

        return this;
    }

    protected makeDefault(): BufferValue<"uint8"> { return new BufferValue(BufferValue.uint8); }

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

        const name = this._value.friendlyName;
        const enumerations = this._value.names;

        if (this.arrayDimensions > 1)
            return super.toString("ByteProperty", name, this.propertyValue[0].toString());

        const value = this.propertyValue[0].value;
        const valueName = isFinite(value) && value < enumerations.length ? enumerations[value] : `<invalid '${value}'>`;

        return super.toString("ByteProperty", name, valueName);
    }

    public getPropertyValue(index: number = null): number | number[] {
        const value = super.getPropertyValue(index) as any as BufferValue<"uint8"> | BufferValue<"uint8">[];

        if (value instanceof Array)
            return value.map(v => v.value);

        return value.value;
    }

    public toJSON(): any {
        if (this.valueId !== 0) {
            const names = Array.from(this.value.names);

            return {
                type: "enum",
                enumName: this.value.friendlyName,
                names,
                value: this.getPropertyValue(),
                category: this.categoryName,
                isSet: this.isSet,
                isDefault: this.isDefault
            };
        }

        return {
            type: this.constructor.dtype.name,
            value: this.getPropertyValue(),
            isSet: this.isSet,
            isDefault: this.isDefault
        };
    }
}

type ArrayType = FArray<any> | FPrimitiveArray<any> | FObjectArray<any>;

class UArrayProperty extends UBaseExportProperty<UProperty<ArrayType, ArrayType>, ArrayType, ArrayType> {
    protected makeDefault(): ArrayType {
        return null;
    }

    public readProperty(pkg: APackage, tag: PropertyTag) {
        this.propertyName = tag.name;
        this.propertyValuePkg = pkg;

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

        this.isSet[tag.arrayIndex] = true;

        return this;
    }

    public toString() {
        const type = this.value.loadSelf();
        let value: string;

        if (type instanceof UStructProperty || type instanceof UObjectProperty) {
            value = type.valueId === 0 ? null : type._value?.friendlyName || "<eval>";
        } else if (type instanceof UIntProperty || type instanceof UFloatProperty) {
            value = type.constructor.name;
        } else if (type instanceof UByteProperty) {
            value = type.constructor.name;
        } else {
            debugger;
            throw new Error("Not yet implemented!");
        }

        return super.toString("ArrayProperty", undefined, value);
    }

    public toJSON(): any {
        const type = this.value.loadSelf();
        const unserialized = this.getPropertyValue();
        const extras: Record<string, any> = {};
        let value = null;
        let dtype = null;

        if (this.arrayDimensions !== 1)
            debugger;

        if (type instanceof UStructProperty) {
            value = unserialized?.map(v => v?.toJSON() || null) || [];
            dtype = "struct";
        } else if (type instanceof UObjectProperty) {
            value = (unserialized as FObjectArray)?.getIndexList() || [];
            extras.package = pathToPkgName(this.propertyValuePkg.path);
            extras.names = value !== null ? value.map(v => this.propertyValuePkg.getPackageName(v)) : [];
            dtype = "object";
        } else if (type instanceof UIntProperty || type instanceof UFloatProperty) {
            value = (unserialized as FPrimitiveArray<"int32" | "float">)?.getTypedArray() || [];
            dtype = (type instanceof UIntProperty) ? "int32" : "float";
        } else if (type instanceof UByteProperty) {
            if (type.valueId !== 0) {
                debugger;
                throw new Error("Not yet implemented!");
            } else {
                value = (unserialized as FPrimitiveArray<"uint8">)?.getTypedArray() || [];
                extras.type = "uint8";
            }
        } else {
            debugger;
            throw new Error("Not yet implemented!");
        }

        return {
            type: dtype,
            dynamic: true,
            value,
            ...extras,
            category: this.categoryName,
            isSet: this.isSet,
            isDefault: this.isDefault
        };
    }
}

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

export {
    UProperty,
    UNumericProperty,
    UFloatProperty,
    UIntProperty,
    UStrProperty,
    UDelegateProperty,
    UBoolProperty,
    UNameProperty,
    UObjectProperty,
    UClassProperty,
    UStructProperty,
    UByteProperty,
    UArrayProperty,
    BooleanValue,
    PropertyFlags_T
};

type ReturnType<T extends C.ValueTypeNames_T> = T extends C.NumberTypes_T
    ? T extends C.BigNumberTypes_T ? bigint : number
    : T extends C.StringTypes_T ? string : DataView;

type IBufferValueProperty<T extends C.ValueTypeNames_T = C.ValueTypeNames_T> = C.IBufferValueProperty<T>;