import BufferValue from "../../buffer-value";
import { flagBitsToDict } from "../../utils/flags";
import UField from "../un-field";
import { EnumeratedValue } from "../un-object";

abstract class UProperty extends UField {
    public arrayDimensions: number;
    protected flags: number;
    protected replicationOffset: number;
    protected categoryNameId: number;
    protected categoryName: string;
    public propertyName: string;
    public propertyFlags: Readonly<Record<string, boolean>>;

    public readonly isNumericType: boolean = false;

    protected preLoad(pkg: UPackage, exp: UExport): void {
        super.preLoad(pkg, exp);

        this.propertyName = exp.objectName;
    }

    protected doLoad(pkg: UPackage, exp: UExport): void {
        super.doLoad(pkg, exp);

        // debugger;

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

        this.readHead = pkg.tell();
    }

    public static readProperty(pkg: UPackage) { return pkg.read(new BufferValue(BufferValue.float)).value; }
}

abstract class UBaseExportProperty<T extends UField> extends UProperty {
    protected valueId: number;
    public value: T;

    protected doLoad(pkg: UPackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        const compat32 = new BufferValue(BufferValue.compat32);

        this.valueId = pkg.read(compat32).value;
        this.readHead = pkg.tell();
    }

    public loadSelf() {
        super.loadSelf();

        if (this.valueId !== 0 && !this.value)
            this.value = this.pkg.fetchObject(this.valueId);

        return this;
    }
}

class ObjectContainer<T extends UObject = UObject> {
    public friendlyName: string;
    public value: T = null;

    public constructor(friendlyName: string) {
        if (!friendlyName)
            debugger;

        this.friendlyName = friendlyName;
    }

    toString() { return `UObject<${this.friendlyName}>[${this.value}]`; }

    public buildContainer() { return new NameContainer(); }
}

class UObjectProperty extends UBaseExportProperty<UClass> {
    public buildContainer() { return new ObjectContainer(this.value/*.loadSelf()*/.friendlyName); }
}

class ClassContainer {

}

class UClassProperty extends UObjectProperty {
    protected metaClassId: number;
    protected metaClass: UClass;

    protected doLoad(pkg: UPackage, exp: UExport<UObject>): void {
        super.doLoad(pkg, exp);

        const compat32 = new BufferValue(BufferValue.compat32);

        this.metaClassId = pkg.read(compat32).value;
        this.readHead = pkg.tell();
    }

    public loadSelf() {
        super.loadSelf();

        if (this.metaClassId !== 0 && !this.metaClass)
            this.metaClass = this.pkg.fetchObject(this.metaClassId);

        return this;
    }

    public buildContainer() {
        debugger;
    }
}

class UStructProperty extends UBaseExportProperty<UStruct> {
    // public loadSelf() {
    //     super.loadSelf();

    //     if (this.valueId !== 0 && !this.value)
    //         this.value = this.pkg.fetchObject(this.valueId);

    //     return this;
    // }
}

abstract class UNumericProperty<T extends NumberTypes_T = NumberTypes_T> extends UProperty implements IBufferValueProperty<T> {
    declare ["constructor"]: typeof UNumericProperty & { dtype: ValidTypes_T<T> };

    public buildBuffer() {
        const constr = this.constructor;

        if (!("dtype" in constr))
            throw new Error("Missing 'dtype' for numeric property type.");

        return new BufferValue(constr.dtype);
    }

    public readonly isNumericType = true;
}

class UFloatProperty extends UNumericProperty<"float"> {
    public static dtype = BufferValue.float;

    declare ["constructor"]: typeof UNumericProperty & typeof UFloatProperty;
}

class UIntProperty extends UNumericProperty<"int32"> {
    public static dtype = BufferValue.int32;

    // public static readProperty(pkg: UPackage) { return readProperty(pkg, this.dtype); }
}

class UStrProperty extends /*UNumericProperty<"char">*/ UProperty {
    // public static dtype = BufferValue.char;
}

class UDelegateProperty extends UProperty {

}

class BoolContainer {
    public value: boolean = false;

    toString() { return `Bool[${this.value}]`; }
}

class UBoolProperty extends UProperty {
    public buildContainer() { return new BoolContainer(); }
}

class NameContainer {
    public value = "None";

    toString() { return `Name[${this.value}]`; }
}

class UNameProperty extends UProperty {
    public buildContainer() { return new NameContainer(); }
}

class UByteProperty extends UBaseExportProperty<UEnum> {
    declare ["constructor"]: typeof UNumericProperty & { dtype: ValidTypes_T<"uint8"> };

    public static dtype = BufferValue.uint8;

    // public loadSelf() {
    //     super.loadSelf();

    //     if (this.valueId !== 0 && !this.value)
    //         this.value = this.pkg.fetchObject(this.valueId);

    //     return this;
    // }

    public buildContainer() {
        if (this.valueId > 0)
            return new EnumeratedValue(this.value.friendlyName, this.value.names, 0);

        return new BufferValue(this.constructor.dtype);
    }
}

class UArrayProperty extends UBaseExportProperty<UProperty> {
    public loadSelf() {
        super.loadSelf();

        this.value?.loadSelf();

        return this;
    }
}

function readProperty(pkg: UPackage, dtype: ValidTypes_T<any>) {
    return pkg.read(new BufferValue(dtype)).value;
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