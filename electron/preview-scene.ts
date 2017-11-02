import WebServer from './web-server';
import * as SocketIO from 'socket.io';

interface FileData {
    [index: string]: {
        name: string;
        data: ArrayBuffer;
    }
}

export default class ScenePreview {
    // Public members
    public socket: SocketIO.Server;
    public client: SocketIO.Namespace;

    /**
     * Constructor
     * @param server: the Web Server
     */
    constructor (server: WebServer) {
        this.socket = SocketIO(1337);
        this.client = this.socket.of('/client');

        this.socket.on('connection', (socket) => {
            // Server
            socket.on('receive-scene', (data: FileData) => {
                this.client.emit('request-scene', data);
            });

            // Client connected
            this.client.on('connection', () => {
                this.client.removeAllListeners();

                // Send files
                this.socket.emit('request-scene');
            });
        });
    }
}
