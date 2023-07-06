import BufferValue from "../../buffer-value";
import { flagBitsToDict } from "../../utils/flags";
import FArray, { FObjectArray, FPrimitiveArray } from "../un-array";
import UClass from "../un-class";
import UField from "../un-field";
import UObject from "../un-object";
import APackage from "../un-package";
import PropertyTag, { UNP_PropertyTypes, getPropertyTypeName } from "./un-property-tag";
import { pathToPkgName } from "../../asset-loader";
import UExport from "src/unreal/un-export";

type PropertyConstructorParams_T = PropertyExtraPars_T & {
    propertyName?: string,
    pkg?: C.APackage
};

type ExportPropertyConstructorParams_T = PropertyExtraPars_T & {
    propertyName?: string,
    pkg?: C.APackage,
    valueId?: number
};

abstract class UProperty<T1 = any, T2 = T1> extends UField {
    public abstract readonly type: UNP_PropertyTypes;

    public arrayDimensions: number;
    public flagNames: C.FlagDict<EnumKeys.PropertyFlags_T>;
    public propertyName: string;

    protected flags: number;
    protected replicationOffset: number;
    protected categoryNameId: number;
    protected categoryName: string;
    protected reader: T1;

    public getTypeName() { return getPropertyTypeName(this.type); }

    public constructor(
        {
            arrayDimensions = 1,
            flags = 0,
            categoryNameId = 0,
            categoryName = "None",
            pkg = null,
            propertyName = "None"
        }: PropertyConstructorParams_T = {} as PropertyConstructorParams_T
    ) {
        super();

        this.pkg = pkg;
        this.arrayDimensions = arrayDimensions;
        this.flags = flags;

        this.flagNames = flagBitsToDict(this.flags, PropertyFlags_T);
        this.propertyName = propertyName;

        this.categoryNameId = categoryNameId;
        this.categoryName = categoryName
        this.reader = this.makeReader();
    }

    protected doLoad(pkg: APackage, exp: C.UExport): void {
        super.doLoad(pkg, exp);

        this.readHead = pkg.tell();

        const uint32 = new BufferValue(BufferValue.uint32);
        const uint16 = new BufferValue(BufferValue.uint16);
        const compat32 = new BufferValue(BufferValue.compat32);

        this.arrayDimensions = pkg.read(uint32).value;
        this.flags = pkg.read(uint32).value;
        this.flagNames = flagBitsToDict(this.flags, PropertyFlags_T);

        this.categoryNameId = pkg.read(compat32).value;
        this.categoryName = pkg.nameTable[this.categoryNameId].name;

        if (this.flags & PropertyFlags_T.Net)
            this.replicationOffset = pkg.read(uint16).value;

        this.readHead = pkg.tell();
    }



    public copy(other: UProperty<T1, T2>) {
        if (this.constructor.name !== other.constructor.name)
            throw new Error("Invalid constructor");

        this.isReady = other.isReady;
        this.isLoading = other.isLoading;

        this.arrayDimensions = other.arrayDimensions;
        this.flags = other.flags;

        this.flagNames = other.flagNames;
        this.categoryNameId = other.categoryNameId;
        this.categoryName = other.categoryName;
        this.replicationOffset = other.replicationOffset;

        this.propertyName = this.propertyName;

        this.pkg = other.pkg;
        this.exp = other.exp;

        return this;
    }

    protected abstract makeReader(): T1;
    public abstract readValue(pkg: APackage, tag: PropertyTag): T2;

    protected abstract makeDefaultValue(): T2;
    public getDefaultValue(): T2 | T2[] {
        console.assert(this.arrayDimensions >= 1, `Invalid array dimensions: ${this.arrayDimensions}`);

        if (this.arrayDimensions === 1)
            return this.makeDefaultValue();

        return new Array<T2>(this.arrayDimensions).fill(this.makeDefaultValue());
    }

    public readProperty(pkg: APackage, tag: PropertyTag, propertyDict: Map<string, any>) {
        const value = this.readValue(pkg, tag);

        console.assert(this.arrayDimensions >= 1, `Invalid array dimensions: ${this.arrayDimensions}`);

        if (this.arrayDimensions === 1) propertyDict.set(tag.name, value);
        else propertyDict.get(tag.name)[tag.arrayIndex] = value;

        return this;
    }

    public nativeClone() {
        const Constructor = this.constructor as any as new () => UProperty<T1, T2>;
        const clone = new Constructor();

        clone.copy(this);

        return clone;
    }

    protected preLoad(pkg: APackage, exp: UExport<UObject>): void {
        this.propertyName = exp.objectName;
        super.preLoad(pkg, exp);
    }

    public toJSON() { throw new Error("Not implemented message."); }

    public toString(className: string, classTemplate: string) {
        return `${className}${classTemplate ? `<${classTemplate}>` : ""}${this.arrayDimensions > 1 ? `[${this.arrayDimensions}]` : ""}(name=${this.propertyName})`;
    }
}

abstract class UBaseExportProperty<T1 extends UObject, T2 = T1, T3 = T2> extends UProperty<T2, T3> {
    public valueId: number;
    public _value: C.UStruct;

    constructor({ valueId = 0 } = {} as ExportPropertyConstructorParams_T) {
        super(...arguments);

        this.valueId = valueId;
    }

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

class UObjectProperty<T extends UObject = UObject> extends UBaseExportProperty<UObject, BufferValue<"compat32">, T> {
    public readonly type = UNP_PropertyTypes.UNP_ObjectProperty;

    protected makeReader(): BufferValue<"compat32"> { return new BufferValue(BufferValue.compat32); }
    public readValue(pkg: APackage): T { return pkg.fetchObject(pkg.read(this.reader).value); }
    protected makeDefaultValue(): T { return null; }

    public toString() {
        const friendlyName = this.valueId === 0 ? null : (this._value?.friendlyName || "<eval>");

        return super.toString("ObjectProperty", friendlyName);
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
    public readonly type = UNP_PropertyTypes.UNP_ClassProperty;

    protected metaClassId: number;
    protected _metaClass: UClass;

    protected makeReader(): BufferValue<"compat32"> { return new BufferValue(BufferValue.compat32); }
    public readValue(pkg: APackage): UClass { return pkg.fetchObject(pkg.read(this.reader).value); }
    protected makeDefaultValue(): UClass { return null; }

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

    public toString() {
        const friendlyName = this.valueId === 0 ? null : (this._value?.friendlyName || "<eval>");

        return super.toString("ClassProperty", friendlyName);
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

class UStructProperty<T extends UObject = UObject> extends UBaseExportProperty<C.UStruct, T, T> {
    public readonly type = UNP_PropertyTypes.UNP_StructProperty;

    protected makeDefaultValue(): T { return null; }
    public initializeDefault(pkgNative: C.ANativePackage): T {
        const Constructor = this.value.loadSelf().buildClass<T>(pkgNative)

        return new Constructor();
    }

    public readValue(pkg: APackage, tag: PropertyTag): T {
        const native = pkg.loader.getNativePackage();
        const verArchive = pkg.header.getArchiveFileVersion();

        // debugger;

        const Constructor = this.value.buildClass<T>(native);
        const struct = new Constructor();
        const isNative = ["Vector", "Rotator", "Color"].includes(tag?.structName || null) || verArchive < 0x76;

        struct.load(pkg, isNative ? null : tag);

        return struct;
    }

    protected makeReader(): T { return null; }

    public toString() {
        const friendlyName = this.valueId === 0 ? null : (this._value?.friendlyName || "<eval>");

        return super.toString("StructProperty", friendlyName);
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

    public toString() { return super.toString(this.constructor.name, undefined); }

    public readValue(pkg: APackage) { return pkg.read(this.reader).value; }
    protected makeReader() { return new BufferValue<T>(this.constructor.dtype); }

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

    public readonly type = UNP_PropertyTypes.UNP_FloatProperty;

    declare ["constructor"]: typeof UNumericProperty & typeof UFloatProperty;

    protected makeDefaultValue(): number { return 0; }
}

class UIntProperty extends UNumericProperty<"int32"> {
    public static dtype = BufferValue.int32;

    public readonly type = UNP_PropertyTypes.UNP_IntProperty;

    declare ["constructor"]: typeof UNumericProperty & typeof UIntProperty;

    protected makeDefaultValue(): number { return 0; }
}

class UStrProperty extends UProperty<BufferValue<"char">, string> {
    public readonly type = UNP_PropertyTypes.UNP_StrProperty;

    public readValue(pkg: APackage) { return pkg.read(this.reader).value; }
    protected makeReader(): BufferValue<"char"> { return new BufferValue(BufferValue.char); }
    protected makeDefaultValue(): string { return ""; }

    public toString() { return super.toString(this.constructor.name, undefined); }

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
    protected makeDefaultValue(): any { return null; }

    protected makeReader() {
        throw new Error("Method not implemented.");
    }
    public readValue(pkg: APackage, tag: PropertyTag) {
        throw new Error("Method not implemented.");
    }

    public readonly type: UNP_PropertyTypes = null;
}



class UBoolProperty extends UProperty<boolean, boolean> {
    public readonly type = UNP_PropertyTypes.UNP_BoolProperty;

    protected makeDefaultValue(): boolean { return false; }
    protected makeReader(): boolean { return null; }
    public readValue(pkg: APackage, tag: PropertyTag): boolean { return tag.boolValue; }

    public toString() { return super.toString("BoolProperty", undefined); }

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
    public readonly type = UNP_PropertyTypes.UNP_NameProperty;

    protected makeDefaultValue(): string { return "None"; }

    public readValue(pkg: APackage): string { return pkg.nameTable[pkg.read(this.reader).value].name; }
    protected makeReader(): BufferValue<"compat32"> { return new BufferValue(BufferValue.compat32); }


    public toString() { return super.toString("NameProperty", undefined); }

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

    public readonly type = UNP_PropertyTypes.UNP_ByteProperty;

    public static dtype = BufferValue.uint8;

    public readValue(pkg: APackage): number { return pkg.read(this.reader).value; }
    protected makeReader(): BufferValue<"uint8"> { return new BufferValue(BufferValue.uint8); }
    protected makeDefaultValue(): number { return 0; }

    public toString() {
        if (!this.valueId)
            return super.toString("ByteProperty", undefined);

        if (!this._value) {
            if (this.arrayDimensions > 1)
                return super.toString("ByteProperty", "<eval>");

            return super.toString("ByteProperty", "<eval>");
        }

        const name = this._value.friendlyName;

        return super.toString("ByteProperty", name);
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
    public readonly type = UNP_PropertyTypes.UNP_ArrayProperty;

    protected makeReader(): ArrayType { return null; }
    protected makeDefaultValue(): ArrayType { return null; }

    public readValue(pkg: APackage, tag: PropertyTag): ArrayType {
        if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
            debugger;

        const type = this.value.loadSelf();

        if (type instanceof UStructProperty || type instanceof UClassProperty) {
            return new FArray(type.value.buildClass(pkg.loader.getNativePackage())).load(pkg, tag);
        } else if (type instanceof UObjectProperty) {
            return new FObjectArray().load(pkg, tag);
        } else if (type instanceof UIntProperty) {
            return new FPrimitiveArray(BufferValue.int32).load(pkg, tag);
        } else if (type instanceof UFloatProperty) {
            return new FPrimitiveArray(BufferValue.float).load(pkg, tag);
        } else if (type instanceof UByteProperty) {
            return new FPrimitiveArray(BufferValue.uint8).load(pkg, tag);
        } else if (type instanceof UClass) {
            return new FArray(type.buildClass(pkg.loader.getNativePackage())).load(pkg, tag);
        } else {
            debugger;
            throw new Error("Not yet implemented!");
        }
    }

    // public readProperty(pkg: APackage, tag: PropertyTag) {
    //     this.propertyName = tag.name;
    //     this.propertyValuePkg = pkg;

    //     if (this.arrayDimensions !== 1 || tag.arrayIndex !== 0)
    //         debugger;

    //     const type = this.value.loadSelf();

    //     if (type instanceof UStructProperty || type instanceof UClassProperty) {
    //         this.propertyValue[tag.arrayIndex] = new FArray(type.value.buildClass(pkg.loader.getNativePackage())).load(pkg, tag);
    //     } else if (type instanceof UObjectProperty) {
    //         this.propertyValue[tag.arrayIndex] = new FObjectArray().load(pkg, tag);
    //     } else if (type instanceof UIntProperty) {
    //         this.propertyValue[tag.arrayIndex] = new FPrimitiveArray(BufferValue.int32).load(pkg, tag);
    //     } else if (type instanceof UFloatProperty) {
    //         this.propertyValue[tag.arrayIndex] = new FPrimitiveArray(BufferValue.float).load(pkg, tag);
    //     } else if (type instanceof UByteProperty) {
    //         this.propertyValue[tag.arrayIndex] = new FPrimitiveArray(BufferValue.uint8).load(pkg, tag);
    //     } else if (type instanceof UClass) {
    //         this.propertyValue[tag.arrayIndex] = new FArray(type.buildClass(pkg.loader.getNativePackage())).load(pkg, tag);
    //     } else {
    //         debugger;
    //         throw new Error("Not yet implemented!");
    //     }

    //     return this;
    // }

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

        return super.toString("ArrayProperty", undefined);
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
    PropertyFlags_T
};

type ReturnType<T extends C.ValueTypeNames_T> = T extends C.NumberTypes_T
    ? T extends C.BigNumberTypes_T ? bigint : number
    : T extends C.StringTypes_T ? string : DataView;

type IBufferValueProperty<T extends C.ValueTypeNames_T = C.ValueTypeNames_T> = C.IBufferValueProperty<T>;