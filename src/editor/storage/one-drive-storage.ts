import Editor from '../editor';
import Tools from '../tools/tools';
import Request from '../tools/request';

import Storage, { CreateFiles, GetFiles } from './storage';

export default class OneDriveStorage extends Storage {
    // Static members
    public static _TOKEN: string = '';
    public static _TOKEN_EXPIRES_IN: number = 0;
    public static _TOKEN_EXPIRES_NOW: number = 0;

    /**
     * Constructor
     * @param editor: the editor reference
     */
    constructor (editor: Editor) {
        super(editor);
    }

    /**
     * Creates the given folders
     * @param folder the parent folder
     * @param names the folders names
     */
    public async createFolders (folder: any, names: string): Promise<void> {
        for (const n of names) {
            const content = JSON.stringify({
                "name": n,
                "folder": {},
                "@name.conflictBehavior": "rename"
            });
            
            await Request.Post('https://Api.Onedrive.com/v1.0/drive/items/' + folder + '/children', content, {
                'Authorization': 'Bearer ' + OneDriveStorage._TOKEN
            });
        }
    }
    
    /**
     * Creates the given files
     * @param folder the parent folder
     * @param files the files to write
     */
    public async createFiles (folder: any, files: CreateFiles[]): Promise<void> {
        await this.login();
        for (const f of files) {
            await Request.Put('https://Api.Onedrive.com/v1.0/drive/items/' + folder + ':/' + f.name + ':/content', f.data, {
                'Authorization': 'Bearer ' + OneDriveStorage._TOKEN
            });
        }
    }

    /**
     * Returns the files available in the given folder
     * @param folder the parent folder
     */
    public async getFiles (folder: any): Promise<GetFiles[]> {
        await this.login();
        const files = await Request.Get<any>('https://Api.Onedrive.com/v1.0/drive/' + (folder ? 'items/' + folder : 'root') + '/children', {
            'Authorization': 'Bearer ' + OneDriveStorage._TOKEN
        });

        const result: GetFiles[] = [];
        files.value.forEach(v => {
            result.push({ name: v.name, folder: v.folder ? v.id : null });
        });
        return result;
    }

    /**
     * Checks the token and expiration
     */
    protected async login (): Promise<void> {
        await System.import('.build/src/editor/storage/oauth.js');

        const now = (Date.now() - OneDriveStorage._TOKEN_EXPIRES_NOW) / 1000;
        return new Promise<void>(resolve => {
            if (OneDriveStorage._TOKEN === '' || now >= OneDriveStorage._TOKEN_EXPIRES_IN) {
                //const clientID = '000000004C18353E'; // editor.babylonjs.com
                const clientID = '0000000048182B1B';
                const uri = 'https://login.live.com/oauth20_authorize.srf'
                        + '?client_id=' + clientID
                        + '&redirect_uri=' + Tools.GetBaseURL() + 'redirect.html'
                        + '&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite wl.offline_access';

                const popup = Tools.OpenPopup(uri, 'OneDrive Auth', 512, 512);
                popup['StorageCallback'] = (token: string, expiresIn: number, expiresNow: number) => {
                    OneDriveStorage._TOKEN = token;
                    OneDriveStorage._TOKEN_EXPIRES_IN = expiresIn;
                    OneDriveStorage._TOKEN_EXPIRES_NOW = expiresNow;

                    resolve();   
                };
            }
            else
                resolve();
        });
    }
}
