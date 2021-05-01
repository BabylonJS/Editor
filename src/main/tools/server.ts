import { createServer } from "http-server";
import { Server } from "http";

import { Nullable } from "../../shared/types";

export interface IServerHttpsOptions {
    /**
     * Defines wether or not HTTPS server is enabled.
     */
    enabled: boolean;
    /**
     * Defines the path to the certificate file.
     */
    certPath?: string;
    /**
     * Defines the path to the key file.
     */
    keyPath?: string;
}

export class GameServer {
    /**
     * Defines the current absolute path of the web server.
     */
    public static Path: Nullable<string> = null;
    /**
     * Defines the reference to the http server.
     */
    public static Server: Nullable<Server> = null;

    /**
     * Runs the server.
     * @param root the root url where to start the server and serve files.
     * @param port defines the port to listen.
     * @param https defines the option HTTPS options to set when HTTPS is enabled in the workspace.
     */
    public static RunServer(root: string, port: number, https?: IServerHttpsOptions): void {
        if (this.Server) {
            this.StopServer();
        }

        if (https?.enabled) {
            this.Server = createServer({
                root, cache: -1, https: {
                    cert: https.certPath,
                    key: https.keyPath,
                }
            });
        } else {
            this.Server = createServer({ root, cache: -1 });
        }

        this.Server.listen(port/*, "localhost*/);

        this.Path = root;
    }

    /**
     * Stops the server
     */
    public static StopServer(): void {
        this.Server?.close();

        this.Path = null;
        this.Server = null;
    }
}