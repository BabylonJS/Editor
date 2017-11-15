import Editor from '../editor';
import Picker from '../gui/picker';

import Tools from '../tools/tools';

export interface CreateFiles {
    name: string;

    data?: string | Uint8Array | ArrayBuffer;
    folder?: CreateFiles[];
}

export interface GetFiles {
    name: string;
    folder: any;
}

export default abstract class Storage {
    // Public members
    public editor: Editor;
    public picker: Picker = null;

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
     */
    public async openPicker (title: string, filesToWrite: CreateFiles[]): Promise<void> {
        let files = await this.getFiles();
        let current: GetFiles = null;
        let previous: GetFiles[] = [];

        this.picker = new Picker('Export on OneDrive');
        this.picker.addItems(files);
        this.picker.open(async (items) => {
            await this.recursivelyCreateFiles(current.folder, filesToWrite);
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
                files = (!Tools.isElectron() ? [{ name: '..', folder: null }] : []).concat(await this.getFiles(file? file.folder : null));
                this.picker.window.unlock();

                this.picker.clear();
                this.picker.addItems(files);
                this.picker.refreshGrid();
            }
        };
    }

    /**
     * Recursively creates the given files (uncluding folders)
     * @param folder: the parent folder of the files
     * @param files files to create
     */
    protected async recursivelyCreateFiles (folder: any, files: CreateFiles[]): Promise<void> {
        const folders: CreateFiles[] = [];
        let promises: Promise<void>[] = [];

        // Create files
        for (const f of files) {
            if (f.folder)
                folders.push(f);
            else
                promises.push(this.createFiles(folder, [f]));
        }

        await Promise.all(promises);

        // Create folders
        promises = [];

        for (const f of folders) {
            promises.push(this.createFolders(folder, [f.name]));
        }

        await Promise.all(promises);
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
