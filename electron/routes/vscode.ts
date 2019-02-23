import * as KoaRouter from 'koa-router';
import * as IO from 'koa-socket';

import WebServer from '../web-server';

export default class VSCodeRouter {
    // Public members
    public router: KoaRouter;
    public webServer: WebServer;

    public server: IO = null;
    public client: IO = null;

    // Private members
    private _scripts: any[] = [];

    /**
     * Constructor
     * @param webServer: the web server instance
     */
    constructor (webServer: WebServer) {
        this.webServer = webServer;
        this.router = new KoaRouter();

        // Socket
        this.createSocket();

        // Create routes
        this.getBehaviorCodes();
        
        webServer.localApplication.use(this.router.routes());
    }

    // Creates the sockets
    protected createSocket (): void {
        // Server
        this.server = new IO('vscode');
        this.server.attach(this.webServer.localApplication);

        // Client
        this.client = new IO('vscode-extension');
        this.client.attach(this.webServer.localApplication);
        
        this.server.on('connection', () => {
            this.server.on('behavior-codes', (codes) => {
                this._scripts = codes.data;
                this.client.broadcast('behavior-codes', this._scripts);
            });
        });
    }

    /**
     * Gets all the behavior codes
     */
    protected getBehaviorCodes (): void {
        this.router.get('/behaviorCodes', async (ctx, next) => {
            ctx.body = this._scripts;
        });
    }
}
