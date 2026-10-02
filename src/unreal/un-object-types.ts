import type APackage from "./un-package";
import type UExport from "./un-export";
import type PropertyTag from "./un-property/un-property-tag";

type Constructable_T<T = any> = {
    load(pkg: APackage, tag?: PropertyTag): T;
};

type Serializable_T<T = any> = Constructable_T<T> & {
    load(pkg: APackage): T;
    load(pkg: APackage, info: UExport): T;
    load(pkg: APackage, info: PropertyTag): T;
};

export type { Constructable_T, Serializable_T };
