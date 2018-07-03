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
            }

            ctx.body = {
                message: 'success'
            };
        });
    }
}