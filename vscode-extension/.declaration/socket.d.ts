/// <reference types="socket.io-client" />
export default class Sockets {
    static socket: SocketIOClient.Socket;
    static onGotBehaviorCodes: (scripts: any) => void;
    static codeScripts: any[];
    static Connect(): void;
}
