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
    public server: IO = null;
    public client: IO = null;

    /**
     * Constructor
     * @param server: the Web Server
     */
    constructor (server: WebServer) {
        this.server = new IO();
        this.server.attach(server.application);

        this.client = new IO('client');
        this.client.attach(server.application);

        this.server.on('connection', async (socket) => {
            // Server
            socket.on('receive-scene', (data: FileData) => {
                this.client.emit('request-scene', data);
            });

            // Client connected
            this.client.on('connection', () => {
                this.client.removeAllListeners();

                // Send files
                this.server.emit('request-scene');
            });
        });
    }
}
