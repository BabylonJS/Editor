"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SocketIO = require("socket.io-client");
class Sockets {
    // 
    static Connect() {
        // Create socket
        this.socket = SocketIO('http://localhost:1337/vscode-extension');
        // Listen
        this.socket.on('behavior-codes', (s) => {
            this.codeScripts = s;
            this.onGotBehaviorCodes(s);
        });
    }
}
Sockets.codeScripts = [];
exports.default = Sockets;
//# sourceMappingURL=socket.js.map