import {
    FileSystemProvider, Uri, FileStat, FileType, Disposable,
    FileChangeEvent, EventEmitter, Event, FileChangeType, FileSystemError
} from 'vscode';
import * as path from 'path';
import * as uuid from 'uuid';

import Sockets from './utils/socket';

export interface CustomCode {
    name: string;
    id: string;
    code: string;
}

export class CustomEntry implements FileStat {
    /**
     * Constructor
     */
    constructor(
        public name: string,
        public type: FileType = FileType.File,
        public ctime: number = Date.now(),
        public mtime: number = Date.now(),
        public size: number = 0
    ) {
        // Empty
    }
}

export class CustomFile extends CustomEntry {
    // Public members
    public data: Uint8Array = null;
    public id: string;

    /**
     * Constructor
     */
    constructor(name: string, id: string) {
        super(name, FileType.File);
        this.id = id;
    }
}

export class CustomDirectory extends CustomEntry {
    public entries: Map<string, CustomEntry> = new Map();

    /**
     * Constructor
     */
    constructor(name: string) {
        super(name, FileType.Directory);
    }
}

export default class CustomFileSystem implements FileSystemProvider {
    // Public members
    public root: CustomDirectory = new CustomDirectory('');

    public readonly _emitter = new EventEmitter<FileChangeEvent[]>();
    public readonly onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;

    // Private members
    private _libs: { [name: string]: string } = { };

    /**
     * Constructor
     */
    constructor () {
        // Create folders
        this.createDirectory(Uri.parse('babylonjs-editor:/behaviors'));
        this.createDirectory(Uri.parse('babylonjs-editor:/materials'));
        this.createDirectory(Uri.parse('babylonjs-editor:/post-processes'));
        this.createDirectory(Uri.parse('babylonjs-editor:/typings'));

        // Register events
        Sockets.OnDisconnect = (() => {
            this._clearDirectory('behaviors');
            this._clearDirectory('materials');
            this._clearDirectory('post-processes');
            this._clearDirectory('typings');
        });

        Sockets.OnGotProject = (p => {
            // Clear and create directory
            this._clearDirectory('typings');

            // Write files
            this.writeFile(Uri.parse('babylonjs-editor:/tsconfig.json'), Buffer.from(p.tsconfig), { create: true, overwrite: true }, uuid());
            this.writeFile(Uri.parse('babylonjs-editor:/typings/babylon.module.d.ts'), Buffer.from(p.babylonjs), { create: true, overwrite: true }, uuid());
            this.writeFile(Uri.parse('babylonjs-editor:/typings/babylonjs.materials.module.d.ts'), Buffer.from(p.babylonjs_materials), { create: true, overwrite: true }, uuid());
            this.writeFile(Uri.parse('babylonjs-editor:/typings/babylonjs.postProcess.module.d.ts'), Buffer.from(p.babylonjs_postProcess), { create: true, overwrite: true }, uuid());
            this.writeFile(Uri.parse('babylonjs-editor:/typings/tools.d.ts'), Buffer.from(p.tools), { create: true, overwrite: true }, uuid());
            this.writeFile(Uri.parse('babylonjs-editor:/typings/mobile.d.ts'), Buffer.from(p.mobile), { create: true, overwrite: true }, uuid());
            this.writeFile(Uri.parse('babylonjs-editor:/typings/path-finder.d.ts'), Buffer.from(p.pathFinder), { create: true, overwrite: true }, uuid());
        });

        Sockets.OnGotBehaviorCodes = (scripts => {
            // Clear
            Array.isArray(scripts) && this._clearDirectory('behaviors');
            // Transform to array
            scripts = Array.isArray(scripts) ? scripts : [scripts];

            // Write scripts
            scripts.forEach(s => {
                const uri = Uri.parse('babylonjs-editor:/behaviors/' + s.name + '.ts');
                this.writeFile(uri, Buffer.from(s.code), { create: true, overwrite: true }, s.id);

                this._libs[s.name] = `declare module "${s.name}" {\n${s.code}\n}`;
            });

            // Write libs
            const libs = Object.keys(this._libs).map(k => this._libs[k]).join('\n');
            const libsUri = Uri.parse('babylonjs-editor:/behaviors.d.ts');
            this.writeFile(libsUri, Buffer.from(libs), { create: true, overwrite: true }, uuid());
        });

        Sockets.OnGotMaterialCodes = (scripts => {
            // Clear
            Array.isArray(scripts) && this._clearDirectory('materials');
            // Transform to array
            scripts = Array.isArray(scripts) ? scripts : [scripts];

            // Write scripts
            scripts.forEach(s => {
                const root = 'babylonjs-editor:/materials/';
                // Create folder
                this.createDirectory(Uri.parse(root + s.name));

                this.writeFile(Uri.parse(`${root}${s.name}/${s.name}.ts`), Buffer.from(s.code), { create: true, overwrite: true }, s.id);
                this.writeFile(Uri.parse(`${root}${s.name}/${s.name}.fragment.fx`), Buffer.from(s.pixel), { create: true, overwrite: true }, s.id);
                this.writeFile(Uri.parse(`${root}${s.name}/${s.name}.vertex.fx`), Buffer.from(s.vertex), { create: true, overwrite: true }, s.id);
                this.writeFile(Uri.parse(`${root}${s.name}/config.json`), Buffer.from(s.config), { create: true, overwrite: true }, s.id);
            });
        });

        Sockets.OnGotPostProcessCodes = (scripts => {
            // Clear
            Array.isArray(scripts) && this._clearDirectory('post-processes');
            // Transform to array
            scripts = Array.isArray(scripts) ? scripts : [scripts];

            // Write scripts
            scripts.forEach(s => {
                const root = 'babylonjs-editor:/post-processes/';
                // Create folder
                this.createDirectory(Uri.parse(root + s.name));

                this.writeFile(Uri.parse(`${root}${s.name}/${s.name}.ts`), Buffer.from(s.code), { create: true, overwrite: true }, s.id);
                this.writeFile(Uri.parse(`${root}${s.name}/${s.name}.fragment.fx`), Buffer.from(s.pixel), { create: true, overwrite: true }, s.id);
                this.writeFile(Uri.parse(`${root}${s.name}/config.json`), Buffer.from(s.config), { create: true, overwrite: true }, s.id);
            });
        });
    }

    /**
     * Returns starts of the given file Uri
     * @param uri: the uri of the file to get stats
     */
    public stat (uri: Uri): FileStat {
        return this._lookup(uri, false);
    }

    /**
     * Reads the given directory
     * @param uri: the uri of the directory
     */
    public readDirectory (uri: Uri): [string, FileType][] {
        const entry = this._lookupAsDirectory(uri, false);
        const result: [string, FileType][] = [];

        for (const [name, child] of entry.entries) {
            result.push([name, child.type]);
        }
        return result;
    }

    /**
     * Reads the given file
     * @param uri: the uri of the file to read
     */
    public readFile (uri: Uri): Uint8Array {
        return this._lookupAsFile(uri, false).data;
    }

    /**
     * Writes the given file to the virtual file system
     * @param uri: the uri of the file
     * @param content: the content of the file
     * @param options: the options of the file when creating
     */
    public writeFile (uri: Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }, id?: string): void {
        // Get values
        const basename = path.posix.basename(uri.path);
        const parent = this._lookupParentDirectory(uri);

        let entry = <CustomFile> parent.entries.get(basename);
        if (entry instanceof CustomDirectory) throw FileSystemError.FileIsADirectory(uri);
        if (!entry && !options.create) throw FileSystemError.FileNotFound(uri);
        if (entry && options.create && !options.overwrite) throw FileSystemError.FileExists(uri);

        if (!entry) {
            entry = new CustomFile(basename, id || uuid.v4());
            parent.entries.set(basename, entry);
            this._emitter.fire([{ type: FileChangeType.Created, uri }]);
        }

        entry.mtime = Date.now();
        entry.size = content.byteLength;
        entry.data = content;

        // Event
        this._emitter.fire([{ type: FileChangeType.Changed, uri }]);

        // Update
        if (!id) {
            const name = uri.path.replace(path.dirname(uri.path) + '/', '');
            const root = this._lookupParentDirectory(Uri.parse(path.dirname(uri.path)));

            const result = {
                name: name.replace(/.ts|.fragment.fx|.vertex.fx|.json/, ''),
                id: entry.id,
                code: name.indexOf('.ts') !== -1 && content.toString(),
                pixel: name.indexOf('.fragment.fx') !== -1 && content.toString(),
                vertex: name.indexOf('.vertex.fx') !== -1 && content.toString(),
                config: name.indexOf('config.json') !== -1 && content.toString()
            };
            switch (root.name || parent.name) {
                case 'behaviors': Sockets.UpdateBehaviorCode(result); break;
                case 'materials': Sockets.UpdateMaterialCode(result); break;
                case 'post-processes': Sockets.UpdatePostProcessCode(result); break;
                default: throw FileSystemError.FileNotFound(uri);
            }
        }
    }

    /**
     * Renames the given file
     */
    public rename (oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): void {
        // Not supported
        debugger;
    }

    /**
     * Deletes the given file
     * @param uri: the uri of the file to delete
     */
    public delete (uri: Uri): void {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        const basename = path.posix.basename(uri.path);
        const parent = this._lookupAsDirectory(dirname, false);
        if (!parent.entries.has(basename))
            return;

        parent.entries.delete(basename);
        parent.mtime = Date.now();
        parent.size -= 1;

        // Event
        this._emitter.fire([{ type: FileChangeType.Changed, uri: dirname }, { uri, type: FileChangeType.Deleted }]);
    }

    /**
     * Creates a new directory
     * @param uri: the uri of the folder to create
     */
    public createDirectory (uri: Uri): void {
        const basename = path.posix.basename(uri.path);
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        const parent = this._lookupAsDirectory(dirname, false);

        let entry = new CustomDirectory(basename);
        parent.entries.set(entry.name, entry);
        parent.mtime = Date.now();
        parent.size += 1;
        this._emitter.fire([{ type: FileChangeType.Changed, uri: dirname }, { type: FileChangeType.Created, uri }]);
    }

    /**
     * Watches the resources
     */
    public watch (resource: Uri, opts): Disposable {
        // ignore, fires for all changes...
        return new Disposable(() => { });
    }

    // Clears the given directory
    private _clearDirectory (dir: string): void {
        for (const [name] of this.readDirectory(Uri.parse('babylonjs-editor:/' + dir))) {
            this.delete(Uri.parse(`babylonjs-editor:/${dir}/${name}`));
        }
    }

    // Looks up for an entry identified by its 
    private _lookup (uri: Uri, silent: boolean = false): CustomEntry | undefined {
        let parts = uri.path.split('/');
        let entry: CustomEntry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child: CustomEntry | undefined;
            if (entry instanceof CustomDirectory) {
                child = entry.entries.get(part);
            }
            if (!child) {
                if (!silent) {
                    throw FileSystemError.FileNotFound(uri);
                } else {
                    return undefined;
                }
            }
            entry = child;
        }
        return entry;
    }

    // Looks up for a parent directory
    private _lookupParentDirectory (uri: Uri): CustomDirectory {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        return this._lookupAsDirectory(dirname, false);
    }

    // Looks up as a directory
    private _lookupAsDirectory (uri: Uri, silent: boolean): CustomDirectory {
        let entry = this._lookup(uri, silent);
        if (entry instanceof CustomDirectory) {
            return entry;
        }
        throw FileSystemError.FileNotADirectory(uri);
    }

    // Looks up as a file
    private _lookupAsFile (uri: Uri, silent: boolean): CustomFile {
        let entry = this._lookup(uri, silent);
        if (entry instanceof CustomFile) {
            return entry;
        }
        throw FileSystemError.FileIsADirectory(uri);
    }
}
