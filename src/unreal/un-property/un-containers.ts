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

    toString() { return `UObject<${this.friendlyName}>[${this._value}]`; }
}

class ClassContainer extends UContainer {
    public cls: UClass;
    
    public constructor(cls: UClass) {
        super();

        this.cls = cls;
    }
}

class BoolContainer extends UContainer {
    public value: boolean = false;

    toString() { return `Bool[${this.value}]`; }
}

class NameContainer extends UContainer {
    public value = "None";

    toString() { return `Name[${this.value}]`; }
}

class EnumContainer extends UContainer implements IConstructable {
    public value: number;
    protected readonly enumerations: Readonly<string[]>;
    public readonly name: string;

    constructor(name: string, enumerations: string[] | FNameArray, value: number) {
        super();

        this.name = name;
        this.value = value;
        this.enumerations = Object.freeze(enumerations);

        Object.seal(this);
    }

    load(pkg: UPackage, tag?: PropertyTag): this {
        if (!!tag) {
            debugger;
            throw new Error("Method not implemented.");
        }

        this.value = pkg.read(new BufferValue(BufferValue.uint8)).value;

        return this;
    }

    valueOf(): number { return this.value; }
    toString() {
        return isFinite(this.value) && this.value < this.enumerations.length ? `Enum<${this.name}>[${this.enumerations[this.value]}]` : `Enum<${this.name}>[<invalid '${this.value}']>`;
    }
}

export { UContainer, ObjectContainer, ClassContainer, BoolContainer, NameContainer, EnumContainer };