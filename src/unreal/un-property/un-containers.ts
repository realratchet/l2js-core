import BufferValue from "../../buffer-value";

abstract class UContainer {

}

class ObjectContainer<T extends UObject = UObject> extends UContainer {
    public friendlyName: string;
    public _value: T = null;

    public constructor(friendlyName: string) {
        super();

        if (!friendlyName)
            debugger;

        this.friendlyName = friendlyName;
    }

    public copy(other: ObjectContainer) {
        // debugger;
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

    public copy(other: ClassContainer) {
        // debugger;
    }
}

class BoolContainer extends UContainer {
    public value: boolean;

    constructor(value = false) {
        super();

        this.value = value;
    }

    toString() { return `Bool[${this.value}]`; }

    public copy(other: BoolContainer) { this.value = other.value; }
}

class NameContainer extends UContainer {
    public _value: number;
    protected readonly nameTable: UName[];

    public get value() { return this.nameTable[this._value].name; };

    constructor(nameTable: UName[], value = 0) {
        super();

        if (!nameTable)
            debugger;

        this.nameTable = nameTable;
        this._value = value;
    }

    toString() { return `Name[${this.value}]`; }
}

class EnumContainer extends UContainer implements IConstructable {
    public value: number;
    public readonly name: string;

    protected readonly enumerations: Readonly<string[]>;

    public constructor(name: string, enumerations: string[] | FNameArray, value: number) {
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

    public copy(other: EnumContainer) { this.value = other.value; }
}

export { UContainer, ObjectContainer, ClassContainer, BoolContainer, NameContainer, EnumContainer };