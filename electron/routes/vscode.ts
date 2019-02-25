import * as KoaRouter from 'koa-router';
import * as IO from 'koa-socket';

import WebServer from '../web-server';

export default class VSCodeRouter {
    // Public members
    public router: KoaRouter;
    public webServer: WebServer;

    public editorSocket: IO = null;
    public vsCodeSocket: IO = null;

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
    }

    // Creates the sockets
    protected createSocket (): void {
        // Server
        this.editorSocket = new IO('vscode');
        this.editorSocket.attach(this.webServer.localApplication);

        // Client
        this.vsCodeSocket = new IO('vscode-extension');
        this.vsCodeSocket.attach(this.webServer.localApplication);
        
        this.editorSocket.on('connection', () => {
            // Work as mirror
            this.editorSocket.on('behavior-codes', (c) => this.vsCodeSocket.broadcast('behavior-codes', c.data));
            this.vsCodeSocket.on('update-behavior-code', (s) => this.editorSocket.broadcast('update-behavior-code', s.data));

            this.editorSocket.on('material-codes', (c) => this.vsCodeSocket.broadcast('material-codes', c.data));
            this.vsCodeSocket.on('update-material-code', (c) => this.editorSocket.broadcast('update-material-code', c.data));
        });
    }
}
