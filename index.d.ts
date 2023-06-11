import UObject from "./src/index";

export default UObject;
export * from "./src/index";

declare global {
    namespace L2JS {
        namespace Core {
            export type IAssetListInfo = Record<string, string>;
            export type SupportedExtensions_T = "UNR" | "UTX" | "USX" | "UAX" | "U" | "UKX" | "USK" | "NATIVE";

            export type AAssetLoader = import("./src/asset-loader").AAssetLoader;

            export type APackage = import("./src/unreal/un-package").APackage;
            export type ANativePackage = import("./src/unreal/un-package").ANativePackage;
            export type PackageFlags_T = import("./src/unreal/un-package").PackageFlags_T;

            export type BigNumberTypes_T = "int64" | "uint64";
            export type PrimitiveNumberTypes_T = "compat32" | "float" | "int32" | "uint32" | "int8" | "uint8" | "int16" | "uint16";
            export type NumberTypes_T = BigNumberTypes_T | PrimitiveNumberTypes_T;
            export type StringTypes_T = "char" | "utf16";

            export type ValueTypeNames_T = NumberTypes_T | StringTypes_T | "guid" | "buffer";

            export type ValidTypes_T<T extends ValueTypeNames_T> = {
                bytes?: number;
                signed: boolean;
                name: T;
                dtype?: BigInt64ArrayConstructor | BigUint64ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int8ArrayConstructor | Uint8ArrayConstructor | Float32ArrayConstructor;
            };

            export type UName = import("./src/unreal/un-name").UName;

            export type BufferValue<T extends ValueTypeNames_T = ValueTypeNames_T> = import("./src/buffer-value").BufferValue<T>;
            export type Seek_T = "current" | "set";

            export type NativePropertyTypes_T =
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

            export type NativeEngineTypes_T =
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

            export type NativeCoreTypes_T =
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

            export type NativeTypes_T =
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

            export type UProperty = import("./src/unreal/un-property/un-properties").UProperty;
            export type PropertyTag = import("./src/unreal/un-property/un-property-tag").PropertyTag;

            export interface IConstructable {
                load(pkg: APackage, tag?: PropertyTag): this;
            }

            export type UObject = import("./src/unreal/un-object").UObject;
            export type UImport = import("./src/unreal/un-import").UImport;
            export type UExport<T extends UObject = UObject> = import("./src/unreal/un-export").UExport<T>;

            export interface ISerializable extends IConstructable {
                load(pkg: APackage): this;
                load(pkg: APackage, info: UExport): this;
                load(pkg: APackage, info: PropertyTag): this;
            }

            export type UField = import("./src/unreal/un-field").UField;
            export type UStruct = import("./src/unreal/un-struct").UStruct;
            export type UState = import("./src/unreal/un-state").UState;
            export type UClass = import("./src/unreal/un-class").UClass;
            export type UEnum = import("./src/unreal/un-enum").UEnum;
            export type UFunction = import("./src/unreal/un-function").UFunction;
            export type UConst = import("./src/unreal/un-const").UConst;

            export interface INativeRegistry {
                getClass(className: string): any;
                hasNativeFunc(nativeIndex: number | string): boolean;
                registerNativeFunc(nativeIndex: number | string, func: Function): void;
                getNativeFuncName(nativeIndex: number | string): string;
            }

            export interface IBufferValueProperty<T extends ValueTypeNames_T = ValueTypeNames_T> {
                // readonly isNumericType: true;
                // buildBuffer(): BufferValue<T>;
            }

            export type FNumber<T extends ValueTypeNames_T = ValueTypeNames_T> = import("./src/unreal/un-number").FNumber<T>;
            export type FArray<T extends UObject | FNumber<ValueTypeNames_T> | IConstructable> = import("./src/unreal/un-array").FArray<T>;
            export type FNameArray = import("./src/unreal/un-array").FNameArray;
            export type FObjectArray<T extends UObject = UObject> = import("./src/unreal/un-array").FObjectArray<T>;

            export type APackageConstructor = new (loader: AAssetLoader, downloadPath: string) => C.APackage;
            export type ANativePackageConstructor = new (loader: AAssetLoader) => C.ANativePackage;
        }
    }
}