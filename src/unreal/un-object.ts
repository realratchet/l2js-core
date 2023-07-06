import UStack from "./un-stack";
import UExport from "./un-export";
import APackage from "./un-package";
import BufferValue from "../buffer-value";
import { FPrimitiveArray } from "./un-array";
import ObjectFlags_T from "./un-object-flags";
import PropertyTag, { UNP_PropertyTypes } from "./un-property/un-property-tag";

abstract class UObject implements C.ISerializable {
    declare public ["constructor"]: typeof UObject & { friendlyName?: string };

    public static readonly LAZY_CLONE_ON_USE = true;

    public static readonly CLEANUP_NAMESPACE = true;
    public static readonly isSerializable = true;
    public static UNREAD_AS_NATIVE = false;

    public readonly isObject = true;
    public isConstructed: boolean = false;

    public objectName = "Exp_None";
    public exportIndex?: number = null;
    public exp?: UExport = null;
    public stack?: UStack = null;

    protected skipRemaining = false;
    protected careUnread = true;

    protected readHead: number = NaN;
    protected readStart: number = NaN;
    protected readTail: number = NaN;

    protected isLoading = false;
    protected isReady = false;

    protected pkg: APackage;
    public readonly propertyDict = new Map<string, any>();
    public nativeBytes?: BufferValue<"buffer"> = null;

    public constructor() {
        this.makeLayout();

        if (!this.isConstructed)
            throw new Error(`'${this.constructor.name}' must be created via package.`)

        this.onSuperConstructed();
    }

    public static getUnserializedProperties(): C.UnserializedProperty_T[] { return []; }
    public static collectUnserializedProperties(): C.UnserializedProperty_T[] {
        if (this === UObject)
            return this.getUnserializedProperties();

        let base = this as any;
        const dependencyProps: Record<string, C.UnserializedProperty_T> = {};

        do {
            for (const prop of base.getUnserializedProperties()) {
                dependencyProps[prop[0]] = prop;
            }
            base = base.__proto__;

        } while (base !== UObject);

        return Object.values(dependencyProps);
    }

    protected onSuperConstructed(): void { }
    protected makeLayout(): void { throw new Error(`Layout for '${this.constructor.name}' must be overloaded by the package, was this created via package?.`); }
    protected findPropReader<T1 = any, T2 = any>(propName: string): C.UProperty<T1, T2> { { throw new Error(`Layout for '${this.constructor.name}' must be overloaded by the package, was this created via package?.`); } }

    protected setReadPointers(exp: UExport) {
        this.readStart = this.readHead = exp.offset;
        this.readTail = this.readHead + exp.size;
    }

    public get byteCount() { return this.readTail - this.readStart; }
    public get bytesUnread() { return this.readTail - this.readHead; }
    public get byteOffset() { return this.readHead - this.readStart; }

    public get objectFlags() { return this.exp ? this.exp.objectFlags : {} };


    protected static getConstructorName(): string {
        debugger;
        throw new Error("Must be implemented by inheriting class because JS does not support inheritence chain.");
    }

    public static get inheritenceChain() {
        if (this === UObject)
            return ["Object"];

        let base = this as any;
        const dependencyChain = new Array<string>();

        do {
            dependencyChain.push(base.getConstructorName());
            base = base.__proto__;

        } while (base !== UObject);

        dependencyChain.push("Object");

        return dependencyChain.reverse();
    }

    protected readNamedProps(pkg: APackage, _exp: UExport) {
        pkg.seek(this.readHead, "set");

        if (this.readHead < this.readTail) {
            do {
                const tag = PropertyTag.from(pkg, this.readHead);

                if (!tag.isValid()) break;

                this.loadProperty(pkg, tag);

                this.readHead = pkg.tell();

            } while (this.readHead < this.readTail);
        }

        this.readHead = pkg.tell();
    }

    protected getPropertyMap(): Record<string, string> { return {}; }
    protected getPropertyVarName(tag: PropertyTag) { return tag.name; }
    protected findValidProperty(varName: string) { return this.findPropReader(varName); }

    public nativeClone<T extends UObject = UObject>(): T {
        const Constructor = this.constructor as any as new () => T;

        return new Constructor().copy(this);
    }

    public loadSelf() {
        if (!this.pkg || !this.pkg)
            return this;

        return this.load(this.pkg, this.exp);
    }

    protected loadNative(pkg: APackage) {
        for (const propName of this.propertyDict.keys()) {
            const property = this.findPropReader(propName);

            const propValue = property.readValue(pkg, null);

            this.propertyDict.set(propName, propValue);
        }

        this.isLoading = false;
        this.isReady = true;

        return this;
    }

    protected copy(other: UObject): this {
        if (this.constructor !== other.constructor)
            throw new Error(`'${this.constructor.name}' !== '${other.constructor.name}'`);

        for (const [name, val] of other.propertyDict.entries()) {
            this.propertyDict.set(name, deepClone(val));

        }

        return this;
    }

    protected loadProperty(pkg: APackage, tag: PropertyTag) {
        const offStart = pkg.tell();
        const offEnd = offStart + tag.dataSize;

        const varName = this.getPropertyVarName(tag);
        const { name: propName } = tag;

        if (!varName)
            throw new Error(`Unrecognized property '${propName}' for '${this.constructor.name}' of type '${tag.getTypeName()}'`);

        // const propReader = this.findPropReader(varName);

        // if (tag.type === UNP_PropertyTypes.UNP_StructProperty) {
        //     const propertyOrig = this.findValidProperty(varName);

        //     if (propertyOrig === null) {

        //         const defStruct = (propReader as C.UStructProperty).initializeDefault(pkg.loader.getNativePackage());

        //         this.propertyDict.set(varName, defStruct);
        //     }
        // }

        const property = this.findValidProperty(varName);

        if (!property)
            throw new Error(`Cannot map '${tag.getTypeName()}' property '${propName}' -> '${varName}' for '${this.constructor.friendlyName ?? this.constructor.name}'`);

        if (property.type !== tag.type)
            throw new Error(`Property type mismatch got '${tag.getTypeName()}' expected '${property.getTypeName()}'`);

        property.readProperty(pkg, tag, this.propertyDict);

        // if (pkg.tell() < offEnd)
        //     console.warn(`Unread '${tag.name}' ${offEnd - pkg.tell()} bytes (${((offEnd - pkg.tell()) / 1024).toFixed(2)} kB) for package '${pkg.path}'`);

        if (pkg.tell() > offEnd)
            throw new Error(`Reader exceeded by '${tag.name}' ${offEnd - pkg.tell()} bytes (${((offEnd - pkg.tell()) / 1024).toFixed(2)} kB) for package '${pkg.path}'`);

        pkg.seek(offEnd, "set");
    }

    public setExport(pkg: APackage, exp: UExport) {
        this.objectName = `Exp_${exp.objectName}`;
        this.exportIndex = exp.index;
        this.exp = exp;
        this.pkg = pkg.asReadable();
    }

    protected preLoad(pkg: APackage, exp: UExport): void {
        // console.log(`Loading '${exp}' from '${pkg}'`)
        const flags = exp.flags;

        if (!this.exp)
            this.setExport(pkg, exp);

        pkg.seek(exp.offset, "set");
        this.setReadPointers(exp);

        if (flags & ObjectFlags_T.HasStack && exp.size > 0) {

            this.stack = UStack.loadStack(pkg);
        }

        this.readHead = pkg.tell();
    }

    public load(pkg: APackage): this;
    public load(pkg: APackage, info: UExport): this;
    public load(pkg: APackage, info: PropertyTag): this;
    public load(pkg: APackage, info?: any) {
        if (info instanceof UExport)
            return this.loadWithExport(pkg, info);

        if (info instanceof PropertyTag)
            return this.loadWithPropertyTag(pkg, info);

        return this.loadNative(pkg);
    }

    protected loadWithPropertyTag(pkg: APackage, tag: PropertyTag): this {
        const exp = new UExport();

        exp.objectName = `${tag.name}[Struct<${tag.structName}>]`;
        exp.offset = pkg.tell();
        exp.size = tag.dataSize;
        exp.isFake = true;

        return this.loadWithExport(pkg, exp);
    }

    protected loadWithExport(pkg: APackage, exp: UExport): this {
        if (this.isLoading || this.isReady)
            return this;

        this.isLoading = true;

        if (this.isReady)
            debugger;

        this.preLoad(pkg, exp);

        if (!isFinite(this.readHead))
            debugger;

        if (!isFinite(this.readTail))
            debugger;

        if (this.isReady)
            debugger;

        if ((this.readTail - this.readHead) > 0) {
            this.doLoad(pkg, exp);
            this.postLoad(pkg, exp);
        }

        this.isLoading = false;
        this.isReady = true;

        return this;
    }

    protected doLoad(pkg: APackage, exp: UExport): void { this.readNamedProps(pkg, exp); }

    protected postLoad(pkg: APackage, _exp: UExport): void {
        this.readHead = pkg.tell();

        if (UObject.UNREAD_AS_NATIVE && this.bytesUnread > 0)
            this.nativeBytes = pkg.read(BufferValue.allocBytes(this.readTail - this.readHead));


        if (this.skipRemaining) this.readHead = this.readTail;
        if (this.bytesUnread > 0 && this.careUnread) {
            const constructorName = (this.constructor as any).isDynamicClass ? `${(this.constructor as any).friendlyName}[Dynamic]` : this.constructor.name;
            // console.warn(`Unread '${this.objectName}' (${constructorName}) ${this.bytesUnread} bytes (${((this.bytesUnread) / 1024).toFixed(2)} kB) in package '${pkg.path}', only ${this.readHead - this.readStart} bytes read.`);
        }

        if (UObject.CLEANUP_NAMESPACE) {
            // Object.values(this.getPropertyMap()).forEach(propName => {
            //     if ((this as any)[propName] === undefined)
            //         delete (this as any)[propName];
            // });
        }
    }

    public toJSON(): any {
        const properties: Record<string, any> = {};

        for (const [propName, propValue] of this.propertyDict.entries())
            properties[propName] = propValue.toJSON();

        return {
            type: this.constructor.name,
            name: this.exp?.objectName ?? this.objectName ?? "None",
            index: this.exportIndex ?? null,
            filename: this.pkg?.path ?? null,
            value: properties
        };
    }

    public toString(...args: any): string;
    public toString() {
        return `${this.constructor.name}=(name=${this.exp?.objectName ?? this.objectName}${this.exp ? `, exp=${this.exp.index}` : ''})`;
    }
}

export default UObject;
export { UObject };

function deepClone<T = any>(value: T | T[]): T | T[] {
    if (value instanceof Array && value.constructor === Array)
        return value.map(v => deepClone(v)) as T[];

    if (["number", "boolean", "string"].includes(typeof value)) return value;
    if (value == null) return null;
    if (value instanceof UObject) return value.nativeClone() as T;

    if (value instanceof FPrimitiveArray) return value.nativeClone() as T;

    debugger;
    throw new Error("not yet implemented");

}