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
     * @param filesToWrite the array of files to write on the HDD
     * @param folder the current working directory to browse
     * @param overrideFilename if the file browser should override the filename
     */
    public async openPicker (title: string, filesToWrite: CreateFiles[], folder?: string, overrideFilename?: boolean): Promise<any> {
        const paths = (folder) ? [folder] :
            (filesToWrite.length === 1 && overrideFilename) ? await Request.Get<string[]>(`/files:/newfilepath`) :
            await Request.Get<string[]>(`/files:/paths?type=openDirectory${folder ? '&folder=' + folder : ''}`);

        if (!paths)
            return;

        // Working directory and upload file
        let filename = '';
        if (filesToWrite.length === 1 && overrideFilename) {
            if (paths[0].indexOf('.editorproject') === -1)
                paths[0] += '.editorproject';
            
            filename = Tools.GetFilename(paths[0]);
            filesToWrite[0].name = filename;

            paths[0] = paths[0].replace(filename, '');
        }

        const path = paths[0];

        await Request.Post('/files:/workingDirectory', JSON.stringify({
            name: path
        }));

        await this.uploadFiles(path, filesToWrite);

        // Finish
        return {
            path: path,
            filename: filename
        }
    }

    /**
     * Creates the given folders
     * @param folder the parent folder
     * @param names the folders names
     */
    public async createFolders (folder: any, names: string[]): Promise<void> {
        for (const n of names) {
            await Request.Post('/files:/folder', JSON.stringify({
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
            await Request.Put('/files:/write?name=' + encodeURIComponent(f.name) + '&folder=' + encodeURIComponent(folder), f.data, {
                'Content-Type': 'application/octet-stream'
            });
        }
    }

    /**
     * Returns the files available in the given folder
     * @param folder the parent folder
     */
    public async getFiles (folder: string): Promise<GetFiles[]> {
        const files = await Request.Get<any>('/files' + (folder ? '?path=' + encodeURIComponent(folder) : ''));

        const result: GetFiles[] = [];
        files.value.forEach(v => {
            result.push({ name: v.name, folder: v.folder ? v.folder : null });
        });
        return result;
    }
}
