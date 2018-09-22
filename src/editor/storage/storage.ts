import Editor from '../editor';
import Picker from '../gui/picker';

import Tools from '../tools/tools';
import Window from '../gui/window';

export type FileType = string | Uint8Array | ArrayBuffer;

export interface CreateFiles {
    name: string;

    data?: FileType | Promise<FileType>;
    folder?: CreateFiles[];
    doNotOverride?: boolean;
}

export interface GetFiles {
    name: string;
    folder: any;
}

export default abstract class Storage {
    // Public members
    public editor: Editor;
    public picker: Picker = null;

    public onCreateFiles: (folder: string) => void;

    // Protected members
    protected filesCount: number = 0;
    protected _uploadedCount: number = 0;

    /**
     * Constructor
     * @param editor: the editor reference
     */
    constructor (editor: Editor) {
        this.editor = editor;
    }

    /**
     * Opens the folder picker
     * @param title the title of the picker
     * @param filesToWrite the array of files to write on the HDD
     * @param folder the current working directory to browse
     * @param overrideFilename if the file browser should override the filename
     */
    public async openPicker (title: string, filesToWrite: CreateFiles[], folder?: string, overrideFilename?: boolean): Promise<any> {
        if (folder) {
            await this.uploadFiles(folder, filesToWrite);
            return folder;
        }

        let files = await this.getFiles(folder);
        let current: GetFiles = { folder: 'root', name: 'root' };
        let previous: GetFiles[] = [];

        this.picker = new Picker('Export...');
        this.picker.addItems(files);

        return await new Promise<string>((resolve, reject) => {
            this.picker.open(async (items) => {
                await this.uploadFiles(current.folder, filesToWrite);
                resolve(current.folder);
            });

            this.picker.grid.onClick = async (ids) => {
                const id = ids[0];
                let file = (id === 0 && current) ? previous.pop() : files[id];
    
                if (file === current)
                    file = previous.pop();
    
                if (!file || file.folder) {
                    if (file)
                        previous.push(file);
                    
                    current = file;
    
                    this.picker.window.lock('Loading ' + (file ? file.name : 'Root') + '...');
                    files = (!Tools.IsElectron() ? [{ name: '..', folder: null }] : []).concat(await this.getFiles(Tools.IsElectron() ? files[id].folder : (file ? file.folder : null)));
                    this.picker.window.unlock();
    
                    this.picker.clear();
                    this.picker.addItems(files);
                    this.picker.refreshGrid();
                }
            };
        });
    }

    /**
     * Uploads the files
     * @param folder the target folder
     * @param filesToWrite the files to upload
     */
    protected async uploadFiles (folder: string, filesToWrite: CreateFiles[]): Promise<void> {
        this._uploadedCount = 0;
        this.filesCount = this.recursivelyGetFilesToUploadCount(filesToWrite);

        this.editor.layout.element.sizeTo('bottom', 50);
        this.editor.layout.lockPanel('bottom', `Uploading... (${this._uploadedCount} / ${this.filesCount})`, true);

        this.onCreateFiles && this.onCreateFiles(folder);

        try {
            await this.recursivelyCreateFiles(folder, filesToWrite);
        } catch (e) {
            Window.CreateAlert('Cannot upload: ' + e, 'Uploading Error');
        }

        // Unlock
        this.editor.layout.unlockPanel('bottom');
        this.editor.layout.element.sizeTo('bottom', 0);
    }

    /**
     * Recursively creates the given files (uncluding folders)
     * @param folder: the parent folder of the files
     * @param files files to create
     */
    protected async recursivelyCreateFiles (folder: any, files: CreateFiles[]): Promise<void> {
        const folders: CreateFiles[] = [];
        const promises: Promise<void>[] = [];

        // Create files
        const existingFiles = await this.getFiles(folder);

        for (const f of files) {
            if (f.folder)
                folders.push(f);
            else {
                if (f.doNotOverride && existingFiles.find(ef => ef.name === f.name))
                    continue;
                
                promises.push(this.createFiles(folder, [f]).then(() => {
                    this.uploadedCount++;
                }));
            }
        }

        await Promise.all(promises);

        // Create folders
        promises.splice(0, promises.length);

        for (const f of folders) {
            promises.push(this.createFolders(folder, [f.name]).then(() => {
                this.uploadedCount++;
            }));
        }

        await Promise.all(promises);

        // Recurse on folders
        // OneDrive needs to re-get files in order to get folders ids
        const newFiles = await this.getFiles(folder);
        
        for (const f of folders) {
            const newFolders = newFiles.filter(nf => nf.name === f.name);
            await this.recursivelyCreateFiles(newFolders[0].folder, f.folder);
        }
    }

    /**
     * Returns the number of files to upload
     * @param files the files to count
     */
    protected recursivelyGetFilesToUploadCount (files: CreateFiles[]): number {
        let count = 0;

        files.forEach(f => {
            if (f.folder)
                count += this.recursivelyGetFilesToUploadCount(f.folder);
            else
                count++;
        });

        return count;
    }

    /**
     * Sets the new uploaded count files
     * @param value: the number of uploaded files
     */
    protected set uploadedCount (value: number) {
        this._uploadedCount = value;
        this.editor.layout.lockPanel('bottom', `Uploading... (${this._uploadedCount} / ${this.filesCount})`, true);
    }

    /**
     * Returns the number of uploaded files
     */
    protected get uploadedCount (): number {
        return this._uploadedCount;
    }

    /**
     * Creates the given folders
     * @param folder the parent folder
     * @param names the folders names
     */
    public abstract async createFolders (folder: any, names: string[]): Promise<void>;

    /**
     * Creates the given files
     * @param folder the parent folder
     * @param files the files to write
     */
    public abstract async createFiles (folder: any, files: CreateFiles[]): Promise<void>;

    /**
     * Returns the files available in the given folder
     * @param folder the parent folder
     */
    public abstract async getFiles (folder?: any): Promise<GetFiles[]>;
}
