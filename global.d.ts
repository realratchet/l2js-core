type BigNumberTypes_T = "int64" | "uint64";
type PrimitiveNumberTypes_T = "compat32" | "float" | "int32" | "uint32" | "int8" | "uint8" | "int16" | "uint16";
type NumberTypes_T = BigNumberTypes_T | PrimitiveNumberTypes_T;
type StringTypes_T = "char" | "utf16";
type ValueTypeNames_T = NumberTypes_T | StringTypes_T | "guid" | "buffer";

type ValidTypes_T<T extends ValueTypeNames_T> = {
    bytes?: number;
    signed: boolean;
    name: T;
    dtype?: BigInt64ArrayConstructor | BigUint64ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int8ArrayConstructor | Uint8ArrayConstructor | Float32ArrayConstructor;
};

type BufferValue<T extends ValueTypeNames_T = ValueTypeNames_T> = import("./src/buffer-value").BufferValue<T>;
type Seek_T = "current" | "set";

type IAssetListInfo = Record<string, string>;

type UObject = import("./src/unreal/un-object").UObject;

type UProperty = import("./src/unreal/un-property/un-properties").UProperty;
type UNumericProperty = import("./src/unreal/un-property/un-properties").UNumericProperty;
type PropertyTag = import("./src/unreal/un-property/un-property-tag").PropertyTag;

type UField = import("./src/unreal/un-field").UField;
type UStruct = import("./src/unreal/un-struct").UStruct;
type UState = import("./src/unreal/un-state").UState;
type UClass = import("./src/unreal/un-class").UClass;
type UEnum = import("./src/unreal/un-enum").UEnum;
type UFunction = import("./src/unreal/un-function").UFunction;

type UExport<T extends UObject = UObject> = import("./src/unreal/un-export").UExport<T>;

type UPackage = import("./src/unreal/un-package").UPackage;
type UNativePackage = import("./src/unreal/un-package").UNativePackage;

type AssetLoader = import("./src/asset-loader").AssetLoader;

type SupportedExtensions_T = "UNR" | "UTX" | "USX" | "UAX" | "U" | "UKX" | "USK" | "NATIVE";

interface IConstructable {
    load(pkg: UPackage, tag?: PropertyTag): this;
}

type FNumber<T extends ValueTypeNames_T = ValueTypeNames_T> = import("./src/unreal/un-number").FNumber<T>;
type FArray<T extends UObject | FNumber<ValueTypeNames_T> | IConstructable> = import("./src/unreal/un-array").FArray<T>;
type FNameArray = import("./src/unreal/un-array").FNameArray;

type NativePropertyTypes_T =
    | "Property"
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

type NativeEngineTypes_T =
    | "Font"
    | "Palette"
    | "Sound"
    | "Music"
    | "Primitive"
    | "Mesh"
    | "MeshAnimation"
    | "TerrainSector"
    | "TerrainPrimitive"
    | "LodMesh"
    | "StaticMesh"
    | "SkeletalMesh"
    | "Animation"
    | "ConvexVolume"
    | "MeshInstance"
    | "LodMeshInstance"
    | "SkeletalMeshInstance"
    | "StaticMeshInstance"
    | "Model"
    | "LevelBase"
    | "Level"
    | "LevelSummary"
    | "Polys"
    | "BspNodes"
    | "BspSurfs"
    | "Vectors"
    | "Verts"
    | "Texture"
    | "FractalTexture"
    | "FireTexture"
    | "IceTexture"
    | "WaterTexture"
    | "WaveTexture"
    | "WetTexture"
    | "ScriptedTexture"
    | "Client"
    | "Viewport"
    | "Canvas"
    | "Console"
    | "Player"
    | "NetConnection"
    | "DemoRecConnection"
    | "PendingLevel"
    | "NetPendingLevel"
    | "DemoPlayPendingLevel"
    | "Channel"
    | "ControlChannel"
    | "ActorChannel"
    | "FileChannel"
    | "Actor"
    | "Light"
    | "Inventory"
    | "Weapon"
    | "NavigationPoint"
    | "LiftExit"
    | "LiftCenter"
    | "WarpZoneMarker"
    | "InventorySpot"
    | "TriggerMarker"
    | "ButtonMarker"
    | "PlayerStart"
    | "Teleporter"
    | "PathNode"
    | "Decoration"
    | "Carcass"
    | "Projectile"
    | "Keypoint"
    | "locationid"
    | "InterpolationPoint"
    | "Triggers"
    | "Trigger"
    | "HUD"
    | "Menu"
    | "Info"
    | "Mutator"
    | "GameInfo"
    | "ZoneInfo"
    | "LevelInfo"
    | "WarpZoneInfo"
    | "SkyZoneInfo"
    | "SavedMove"
    | "ReplicationInfo"
    | "PlayerReplicationInfo"
    | "GameReplicationInfo"
    | "InternetInfo"
    | "StatLog"
    | "StatLogFile"
    | "Decal"
    | "SpawnNotify"
    | "Brush"
    | "Mover"
    | "Pawn"
    | "Scout"
    | "PlayerPawn"
    | "Camera"
    | "Bitmap";

type NativeCoreTypes_T =
    | "Object"
    | "Field"
    | "Const"
    | "Enum"
    | "Struct"
    | "Function"
    | "State"
    | "Class"
    | "TextBuffer"
    | NativePropertyTypes_T;

type NativeTypes_T =
    | NativeCoreTypes_T
    | NativeEngineTypes_T
    | "FinalBlend"
    | "StaticMesh"
    | "Shader"
    | "TerrainSector"
    | "PhysicsVolume"
    | "Model"
    | "AmbientSoundObject"
    | "TerrainInfo"
    | "StaticMeshActor"
    | "WaterVolume"
    | "Emitter"
    | "MusicVolume"
    | "BlockingVolume"
    | "FadeColor"
    | "StaticMeshInstance"
    | "TexRotator"
    | "TexPanner"
    | "TexCoordSource"
    | "ColorModifier"
    | "TexOscillator"
    | "DefaultPhysicsVolume"
    | "TexEnvMap"
    | "Cubemap"
    | "MeshAnimation"
    | "MeshEmitter"
    | "SpriteEmitter";

interface ISerializable {
    load(pkg: UPackage): this;
    load(pkg: UPackage, info: UExport): this;
    load(pkg: UPackage, info: PropertyTag): this;
}

interface IBufferValueProperty<T extends ValueTypeNames_T = ValueTypeNames_T> {
    readonly isNumericType: true;
    buildBuffer(): BufferValue<T>;
}