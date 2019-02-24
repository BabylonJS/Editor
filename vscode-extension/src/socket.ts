import * as SocketIO from 'socket.io-client';

export default class Sockets {
    // Public members
    public static socket: SocketIOClient.Socket;
    public static onGotBehaviorCodes: (scripts: any) => void;

    /**
     * Connects the sockets to the editor
     */
    public static Connect (): void {
        // Create socket
        this.socket = SocketIO('http://localhost:1337/vscode-extension');

        // Listen
        this.socket.on('behavior-codes', (s) => this.onGotBehaviorCodes(s));
    }

    /**
     * Updates the given behavior code
     * @param s the script to update
     */
    public static UpdateBehaviorCode (s: any): void {
        this.socket.emit('update-behavior-code', s);
    }
}
