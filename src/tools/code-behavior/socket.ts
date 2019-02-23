import * as SocketIO from 'socket.io-client';

export default class BehaviorCodeSocket {
    // Public members
    public static socket: SocketIOClient.Socket = null;

    /**
     * Creates a scene preview listener
     */
    public static async Create (): Promise<void> {
        if (!this.socket)
            this.socket = SocketIO(`http://localhost:1337/vscode`);
    }

    /**
     * Refreshes the scripts
     * @param scripts the scripts to send
     */
    public static Refresh (scripts: any): void {
        this.socket.emit('behavior-codes', scripts);
    }
}
