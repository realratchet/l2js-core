type PropertyExtraPars_T = {
    arrayDimensions?: number,
    flags?: number,
    categoryNameId?: number,
    categoryName?: string,
    valueId?: number
};

type PropertyTypes_T =
    | "ByteProperty"
    | "ObjectProperty"
    | "StructProperty"
    | "IntProperty"
    | "BoolProperty"
    | "NameProperty"
    | "FloatProperty"
    | "ArrayProperty"
    | "ClassProperty"
    | "StrProperty"
    | "PointerProperty"
    | "FixedArrayProperty"
    | "MapProperty"
    | "StringProperty"
    | "DelegateProperty";

type UnserializedProperty_T =
    | [string, Exclude<PropertyTypes_T, "ArrayProperty">, PropertyExtraPars_T?]
    | [string, "ArrayProperty", ["Struct" | "Class", string], PropertyExtraPars_T?];

export type { PropertyExtraPars_T, PropertyTypes_T, UnserializedProperty_T };
