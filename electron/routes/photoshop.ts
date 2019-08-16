import * as os from 'os';
import { BrowserWindow } from 'electron';

import * as KoaRouter from 'koa-router';
import { exec } from 'child_process';

import WebServer from '../web-server';

export default class ToolsRouter {
    // Public members
    public router: KoaRouter;
    public webServer: WebServer;

    private _generatorProcess: any = null;

    /**
     * Constructor
     * @param application: the KOA application
     */
    constructor (webServer: WebServer) {
        this.webServer = webServer;
        this.router = new KoaRouter();

        // Create routes
        this.hasProcess();
        
        webServer.localApplication.use(this.router.routes());
        webServer.externApplication.use(this.router.routes());
    }

    /**
     * Returns wether or not the photoshop process is done.
     */
    protected hasProcess (): void {
        this.router.get('/photoshop/hasProcess', async (ctx, next) => {
            ctx.body = this._generatorProcess !== null;
        });
    }

    /**
     * Creates the photoshop process.
     */
    protected createProcess (): void {
        this.router.get('/photoshop/createProcess', async (ctx, next) => {
            this._generatorProcess = exec('./node_modules/generator-core/app.js -v -f ./photoshop-extension');
            ctx.body = true;
        });
    }
}