import * as io from 'socket.io';

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
     * Creates the server and connects.
     */
    public static Connect (): Promise<void> {
        this.Server = io(1336);
        this.Server.on('error', () => {
            debugger;
        });

        return new Promise<void>((resolve) => {
            this.Server.on('connection', () => {
                resolve();
            });
        });
    }
}
