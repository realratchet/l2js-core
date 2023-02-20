import * as _path from "path";
import { SUPPORTED_EXTENSIONS } from "./supported-extensions";

abstract class AssetLoader {
    private packages = new Map<string, Map<SupportedExtensions_T, UPackage>>();

    protected abstract createNativePackage(UNativePackage: typeof import("./unreal/un-package").UNativePackage): UNativePackage;
    protected abstract createPackage(UPackage: typeof import("./unreal/un-package").UPackage, downloadPath: string): UPackage;

    private constructor() { }

    private init(assetList: IAssetListInfo, { UPackage, UNativePackage }: typeof import("./unreal/un-package")) {
        this.packages.set("native", new Map([["U", this.createNativePackage(UNativePackage)]]))

        for (let [path, downloadPath] of Object.entries(assetList)) {
            const [pkgName, pkgExt] = pathToPkgName(path);

            if (!this.packages.has(pkgName))
                this.packages.set(pkgName, new Map());

            const packages = this.packages.get(pkgName);

            if (packages.has(pkgExt))
                throw new Error(`Package already registered: ${pkgName}`);

            packages.set(pkgExt, this.createPackage(UPackage, downloadPath));

        }

        return this;
    }

    public getPackage<T extends string | "native">(pkgName: T, impType: string): ReturnType<T> {
        const pkg = getPackage(this.packages, pkgName, impType);

        if (pkg === null)
            throw new Error(`Package '${pkgName}[${impType}]' not found!`);

        return pkg as any;
    }

    public hasPackage(pkgName: string, impType: string) {
        return getPackage(this.packages, pkgName, impType) !== null;
    }

    public async load(pkg: UPackage): Promise<UPackage> {
        const pkgsToLoad = [pkg];

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

export default AssetLoader;
export { AssetLoader };

const impProperties = ["ObjectProperty", "StructProperty", "ByteProperty", "BoolProperty", "NameProperty", "FloatProperty", "ArrayProperty", "IntProperty", "ClassProperty", "StrProperty"];
const packageTypes = new Set<SupportedExtensions_T>(SUPPORTED_EXTENSIONS.slice().concat(["NATIVE"]));
const extToTypes = new Map<SupportedExtensions_T, Set<string>>([...packageTypes].map(v => {
    return [v, new Set<string>()] as [SupportedExtensions_T, Set<string>];
}));

const impToTypes = new Map<string, Set<SupportedExtensions_T>>();

function addImpExtension(ext: SupportedExtensions_T, ...classList: string[]) {
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

function pathToPkgName(path: string): [string, SupportedExtensions_T] {
    const ext = _path.extname(path);
    const extUpper = ext.slice(1).toUpperCase() as SupportedExtensions_T;

    if (!packageTypes.has(extUpper))
        throw new Error(`Unsupported package type '${ext}' for package '${_path.basename(path)}'`);

    return [_path.basename(path, ext), extUpper];
}

function getPackage(allPackages: Map<string, Map<SupportedExtensions_T, UPackage>>, pkgName: string, impType: string): UPackage {
    const packages = allPackages.get(pkgName.toLowerCase());
    const validExts = impToTypes.get(impType);

    let pkg: UPackage = null;

    for (const ext of validExts) {
        if (!packages.has(ext)) continue;

        pkg = packages.get(ext);
        break;
    }

    return pkg;
}

type ReturnType<T extends string | "native"> = T extends "native" ? UNativePackage : UPackage;