import * as IO from 'koa-socket';

import WebServer from '../web-server';

export default class VSCodeSocket {
    // Public members
    public webServer: WebServer;

    public editorSocket: IO = null;
    public vsCodeSocket: IO = null;

    // Private members
    private _editorConnected: boolean = false;
    private _vsCodeConnected: boolean = false;

    /**
     * Constructor
     * @param webServer: the web server instance
     */
    constructor (webServer: WebServer) {
        this.webServer = webServer;

        // Socket
        this.createSocket();
    }

    /**
     * Creates the sockets for editor and vscode
     */
    protected createSocket (): void {
        // Server
        this.editorSocket = new IO('vscode');
        this.editorSocket.attach(this.webServer.localApplication);

        // Client
        this.vsCodeSocket = new IO('vscode-extension');
        this.vsCodeSocket.attach(this.webServer.localApplication);

        // Listen
        this.listen();
        
        // Manage state
        this.editorSocket.on('disconnect', () => this._editorConnected = false);
        this.editorSocket.on('connection', () => this._editorConnected = true);

        this.vsCodeSocket.on('disconnect', () => this._vsCodeConnected = false);
        this.vsCodeSocket.on('connection', () => this._vsCodeConnected = true);
    }

    /**
     * Listens for events to broardcast
     */
    protected listen (): void {
        // Work as mirror
        this.editorSocket.on('project', (p) => this.vsCodeSocket.broadcast('project', p.data));

        this.vsCodeSocket.on('refresh', () => this.editorSocket.broadcast('refresh'));

        this.editorSocket.on('behavior-codes', (c) => this.vsCodeSocket.broadcast('behavior-codes', c.data));
        this.vsCodeSocket.on('update-behavior-code', (s) => this.editorSocket.broadcast('update-behavior-code', s.data));

        this.editorSocket.on('post-process-codes', (c) => this.vsCodeSocket.broadcast('post-process-codes', c.data));
        this.vsCodeSocket.on('update-post-process-code', (c) => this.editorSocket.broadcast('update-post-process-code', c.data));
    }
}
