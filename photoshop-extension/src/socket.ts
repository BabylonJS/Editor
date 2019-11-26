import * as io from 'socket.io';
import './types';

export default class Socket {
    /**
     * The socket server reference.
     */
    public static Server: io.Server = null;
    /**
     * Gets wether or not the socket is connected.
     */
    public static Connected: boolean = false;
    /**
     * Called on a client is connected.
     */
    public static OnClientConnected: () => void = null;

    /**
     * Creates the server and connects.
     */
    public static Connect (): Promise<void> {
        this.Server = io(1336);
        this.Server.on('error', () => { debugger; });

        return new Promise<void>((resolve) => {
            this.Server.on('connection', () => setTimeout(() =>this.OnClientConnected && this.OnClientConnected(), 0));
            this.Server.once('connection', () => resolve());
        });
    }

    /**
     * Closes the server.
     */
    public static Close (): Promise<void> {
        return new Promise<void>((resolve) => this.Server.close(() => resolve()));
    }
}
