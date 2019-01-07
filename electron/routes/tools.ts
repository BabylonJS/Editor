import * as os from 'os';
import { BrowserWindow } from 'electron';

import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';

import Settings from '../settings/settings';
import WebServer from '../web-server';

export default class ToolsRouter {
    // Public members
    public router: KoaRouter;
    public webServer: WebServer;

    /**
     * Constructor
     * @param application: the KOA application
     */
    constructor (webServer: WebServer) {
        this.webServer = webServer;
        this.router = new KoaRouter();

        // Create routes
        this.openDevTools();
        this.getVersion();
        this.getOsPlatform();
        this.getAddress();

        this.getOpenedFile();
        this.setOpenedFile();
        
        webServer.localApplication.use(this.router.routes());
        webServer.externApplication.use(this.router.routes());
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
    protected getOsPlatform (): void {
        this.router.get('/osplatform', async (ctx, next) => {
            ctx.body = os.platform();
        });
    }

    /**
     * Gets the current server address
     */
    protected getAddress (): void {
        this.router.get('/address', async (ctx, next) => {
            ctx.body = this.webServer.address;
        });
    }

    /**
     * Returns the opened file path
     */
    protected getOpenedFile (): void {
        this.router.get('/openedFile', async (ctx, next) => {
            ctx.body = Settings.OpenedFile;
        })
    }

    /**
     * Sets the opened file path
     */
    protected setOpenedFile (): void {
        this.router.post('/openedFile', async (ctx, next) => {
            Settings.OpenedFile = ctx.body;

            ctx.body = {
                message: 'success'
            };
        });
    }
}