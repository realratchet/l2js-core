enum ObjectFlags_T {
    NoFlags = 0x00000000,
    Transactional = 0x00000001,   // Object is transactional.
    Unreachable = 0x00000002,	// Object is not reachable on the object graph.
    Public = 0x00000004,	// Object is visible outside its package.
    TagImp = 0x00000008,	// Temporary import tag in load/save.
    TagExp = 0x00000010,	// Temporary export tag in load/save.
    SourceModified = 0x00000020,   // Modified relative to source files.
    TagGarbage = 0x00000040,	// Check during garbage collection.
    Final = 0x00000080,	// Object is not visible outside of class.
    PerObjectLocalized = 0x00000100,	// Object is localized by instance name, not by class.
    NeedLoad = 0x00000200,   // During load, indicates object needs loading.
    HighlightedName = 0x00000400,	// A hardcoded name which should be syntax-highlighted.
    EliminateObject = 0x00000400,   // NULL out references to this during garbage collecion.
    InSingularFunc = 0x00000800,	// In a singular function.
    RemappedName = 0x00000800,   // Name is remapped.
    Protected = 0x00000800,   // Property is protected (may only be accessed from its owner class or subclasses) -- rjp
    Suppress = 0x00001000,	//warning: Mirrored in UnName.h. Suppressed log name.
    StateChanged = 0x00001000,   // Object did a state change.
    InEndState = 0x00002000,   // Within an EndState call.
    Transient = 0x00004000,	// Don't save object.
    Preloading = 0x00008000,   // Data is being preloaded from file.
    LoadForClient = 0x00010000,	// In-file load for client.
    LoadForServer = 0x00020000,	// In-file load for client.
    LoadForEdit = 0x00040000,	// In-file load for client.
    Standalone = 0x00080000,   // Keep object around for editing even if unreferenced.
    NotForClient = 0x00100000,	// Don't load this object for the game client.
    NotForServer = 0x00200000,	// Don't load this object for the game server.
    NotForEdit = 0x00400000,	// Don't load this object for the editor.
    Destroyed = 0x00800000,	// Object Destroy has already been called.
    NeedPostLoad = 0x01000000,   // Object needs to be postloaded.
    HasStack = 0x02000000,	// Has execution stack.
    Native = 0x04000000,   // Native (UClass only).
    Marked = 0x08000000,   // Marked (for debugging).
    ErrorShutdown = 0x10000000,	// ShutdownAfterError called.
    DebugPostLoad = 0x20000000,   // For debugging Serialize calls.
    DebugSerialize = 0x40000000,   // For debugging Serialize calls.
    DebugDestroy = 0x80000000,   // For debugging Destroy calls.
    ContextFlags = NotForClient | NotForServer | NotForEdit, // All context flags.
    LoadContextFlags = LoadForClient | LoadForServer | LoadForEdit, // Flags affecting loading.
    Load = ContextFlags | LoadContextFlags | Public | Final | Protected | Standalone | Native | SourceModified | Transactional | HasStack | PerObjectLocalized, // Flags to load from Unrealfiles.
    Keep = Native | Marked | PerObjectLocalized, // Flags to persist across loads.
    ScriptMask = Transactional | Public | Final | Transient | NotForClient | NotForServer | NotForEdit | Standalone // Script-accessible flags.
};

export default ObjectFlags_T;
export { ObjectFlags_T };