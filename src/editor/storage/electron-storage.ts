import Editor from '../editor';
import Tools from '../tools/tools';
import Request from '../tools/request';

import Storage, { CreateFiles, GetFiles } from './storage';

export default class ElectronStorage extends Storage {
    /**
     * Constructor
     * @param editor: the editor reference
     */
    constructor (editor: Editor) {
        super(editor);
    }

    /**
     * Opens the folder picker (override default behavior)
     * @param title the title of the picker
     */
    public async openPicker (title: string, filesToWrite: CreateFiles[], folder?: string): Promise<void> {
        const paths = folder ? [folder] : await Request.Get<string[]>(`http://localhost:1337/files:/paths?type=openDirectory${folder ? '&folder=' + folder : ''}`);

        await Request.Post('http://localhost:1337/files:/workingDirectory', JSON.stringify({
            name: paths[0]
        }));
        await this.uploadFiles(paths[0], filesToWrite);
    }

    /**
     * Creates the given folders
     * @param folder the parent folder
     * @param names the folders names
     */
    public async createFolders (folder: any, names: string[]): Promise<void> {
        for (const n of names) {
            await Request.Post('http://localhost:1337/files:/folder', JSON.stringify({
                name: n
            }));
        }
    }
    
    /**
     * Creates the given files
     * @param folder the parent folder
     * @param files the files to write
     */
    public async createFiles (folder: any, files: CreateFiles[]): Promise<void> {
        for (const f of files) {
            await Request.Put('http://localhost:1337/files:/write?name=' + f.name + '&folder=' + folder, f.data, {
                'Content-Type': 'application/octet-stream'
            });
        }
    }

    /**
     * Returns the files available in the given folder
     * @param folder the parent folder
     */
    public async getFiles (folder: string): Promise<GetFiles[]> {
        const files = await Request.Get<any>('http://localhost:1337/files' + (folder ? '?path=' + folder : ''));

        const result: GetFiles[] = [];
        files.value.forEach(v => {
            result.push({ name: v.name, folder: v.folder ? v.folder : null });
        });
        return result;
    }
}
