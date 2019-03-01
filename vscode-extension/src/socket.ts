import * as SocketIO from 'socket.io-client';

export default class Sockets {
    // Public members
    public static Socket: SocketIOClient.Socket;

    public static OnDisconnect: () => void;
    public static OnGotBehaviorCodes: (scripts: any) => void;
    public static OnGotMaterialCodes: (scripts: any) => void;
    public static OnGotPostProcessCodes: (scripts: any) => void;
    public static OnGotBehaviorGraphs: (graphs: any) => void;

    public static OnGotSceneInfos: (infos: any) => void;
    public static OnGotSelectedObject: (obj: any) => void;

    // Private members
    private static _Closed: boolean = false;

    /**
     * Connects the sockets to the editor
     */
    public static Connect (): void {
        // Create socket
        this.Socket = SocketIO('http://localhost:1337/vscode-extension');

        // Listen
        this.Socket.on('connect', () => this.Socket.emit('refresh'));
        this.Socket.on('disconnect', () => {
            this.OnDisconnect();
            this.Socket.close();

            if (!this._Closed)
                this.Connect();
        });

        this.Socket.on('behavior-codes', (s) => this.OnGotBehaviorCodes(s));
        this.Socket.on('material-codes', (s) => this.OnGotMaterialCodes(s));
        this.Socket.on('post-process-codes', (s) => this.OnGotPostProcessCodes(s));
        this.Socket.on('behavior-graphs', (g) => this.OnGotBehaviorGraphs(g));

        this.Socket.on('scene-infos', (i) => this.OnGotSceneInfos(i));
        this.Socket.on('set-selected-object', (s) => this.OnGotSelectedObject(s));

        this._Closed = false;
    }

    /**
     * Closes the sockets from the editor
     */
    public static Close (): void {
        this._Closed = true;
        this.Socket.close();
    }

    /**
     * Updates the given behavior code
     * @param s the script to update
     */
    public static UpdateBehaviorCode (s: any): void {
        this.Socket.emit('update-behavior-code', s);
    }

    /**
     * Updates the given material code
     * @param s the script to update
     */
    public static UpdateMaterialCode (s: any): void {
        this.Socket.emit('update-material-code', s);
    }

    /**
     * Updates the given post-process code
     * @param s the script to update
     */
    public static UpdatePostProcessCode (s: any): void {
        this.Socket.emit('update-post-process-code', s);
    }

    /**
     * Updates the given behavior graph
     * @param g the graph to update
     */
    public static UpdateBehaviorGraph (g: any): void {
        this.Socket.emit('update-behavior-graph', g);
    }
}
