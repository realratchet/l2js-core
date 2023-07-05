function allFlags(flags: number, matchFlags: number): boolean { return (flags & matchFlags) === flags; }
function anyFlags(flags: number, matchFlags: number): boolean { return (flags & matchFlags) !== 0; }

const regexp = /\d+/;

function flagBitsToDict<T extends string>(flags: number, enum_: Record<T, number>) {
    const flagNames = Object.keys(enum_).filter(x => !x.match(regexp));
    return flagNames.reduce((acc, name) => {
        if (anyFlags(flags, enum_[name as T]))
            acc[name as T] = true;

        return acc;
    }, {} as C.FlagDict<T>);
}

export { anyFlags, allFlags, flagBitsToDict }