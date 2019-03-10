import * as fs from 'fs-extra';
import { join } from 'path';

import Sockets from './utils/socket';
import Utils from './utils/utils';

export default class TempFileSystem {
    // Static members
    public static Watchers: { dispose: () => void }[] = [];

    /**
     * Constructor
     */
    constructor () {
        // Register events
        Sockets.OnDisconnect = (async () => {
            await this._removeDirectory('behaviors');
            await this._removeDirectory('materials');
            await this._removeDirectory('post-processes');
        });

        Sockets.OnGotProject = (async p => {
            // Clear and create directory
            await this._clearDirectory('typings');
            await this._createDirectory('typings');
            // Write files
            await fs.writeFile(join(Utils.TempFolder, 'tsconfig.json'), Buffer.from(p.tsconfig));
            await fs.writeFile(join(Utils.TempFolder, 'typings/babylon.module.d.ts'), Buffer.from(p.babylonjs));
            await fs.writeFile(join(Utils.TempFolder, 'typings/babylonjs.materials.module.d.ts'), Buffer.from(p.babylonjs_materials));
            await fs.writeFile(join(Utils.TempFolder, 'typings/tools.d.ts'), Buffer.from(p.tools));
            await fs.writeFile(join(Utils.TempFolder, 'typings/mobile.d.ts'), Buffer.from(p.mobile));
            await fs.writeFile(join(Utils.TempFolder, 'typings/path-finder.d.ts'), Buffer.from(p.pathFinder));
        });

        Sockets.OnGotBehaviorCodes = (async scripts => {
            // Clear
            Array.isArray(scripts) && await this._clearDirectory('behaviors');

            // Transform to array
            scripts = Array.isArray(scripts) ? scripts : [scripts];

            // Write scripts
            scripts.forEach(s => {
                const filename = join(Utils.TempFolder, 'behaviors', s.name + '.ts');
                fs.writeFile(filename, Buffer.from(s.code));
                fs.unwatchFile(filename);
                fs.watchFile(filename, async (curr, prev) => {
                    if (!prev)
                        return;
                    console.log('changed');
                    Sockets.UpdateBehaviorCode({
                        id: s.id,
                        name: s.name,
                        code: await fs.readFile(filename, { encoding: 'utf-8' })
                    });
                })
            });
        });

        Sockets.OnGotMaterialCodes = (scripts => {
            // // Clear
            // Array.isArray(scripts) && this._clearDirectory('materials');
            // // Transform to array
            // scripts = Array.isArray(scripts) ? scripts : [scripts];

            // // Write scripts
            // scripts.forEach(s => {
            //     const root = 'babylonjs-editor:/materials/';
            //     // Create folder
            //     this.createDirectory(Uri.parse(root + s.name));

            //     this.writeFile(Uri.parse(`${root}${s.name}/${s.name}.ts`), Buffer.from(s.code), { create: true, overwrite: true }, s.id);
            //     this.writeFile(Uri.parse(`${root}${s.name}/${s.name}.fragment.fx`), Buffer.from(s.pixel), { create: true, overwrite: true }, s.id);
            //     this.writeFile(Uri.parse(`${root}${s.name}/${s.name}.vertex.fx`), Buffer.from(s.vertex), { create: true, overwrite: true }, s.id);
            //     this.writeFile(Uri.parse(`${root}${s.name}/config.json`), Buffer.from(s.config), { create: true, overwrite: true }, s.id);
            // });
        });

        Sockets.OnGotPostProcessCodes = (scripts => {
            // // Clear
            // Array.isArray(scripts) && this._clearDirectory('post-processes');
            // // Transform to array
            // scripts = Array.isArray(scripts) ? scripts : [scripts];

            // // Write scripts
            // scripts.forEach(s => {
            //     const root = 'babylonjs-editor:/post-processes/';
            //     // Create folder
            //     this.createDirectory(Uri.parse(root + s.name));

            //     this.writeFile(Uri.parse(`${root}${s.name}/${s.name}.ts`), Buffer.from(s.code), { create: true, overwrite: true }, s.id);
            //     this.writeFile(Uri.parse(`${root}${s.name}/${s.name}.fragment.fx`), Buffer.from(s.pixel), { create: true, overwrite: true }, s.id);
            //     this.writeFile(Uri.parse(`${root}${s.name}/config.json`), Buffer.from(s.config), { create: true, overwrite: true }, s.id);
            // });
        });
    }

    /**
     * Inits the temp folder
     */
    public async init (): Promise<void> {
        // Structure
        await this._createDirectory('');
        await this._createDirectory('behaviors');
        await this._createDirectory('materials');
        await this._createDirectory('post-processes');
    }

    // Creates a directory
    private async _createDirectory (dirname: string): Promise<void> {
        const path = join(Utils.TempFolder, dirname);
        if (!fs.existsSync(path))
            await fs.mkdir(join(Utils.TempFolder, dirname));
    }

    // Clears the temp directory
    private async _clearDirectory (dirname: string): Promise<void> {
        const path = join(Utils.TempFolder, dirname);
        const exists = fs.existsSync(path);
        if (!exists)
            return;

        const files = await fs.readdir(path);
        for (const f of files)
            await fs.unlink(join(Utils.TempFolder, dirname, f));
    }

    // Removes the given directory
    private async _removeDirectory (dirname: string): Promise<void> {
        await this._clearDirectory(dirname);
        await fs.remove(join(Utils.TempFolder, dirname));
    }
}
