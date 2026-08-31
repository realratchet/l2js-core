import registerNativeFuncs from "./un-operators";

type NativeRegistry_T = {
    getClass(className: string): any;
    hasNativeFunc(nativeIndex: number | string): boolean;
    registerNativeFunc(nativeIndex: number | string, func: Function): void;
    getNativeFuncName(nativeIndex: number | string): string;
};

const NATIVE: Record<string, any> = {};
const NATIVE_FUNCS: Record<string, Function> = {};

const UNativeRegistry = new class UNativeRegistry implements NativeRegistry_T {
    public getClass(className: string) {
        const clsName = className.toLowerCase();

        if (!(clsName in NATIVE))
            throw new Error(`Native class '${className}' not registered`);

        return NATIVE[clsName];
    }

    public hasNativeFunc(nativeIndex: number | string): boolean { return nativeIndex in NATIVE_FUNCS; }
    public registerNativeFunc(nativeIndex: number | string, func: Function) {
        if (this.hasNativeFunc(nativeIndex))
            throw new Error(`Native index '${nativeIndex}' already registered!`);

        NATIVE_FUNCS[nativeIndex] = func;
    }

    public getNativeFuncName(nativeIndex: number | string) {
        if (!this.hasNativeFunc(nativeIndex))
            throw new Error(`Native index '${nativeIndex}' not registered!`);

        // if (NATIVE_FUNCS[nativeIndex].name === "fn_not_implemented")
        //     debugger;

        return NATIVE_FUNCS[nativeIndex].name;
    }
}();

registerNativeFuncs(UNativeRegistry);

export default UNativeRegistry;
export { UNativeRegistry };
export type { NativeRegistry_T };
