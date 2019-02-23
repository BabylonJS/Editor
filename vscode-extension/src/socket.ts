import * as SocketIO from 'socket.io-client';

export default class Sockets {
    // Public members
    public static socket: SocketIOClient.Socket;

    public static onGotBehaviorCodes: (scripts: any) => void;

    public static codeScripts: any[] = [];

    // 
    public static Connect (): void {
        // Create socket
        this.socket = SocketIO('http://localhost:1337/vscode-extension');

        // Listen
        this.socket.on('behavior-codes', (s) => {
            this.codeScripts = s;
            this.onGotBehaviorCodes(s);
        });
    }
}
