"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Koa = require("koa");
const storage_1 = require("./routes/storage");
class WebServer {
    /**
     * Constructor
     * @param port: the port
     */
    constructor(port) {
        this.application = new Koa();
        this.application.listen(port, 'localhost');
        new storage_1.default(this.application);
    }
}
exports.default = WebServer;
//# sourceMappingURL=web-server.js.map