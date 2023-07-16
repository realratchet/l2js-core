import * as _path from "path";
import { SUPPORTED_EXTENSIONS } from "./supported-extensions";

abstract class AAssetLoader<
    TPackage extends C.APackage = C.APackage,
    TCorePackage extends C.ACorePackage = C.ACorePackage,
    TEnginePackage extends C.AEnginePackage = C.AEnginePackage,
    TNativePackage extends C.ANativePackage = C.ANativePackage
> {
    private packages = new Map<string, Map<C.SupportedExtensions_T, TPackage | TCorePackage | TEnginePackage | TNativePackage>>();

    protected abstract createPackage(UPackage: C.APackageConstructor | C.ACorePackageConstructor | C.AEnginePackageConstructor, downloadPath: string): TPackage;
    protected abstract createNativePackage(UNativePackage: C.ANativePackageConstructor): TNativePackage;

    protected constructor() { }

    private pkgCore: TCorePackage;
    private pkgEngine: TEnginePackage;
    private pkgNative: TNativePackage;

    public getCorePackage() { return this.pkgCore; }
    public getEnginePackage() { return this.pkgEngine; }
    public getNativePackage() { return this.pkgNative; }

    protected init(assetList: L2JS.Core.IAssetListInfo, { UPackage, UCorePackage, UEnginePackage, UNativePackage }: InitParams_T) {
        this.packages.set("native", new Map([["U", this.createNativePackage(UNativePackage)]]))

        for (let [path, downloadPath] of Object.entries(assetList)) {
            const [pkgName, pkgExt] = pathToPkgName(path);

            if (!this.packages.has(pkgName))
                this.packages.set(pkgName, new Map());

            const packages = this.packages.get(pkgName);

            if (packages.has(pkgExt))
                throw new Error(`Package already registered: ${pkgName}`);

            const fullPkgName = `${pkgName}.${pkgExt}`.toLowerCase();

            let PackageConstructor: any;

            switch (fullPkgName) {
                case "core.u": PackageConstructor = UCorePackage; break;
                case "engine.u": PackageConstructor = UEnginePackage; break;
                default: PackageConstructor = UPackage; break;
            }

            packages.set(pkgExt, this.createPackage(PackageConstructor, downloadPath));
        }

        this.pkgCore = this.getPackage("core");
        this.pkgEngine = this.getPackage("engine");
        this.pkgNative = this.getPackage("native");

        return this;
    }

    public getPackage<T extends string | "core" | "engine" | "native">(packagePath: T): ReturnType<T, TPackage, TCorePackage, TEnginePackage, TNativePackage>;
    public getPackage<T extends string | "core" | "engine" | "native">(pkgName: T, impType?: string): ReturnType<T, TPackage, TCorePackage, TEnginePackage, TNativePackage>;
    public getPackage<T extends string | "core" | "engine" | "native">(pkgName: T, impType?: string): ReturnType<T, TPackage, TCorePackage, TEnginePackage, TNativePackage> {

        if (arguments.length === 1) {
            if (pkgName === "native" || pkgName === "core" || pkgName === "engine")
                return getPackage<T, TPackage, TCorePackage, TEnginePackage, TNativePackage>(this.packages, pkgName, "Script");

            const [_pkgName, _pkgExt] = pathToPkgName(pkgName);
            const potentialPkgs = this.packages.get(_pkgName);
            const pkg = potentialPkgs.get(_pkgExt);

            return pkg as ReturnType<T, TPackage, TCorePackage, TEnginePackage, TNativePackage>;
        }

        const pkg = getPackage<T, TPackage, TCorePackage, TEnginePackage, TNativePackage>(this.packages, pkgName, impType);

        if (pkg === null)
            throw new Error(`Package '${pkgName}[${impType}]' not found!`);

        return pkg;
    }

    public hasPackage(pkgName: string, impType: string) {
        return getPackage(this.packages, pkgName, impType) !== null;
    }

    public async load<T extends TPackage = TPackage>(pkg: T): Promise<T> {
        const pkgsToLoad: Array<C.APackage> = [pkg];

        while (pkgsToLoad.length > 0) {
            const pkg = pkgsToLoad.shift();

            if (pkg.isDecoded()) continue;

            await pkg.decode();

            for (const entry of pkg.imports.filter(imp => imp.className !== "Package")) {
                let entrypackage = pkg.getImportEntry(entry.idPackage);

                while (entrypackage.idPackage !== 0)
                    entrypackage = pkg.getImportEntry(entrypackage.idPackage);

                const packageName = entrypackage.objectName;
                const className = entry.className;

                if (!this.hasPackage(packageName, className))
                    throw new Error(`Package '${packageName}' for type '${className}' does not exist.`);

                const dependency = this.getPackage(packageName, className);

                if (!dependency)
                    debugger;

                if (pkgsToLoad.includes(dependency)) continue;

                pkgsToLoad.push(dependency);
            }
        }

        return pkg;
    }
}

export default AAssetLoader;
export { AAssetLoader };

const impProperties = ["ObjectProperty", "StructProperty", "ByteProperty", "BoolProperty", "NameProperty", "FloatProperty", "ArrayProperty", "IntProperty", "ClassProperty", "StrProperty"];
const packageTypes = new Set<C.SupportedExtensions_T>(SUPPORTED_EXTENSIONS.slice().concat(["NATIVE"]));
const extToTypes = new Map<C.SupportedExtensions_T, Set<string>>([...packageTypes].map(v => {
    return [v, new Set<string>()] as [C.SupportedExtensions_T, Set<string>];
}));

const impToTypes = new Map<string, Set<C.SupportedExtensions_T>>();

function addImpExtension(ext: C.SupportedExtensions_T, ...classList: string[]) {
    for (const cls of classList) {
        const impName = cls as string;

        extToTypes.get(ext).add(impName);

        if (!impToTypes.has(impName))
            impToTypes.set(impName, new Set());

        impToTypes.get(impName).add(ext);
    }
}

addImpExtension("UNR", "Level");
addImpExtension("UTX", "Texture", "TexOscillator", "Shader", "ColorModifier", "FinalBlend", "TexEnvMap", "Combiner", "TexCoordSource", "TexPanner");
addImpExtension("UAX", "Sound");
addImpExtension("USX", "StaticMesh");
addImpExtension("UKX", "Animation", "SkeletalMesh", "VertMesh");
addImpExtension("USK", "Effect");
addImpExtension("U", "Script", "State", "Class", "Struct", "Function", "Enum", ...impProperties, "Texture");

function pathToPkgName(path: string): [string, C.SupportedExtensions_T] {
    const ext = _path.extname(path);
    const extUpper = ext.slice(1).toUpperCase() as C.SupportedExtensions_T;

    if (!packageTypes.has(extUpper))
        throw new Error(`Unsupported package type '${ext}' for package '${_path.basename(path)}'`);

    return [_path.basename(path, ext), extUpper];
}

export { pathToPkgName };

function getPackage<T extends string | "native", TPackage, TCorePackage, TEnginePackage, TNativePackage>(allPackages: Map<string, Map<C.SupportedExtensions_T, TPackage | TNativePackage | TCorePackage | TEnginePackage>>, pkgName: T, impType: string): ReturnType<T, TPackage, TCorePackage, TEnginePackage, TNativePackage> {
    const packages = allPackages.get(pkgName.toLowerCase());
    const validExts = impToTypes.get(impType);

    let pkg: TPackage | TNativePackage | TCorePackage | TEnginePackage = null;

    for (const ext of validExts) {
        if (!packages.has(ext)) continue;

        pkg = packages.get(ext);
        break;
    }

    return pkg as ReturnType<T, TPackage, TCorePackage, TEnginePackage, TNativePackage>;
}


type ReturnType<T extends string | "native" | "core" | "engine", TPackage, TCorePackage, TEnginePackage, TNativePackage> =
    T extends "native" ? TNativePackage
    : T extends "core" ? TCorePackage
    : T extends "engine" ? TEnginePackage
    : TPackage;

type InitParams_T = Record<string, any> | { // can contain anything but must contain at least these two packages
    UPackage: C.APackageConstructor,
    UCorePackage: C.ACorePackageConstructor,
    UEnginePackage: C.ANativePackageConstructor,
    UNativePackage: C.ANativePackageConstructor,
};