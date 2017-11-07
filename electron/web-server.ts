import * as httpServer from 'http-server';
import * as http from "http";
import * as https from "https";

export default class WebServer {
    // Public members
    public server: http.Server | https.Server;
    
    /**
     * Constructor
     * @param host: the hostname 
     * @param port: the port
     * @param options the server options
     */
    constructor (port: number, options: httpServer.Options = { }) {
        this.server = httpServer.createServer(options);
        this.server.listen(port);
    }

    /**
     * Stops the server
     */
    public async stop (): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.server.close(() => {
                resolve();
            });
        });
    }
}