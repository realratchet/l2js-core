import BufferValue from "../buffer-value";
import UEncodedFile from "./un-encoded-file";
import UExport from "./un-export";
import UGeneration from "./un-generation";
import UHeader from "./un-header";
import UImport from "./un-import";
import UName from "./un-name";

class UPackage extends UEncodedFile {
    public exports: UExport[];
    public imports: UImport[];
    public nameTable: UName[];
    public header: UHeader;

    public exportGroups: Record<string, { index: number; export: UExport; }[]>;
    public importGroups: Record<string, { import: UImport; index: number; }[]>;

    public nameHash = new Map<string, number>();

    public isDecoded() { return !!this.buffer; }

    public async decode(): Promise<this> {
        if (this.buffer) return this;
        if (this.promiseDecoding) {
            await this.promiseDecoding;
            return this;
        }

        const readable = this.asReadable();
        const signature = await readable._doDecode();

        if (signature.value !== 0x9E2A83C1)
            throw new Error(`Invalid signature: '0x${signature.toString(16).toUpperCase()}' expected '0x9E2A83C1'`);

        const header = new UHeader();
        const uint32 = new BufferValue(BufferValue.uint32);
        const int32 = new BufferValue(BufferValue.uint32);

        header.version = readable.read(uint32).value as number;
        header.packageFlags = readable.read(int32).value as number;
        header.nameCount = readable.read(int32).value as number;
        header.nameOffset = readable.read(int32).value as number;
        header.exportCount = readable.read(int32).value as number;
        header.exportOffset = readable.read(int32).value as number;
        header.importCount = readable.read(int32).value as number;
        header.importOffset = readable.read(int32).value as number;

        const dbgNameCount = header.nameCount;
        const dbgNameOffset = header.nameOffset.toString(16).toUpperCase();
        const dbgExportCount = header.exportCount;
        const dbgExportOffset = header.exportOffset.toString(16).toUpperCase();
        const dbgImportCount = header.importCount;
        const dbgImportOffset = header.importOffset.toString(16).toUpperCase();

        console.log(`'${readable.path}' => Names:${dbgNameOffset}[${dbgNameCount}] Exports:${dbgExportOffset}[${dbgExportCount}] Imports:${dbgImportOffset}[${dbgImportCount}]`);

        if (readable.path === "assets/maps/20_21.unr") {
            console.assert(header.getArchiveFileVersion() === 123);
            console.assert(header.packageFlags === 0x1);
            console.assert(header.nameCount === 12165);
            console.assert(header.nameOffset === 0x40);
            console.assert(header.exportCount === 11379);
            console.assert(header.exportOffset === 0xFB1BF5);
            console.assert(header.importCount === 490);
            console.assert(header.importOffset === 0xFB0712);
        }

        if (header.getArchiveFileVersion() < 68) {
            header.heritageCount = readable.read(uint32).value as number;
            header.heritageOffset = readable.read(uint32).value as number;
        } else {
            readable.read(header.guid);

            const generationCount = readable.read(new BufferValue(BufferValue.int32)).value as number;

            if (readable.path === "assets/maps/20_21.unr") {
                console.assert(generationCount === 1);
            }

            for (let i = 0, gc = generationCount as number; i < gc; i++) {
                const gen = new UGeneration();

                gen.exportCount = readable.read(uint32).value as number;
                gen.nameCount = readable.read(uint32).value as number;

                header.generations.push(gen);
            }
        }

        const [nameTable, nameHash] = readable.loadNames(header);

        const exports = readable.loadExports(header, nameTable);
        const imports = readable.loadImports(header, nameTable);

        readable.exports = exports;
        readable.imports = imports;
        readable.nameTable = nameTable;
        readable.nameHash = nameHash;
        readable.header = header;

        readable.importGroups = readable.imports.reduce((accum, imp, index) => {
            const impType = imp.className;
            const list = accum[impType] = accum[impType] || [];

            list.push({ import: imp, index: -index - 1 });

            return accum;
        }, {} as Record<string, { import: UImport, index: number }[]>);

        readable.exportGroups = readable.exports.reduce((accum, exp, index) => {

            const expType = readable.getPackageName(exp.idClass as number) || "Class";
            const list = accum[expType] = accum[expType] || [];

            list.push({ index, export: exp });

            return accum;
        }, {} as Record<string, { index: number, export: UExport }[]>);

        Object.assign(this, readable, { isReadable: false });

        return this;
    }

    protected loadNames(header: UHeader): [UName[], Map<string, number>] {
        this.seek(header.nameOffset as number, "set");

        const nameTable: UName[] = [];
        const nameHash = new Map<string, number>();

        const char = new BufferValue<"char">(BufferValue.char);
        const uint32 = new BufferValue<"uint32">(BufferValue.uint32);

        for (let i = 0, nc = header.nameCount as number; i < nc; i++) {
            const uname = new UName();

            uname.name = this.read(char).string;
            uname.flags = this.read(uint32).value as number;

            nameTable.push(uname);
            nameHash.set(uname.name, i);
        }

        return [nameTable, nameHash];
    }

    protected loadExports(header: UHeader, nameTable: UName[]) {
        this.seek(header.exportOffset as number, "set");

        const exports: UExport[] = [];
        const compat32 = new BufferValue(BufferValue.compat32);
        const uint32 = new BufferValue(BufferValue.uint32);

        for (let i = 0, ec = header.exportCount as number; i < ec; i++) {
            const uexport = new UExport();

            uexport.idClass = this.read(compat32).value as number;
            uexport.idSuper = this.read(compat32).value as number;
            uexport.idPackage = this.read(uint32).value as number;
            uexport.idObjectName = this.read(compat32).value as number;

            uexport.index = i;
            uexport.objectName = nameTable[uexport.idObjectName as number].name;

            uexport.flags = this.read(uint32).value as number;
            uexport.size = this.read(compat32).value as number;

            if (uexport.size as number > 0)
                uexport.offset = this.read(compat32).value as number;

            exports.push(uexport);
        }

        return exports;
    }

    protected loadImports(header: UHeader, nameTable: UName[]) {
        this.seek(header.importOffset as number, "set");

        const imports: UImport[] = [];
        const index = new BufferValue(BufferValue.compat32);
        const int32 = new BufferValue(BufferValue.int32);

        for (let i = 0, ic = header.importCount; i < ic; i++) {
            const uimport = new UImport();

            uimport.index = i;

            this.read(index);
            uimport.idClassPackage = index.value as number;
            uimport.classPackage = nameTable[uimport.idClassPackage].name;

            this.read(index);
            uimport.idClassName = index.value as number;
            uimport.className = nameTable[uimport.idClassName].name;

            uimport.idPackage = this.read(int32).value as number;

            this.read(index);
            uimport.idObjectName = index.value as number;
            uimport.objectName = nameTable[uimport.idObjectName].name;

            imports.push(uimport);
        }

        return imports;
    }

    public getPackageName(index: number) {
        return index < 0
            ? this.imports[-index - 1].objectName as string
            : index > 0
                ? this.exports[index].objectName as string
                : null;
    }

    public toString() { return `Package=(${this.path}, imports=${this.imports.length}, exports=${this.exports.length})`; }
}

export default UPackage;
export { UPackage };