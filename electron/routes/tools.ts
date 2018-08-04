import * as os from 'os';
import { BrowserWindow } from 'electron';

import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';

export default class ToolsRouter {
    // Public members
    public router: KoaRouter;
    public application: Koa;

    /**
     * Constructor
     * @param application: the KOA application
     */
    constructor (application: Koa) {
        this.application = application;
        this.router = new KoaRouter();

        // Create routes
        this.openDevTools();
        this.getVersion();
        this.getInstallerPath();
        
        this.application.use(this.router.routes());
    }

    /**
     * Opens the devtools for the current focused window
     */
    protected openDevTools (): void {
        this.router.get('/devTools', async (ctx, next) => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
                win.webContents.openDevTools({
                    mode: 'detach'
                });

                setTimeout(() => win.focus(), 2000);
            }

            ctx.body = {
                message: 'success'
            };
        });
    }

    /**
     * Returns the editor's version set from the package.json
     */
    protected getVersion (): void {
        this.router.get('/version', async (ctx, next) => {
            const json = require('../../../package.json');
            ctx.body = json.version;
        });
    }

    /**
     * Returns the installer path according to the current platform
     */
    protected getInstallerPath (): void {
        this.router.get('/installerPath', async (ctx, next) => {
            switch (os.platform()) {
                case 'win32': ctx.body = 'BabylonJS Editor.exe'; break;
                default: ctx.body = ''; break;
            }
        });
    }
}