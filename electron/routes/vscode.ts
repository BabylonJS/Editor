import * as KoaRouter from 'koa-router';
import * as IO from 'koa-socket';

import WebServer from '../web-server';

export default class VSCodeRouter {
    // Public members
    public router: KoaRouter;
    public webServer: WebServer;

    public socket: IO = null;

    /**
     * Constructor
     * @param webServer: the web server instance
     */
    constructor (webServer: WebServer) {
        this.webServer = webServer;
        this.router = new KoaRouter();

        // Socket
        this.socket = new IO();
        this.socket.attach(webServer.localApplication);

        this.socket.on('behavior-codes', (codes) => {
            debugger;
        });

        // Create routes
        this.getBehaviorCodes();
        
        webServer.localApplication.use(this.router.routes());
    }

    /**
     * Gets all the behavior codes
     */
    protected getBehaviorCodes (): void {
        this.router.get('/behaviorCodes', async (ctx, next) => {
            ctx.body = [{ name: 'test', id: 'idtest', code: 'import * from "you"' }];
        });
    }
}
