import BufferValue from "../../buffer-value";

class PropertyTag {
    protected constructor() { }

    public name: string;
    public type: UNP_PropertyTypes;
    public structName: string;
    public arrayIndex: number;
    public dataSize: number;
    public boolValue: boolean;
    public enumName: string;


    static from(pkg: C.APackage, offset: number): PropertyTag {
        return new PropertyTag().load(pkg, offset);
    }

    public isValid() { return !this.name || this.name !== "None"; }

    protected load(pkg: C.APackage, offset: number) {
        pkg.seek(offset, "set");

        const compat32 = pkg.read(new BufferValue(BufferValue.compat32));

        const propName = compat32.value >= 0 && compat32.value < pkg.nameTable.length
            ? pkg.nameTable[compat32.value].name
            : "None";

        this.name = propName;

        if (propName === "None") return this;

        const info = pkg.read(new BufferValue(BufferValue.int8)).value;
        const isArray = (info & UNP_PropertyMasks.PROPERTY_ARRAY_MASK) !== 0;
        this.type = info & UNP_PropertyMasks.PROPERTY_TYPE_MASK;

        if (this.type === UNP_PropertyTypes.UNP_StructProperty) {
            pkg.read(compat32);
            this.structName = pkg.nameTable[compat32.value].name;
        }



        switch (info & UNP_PropertyMasks.PROPERTY_SIZE_MASK) {
            case UNP_DataTypeSizes.StaticSize1: this.dataSize = 1; break;
            case UNP_DataTypeSizes.StaticSize2: this.dataSize = 2; break;
            case UNP_DataTypeSizes.StaticSize4: this.dataSize = 4; break;
            case UNP_DataTypeSizes.StaticSize12: this.dataSize = 12; break;
            case UNP_DataTypeSizes.StaticSize16: this.dataSize = 16; break;
            case UNP_DataTypeSizes.DynamicSizeUint8: this.dataSize = pkg.read(new BufferValue(BufferValue.uint8)).value; break;
            case UNP_DataTypeSizes.DynamicSizeUint16: this.dataSize = pkg.read(new BufferValue(BufferValue.uint16)).value; break;
            case UNP_DataTypeSizes.DynamicSizeUint32: this.dataSize = pkg.read(new BufferValue(BufferValue.uint32)).value; break;
        }

        this.arrayIndex = 0;

        if (isArray && this.type !== UNP_PropertyTypes.UNP_BoolProperty) {
            const int8 = new BufferValue(BufferValue.int8);
            const b = pkg.read(int8).value;

            if (b < 0x80) {
                this.arrayIndex = b;
            } else {
                const b2 = pkg.read(int8).value;

                if (b & 0x40) { // really, (b & 0xC0) == 0xC0
                    const b3 = pkg.read(int8).value;
                    const b4 = pkg.read(int8).value;
                    this.arrayIndex = ((b << 24) | (b2 << 16) | (b3 << 8) | b4) & 0x3FFFFF;
                } else this.arrayIndex = ((b << 8) | b2) & 0x3FFF;
            }
        }

        this.boolValue = this.type === UNP_PropertyTypes.UNP_BoolProperty ? isArray : false;

        return this;
    }

    public getTypeName() {
        switch (this.type) {
            case UNP_PropertyTypes.UNP_ByteProperty: return "Byte";
            case UNP_PropertyTypes.UNP_IntProperty: return "Int";
            case UNP_PropertyTypes.UNP_BoolProperty: return "Bool";
            case UNP_PropertyTypes.UNP_FloatProperty: return "Float";
            case UNP_PropertyTypes.UNP_ObjectProperty: return "Object";
            case UNP_PropertyTypes.UNP_NameProperty: return "Name";
            case UNP_PropertyTypes.UNP_StrProperty: return "Str";
            case UNP_PropertyTypes.UNP_StringProperty: return "String";
            case UNP_PropertyTypes.UNP_ArrayProperty: return "Array";
            case UNP_PropertyTypes.UNP_ClassProperty: return "Class";
            case UNP_PropertyTypes.UNP_VectorProperty: return "Vector";
            case UNP_PropertyTypes.UNP_RotatorProperty: return "Rotator";
            case UNP_PropertyTypes.UNP_MapProperty: return "Map";
            case UNP_PropertyTypes.UNP_FixedArrayProperty: return "FixedArray";
            case UNP_PropertyTypes.UNP_StructProperty: return "Struct";
            default: throw new Error(`Unknwon tag type ${this.type}`);
        }
    }

    public toString() {
        if (this.name === "None")
            return `PropertyTag[None]`;
        return `PropertyTag<${this.getTypeName()}${this.type === UNP_PropertyTypes.UNP_StructProperty ? `<${this.structName}>` : ""}>[${this.name}](size=${this.dataSize})`;
    }
}

enum UNP_PropertyTypes {
    UNP_ByteProperty /*      */ = 0x1,
    UNP_IntProperty /*       */ = 0x2,
    UNP_BoolProperty /*      */ = 0x3,
    UNP_FloatProperty /*     */ = 0x4,
    UNP_ObjectProperty /*    */ = 0x5,
    UNP_NameProperty /*      */ = 0x6,
    UNP_StringProperty /*    */ = 0x7,
    UNP_ClassProperty /*     */ = 0x8,
    UNP_ArrayProperty /*     */ = 0x9,
    UNP_StructProperty /*    */ = 0xA,
    UNP_VectorProperty /*    */ = 0xB,
    UNP_RotatorProperty /*   */ = 0xC,
    UNP_StrProperty /*       */ = 0xD,
    UNP_MapProperty /*       */ = 0xE,
    UNP_FixedArrayProperty /**/ = 0xF
};

enum UNP_PropertyMasks {
    PROPERTY_TYPE_MASK /* */ = 0x0F,
    PROPERTY_SIZE_MASK /* */ = 0x70,
    PROPERTY_ARRAY_MASK /**/ = 0x80
};

enum UNP_DataTypeSizes {
    StaticSize1 = 0x00,
    StaticSize2 = 0x10,
    StaticSize4 = 0x20,
    StaticSize12 = 0x30,
    StaticSize16 = 0x40,
    DynamicSizeUint8 = 0x50,
    DynamicSizeUint16 = 0x60,
    DynamicSizeUint32 = 0x70,
};

export default PropertyTag;
export { PropertyTag, UNP_PropertyTypes, UNP_PropertyMasks, UNP_DataTypeSizes };