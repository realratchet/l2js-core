import BufferValue from "../../buffer-value";

abstract class UContainer {
    abstract clone(): UContainer;
    abstract copy(other: UContainer): this;
}

class ObjectContainer<T extends UObject = UObject> extends UContainer {
    public friendlyName: string;
    public _value: T = null;

    protected valueId = new BufferValue(BufferValue.compat32);

    public constructor(friendlyName: string) {
        super();

        if (!friendlyName)
            debugger;

        this.friendlyName = friendlyName;
    }

    public copy(other: ObjectContainer<T>) {
        this.valueId.copy(other.valueId);

        return this;
    }

    public clone() {
        return new ObjectContainer<T>(this.friendlyName).copy(this);
    }


    public load(pkg: UPackage) {
        pkg.read(this.valueId);

        return this;
    }

    toString() { return `UObject<${this.friendlyName}>[${this._value}]`; }
}

class ClassContainer extends UContainer {

    public cls: UClass;

    public constructor(cls: UClass) {
        super();

        this.cls = cls;
    }

    toString() { return `UClass[${this.cls}]`; }


    public copy(other: ClassContainer | ObjectContainer) {
        //     debugger;

        return this;
    }

    public clone() {
        return new ClassContainer(this.cls).copy(this);
    }
}

class BoolContainer extends UContainer {
    public value: boolean;

    constructor(value = false) {
        super();

        this.value = value;
    }

    toString() { return `Bool[${this.value}]`; }

    public copy(other: BoolContainer) {
        this.value = other.value;
        return this;
    }

    public clone() { return new BoolContainer(this.value); }
}

class NameContainer extends UContainer {

    protected _value: number;
    protected nameTable: UName[];

    public get value() { return this.nameTable[this._value].name; };

    constructor(nameTable: UName[], value = 0) {
        super();

        if (!nameTable)
            debugger;

        this.nameTable = nameTable;
        this._value = value;
    }

    public toString() { return `Name[${this.value}]`; }

    public load(pkg: UPackage) {
        this.nameTable = pkg.nameTable;
        this._value = pkg.read(new BufferValue(BufferValue.compat32)).value;
    }

    public copy(other: NameContainer): this { throw new Error("Method not implemented."); }
    public clone() { return new NameContainer(this.nameTable, this._value); }
}

class EnumContainer extends UContainer implements IConstructable {
    public value: number;
    public readonly name: string;

    protected readonly enumerations: Readonly<string[]>;

    public constructor(name: string, enumerations: string[] | readonly string[] | FNameArray, value: number) {
        super();

        this.name = name;
        this.value = value;
        this.enumerations = Object.freeze(enumerations);

        Object.seal(this);
    }

    public load(pkg: UPackage, tag?: PropertyTag): this {
        if (!!tag) {
            debugger;
            throw new Error("Method not implemented.");
        }

        this.value = pkg.read(new BufferValue(BufferValue.uint8)).value;

        return this;
    }

    public valueOf(): number { return this.value; }
    public toString() {
        return isFinite(this.value) && this.value < this.enumerations.length ? `Enum<${this.name}>[${this.enumerations[this.value]}]` : `Enum<${this.name}>[<invalid '${this.value}']>`;
    }

    public copy(other: EnumContainer) {
        this.value = other.value;
        return this;
    }
    public clone() {
        return new EnumContainer(this.name, this.enumerations, this.value);
    }
}

export { UContainer, ObjectContainer, ClassContainer, BoolContainer, NameContainer, EnumContainer };