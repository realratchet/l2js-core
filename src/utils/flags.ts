function allFlags(flags: number, matchFlags: number): boolean { return (flags & matchFlags) === flags; }
function anyFlags(flags: number, matchFlags: number): boolean { return (flags & matchFlags) !== 0; }

function flagBitsToDict<T extends string>(flags: number, enum_: Record<T, number>) {
    const flagNames = Object.keys(enum_).filter(x => !x.match(/\d+/));
    return flagNames.reduce((acc, name) => {
        if (anyFlags(flags, enum_[name as T]))
            acc[name as T] = true;

        return acc;
    }, {} as FlagDict<T>);
}

export { anyFlags, allFlags, flagBitsToDict }