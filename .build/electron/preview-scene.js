"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const IO = require("koa-socket");
class ScenePreview {
    /**
     * Constructor
     * @param server: the Web Server
     */
    constructor(server) {
        // Public members
        this.server = null;
        this.client = null;
        this.server = new IO();
        this.server.attach(server.application);
        this.client = new IO('client');
        this.client.attach(server.application);
        this.server.on('connection', (socket) => __awaiter(this, void 0, void 0, function* () {
            // Server
            socket.on('receive-scene', (data) => {
                this.client.emit('request-scene', data);
            });
            // Client connected
            this.client.on('connection', () => {
                this.client.removeAllListeners();
                // Send files
                this.server.emit('request-scene');
            });
        }));
    }
}
exports.default = ScenePreview;
//# sourceMappingURL=preview-scene.js.map