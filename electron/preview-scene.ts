import WebServer from './web-server';
import * as IO from 'koa-socket';

interface FileData {
    [index: string]: {
        name: string;
        data: ArrayBuffer;
    }
}

export default class ScenePreview {
    // Public members
    public editorSocket: IO = null;
    public clientSocket: IO = null;

    // Protected members
    protected clientConnected: boolean = false;
    protected serverConnected: boolean = false;

    /**
     * Constructor
     * @param server: the Web Server
     */
    constructor (server: WebServer) {
        this.editorSocket = new IO();
        this.editorSocket.attach(server.externApplication);

        this.clientSocket = new IO('client');
        this.clientSocket.attach(server.externApplication);

        this.editorSocket.on('connection', () => this.serverConnected = true);
        this.clientSocket.on('connection', () => {
            this.clientConnected = true;

            // Send files
            this.editorSocket.broadcast('request-scene');
        });

        // Server
        this.editorSocket.on('receive-scene', (data: FileData) => {
            this.clientSocket.broadcast('request-scene', data.data);
        });
    }
}
