import {
    FileSystemProvider, Uri, FileStat, FileType, Disposable,
    FileChangeEvent, EventEmitter, Event, FileChangeType, FileSystemError
} from 'vscode';
import * as fetch from 'node-fetch';
import * as path from 'path';
import * as uuid from 'uuid';

import Sockets from './socket';
import { debug } from 'util';

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

    /**
     * Constructor
     */
    constructor () {
        // Register events
        Sockets.onGotBehaviorCodes = (scripts => {
            // Refresh, so clear if array is passed
            if (Array.isArray(scripts)) {
                for (const [name] of this.readDirectory(Uri.parse('babylonjs-editor:/'))) {
                    this.delete(Uri.parse(`babylonjs-editor:/${name}`));
                }
            } else {
                // Transform to an array
                scripts = [scripts];
            }

            scripts.forEach(s => {
                const uri = Uri.parse('babylonjs-editor:/' + s.name + '.ts');
                this.writeFile(uri, Buffer.from(s.code), { create: true, overwrite: true }, s.id);
            });
        });

        // Init
        this.init();
    }

    /**
     * Inits the file system
     */
    public async init (): Promise<void> {
        const result = await fetch('http://localhost:1337/behaviorCodes');
        const scripts = <CustomCode[]> await result.json();

        scripts.forEach(s => {
            const uri = Uri.parse('babylonjs-editor:/' + s.name + '.ts');
            this.writeFile(uri, Buffer.from(s.code), { create: true, overwrite: true }, s.id);
        });
    }

    /**
     * Returns starts of the given file Uri
     * @param uri: the uri of the file to get stats
     */
    public stat(uri: Uri): FileStat {
        return this._lookup(uri, false);
    }

    /**
     * Reads the given directory
     * @param uri: the uri of the directory
     */
    public readDirectory(uri: Uri): [string, FileType][] {
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
    public readFile(uri: Uri): Uint8Array {
        return this._lookupAsFile(uri, false).data;
    }

    /**
     * Writes the given file to the virtual file system
     * @param uri: the uri of the file
     * @param content: the content of the file
     * @param options: the options of the file when creating
     */
    public writeFile(uri: Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }, id?: string): void {
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
            const name = uri.path.replace('.ts', '').replace('/', '');
            Sockets.UpdateBehaviorCode({ name: name, id: entry.id, code: content.toString() });
        }
    }

    /**
     * Renames the given file
     */
    public rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): void {
        // Not supported
        debugger;
    }

    /**
     * Deletes the given file
     * @param uri: the uri of the file to delete
     */
    public delete(uri: Uri): void {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        const basename = path.posix.basename(uri.path);
        const parent = this._lookupAsDirectory(dirname, false);
        if (!parent.entries.has(basename))  throw FileSystemError.FileNotFound(uri);

        parent.entries.delete(basename);
        parent.mtime = Date.now();
        parent.size -= 1;

        // Event
        this._emitter.fire([{ type: FileChangeType.Changed, uri: dirname }, { uri, type: FileChangeType.Deleted }]);
    }

    /**
     * Creates a new directory
     */
    public createDirectory(uri: Uri): void {
        // Not supported
        debugger;
    }

    /**
     * Watches the resources
     */
    public watch(resource: Uri, opts): Disposable {
        // ignore, fires for all changes...
        return new Disposable(() => { });
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
    private _lookupParentDirectory(uri: Uri): CustomDirectory {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        return this._lookupAsDirectory(dirname, false);
    }

    // Looks up as a directory
    private _lookupAsDirectory(uri: Uri, silent: boolean): CustomDirectory {
        let entry = this._lookup(uri, silent);
        if (entry instanceof CustomDirectory) {
            return entry;
        }
        throw FileSystemError.FileNotADirectory(uri);
    }

    // Looks up as a file
    private _lookupAsFile(uri: Uri, silent: boolean): CustomFile {
        let entry = this._lookup(uri, silent);
        if (entry instanceof CustomFile) {
            return entry;
        }
        throw FileSystemError.FileIsADirectory(uri);
    }
}
