import { createServer } from "http-server";
import { Server } from "http";

import { Nullable } from "../../shared/types";

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
     */
    public static RunServer(root: string, port: number): void {
        if (this.Server) { this.StopServer(); }

        this.Server = createServer({ root, cache: -1 });
        this.Server.listen(port/*, "localhost*/);

        this.Path = root;
    }

    /**
     * Stops the server
     */
    public static async StopServer(): Promise<void> {
        if (!this.Server) { return; }

        await new Promise<void>((resolve, reject) => {
            this.Server!.close((err) => {
                if (err) { return reject(); }
                resolve();
            })
        });

        this.Path = null;
        this.Server = null;
    }
}