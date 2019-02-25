import * as SocketIO from 'socket.io-client';

export default class Sockets {
    // Public members
    public static Socket: SocketIOClient.Socket;

    public static OnDisconnect: () => void;
    public static OnGotBehaviorCodes: (scripts: any) => void;
    public static OnGotMaterialCodes: (scripts: any) => void;

    /**
     * Connects the sockets to the editor
     */
    public static Connect (): void {
        // Create socket
        this.Socket = SocketIO('http://localhost:1337/vscode-extension');

        // Listen
        this.Socket.on('disconnect', () => this.OnDisconnect());
        this.Socket.on('behavior-codes', (s) => this.OnGotBehaviorCodes(s));
        this.Socket.on('material-codes', (s) => this.OnGotMaterialCodes(s));
    }

    /**
     * Closes the sockets from the editor
     */
    public static Close (): void {
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
     * Updates the given behavior code
     * @param s the script to update
     */
    public static UpdateMaterialCode (s: any): void {
        this.Socket.emit('update-material-code', s);
    }
}
