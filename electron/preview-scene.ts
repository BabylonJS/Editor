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

    // Protected members
    protected clientConnected: boolean = false;
    protected serverConnected: boolean = false;

    /**
     * Constructor
     * @param server: the Web Server
     */
    constructor (server: WebServer) {
        this.server = new IO();
        this.server.attach(server.application);

        this.client = new IO('client');
        this.client.attach(server.application);

        this.server.on('connection', () => this.serverConnected = true);
        this.client.on('connection', () => {
            this.clientConnected = true;

            // Send files
            this.server.broadcast('request-scene');
        });

        // Server
        this.server.on('receive-scene', (data: FileData) => {
            this.client.broadcast('request-scene', data.data);
        });
    }
}
