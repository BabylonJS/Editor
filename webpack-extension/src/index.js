const net = require("net");

var socket = null;
var connected = false;

var connect = function() {
    socket.connect(6969, "localhost", function() {
        console.info("Connected to Babylon.JS Editor to notify progress.");
    });
};

var notify = function(percentage, message) {
    if (!socket && percentage === 0) {
        socket = new net.Socket({ readable: false, writable: true });
        socket.on("connect", function() {
            connected = true;
            notify(percentage, message);
        });
        socket.on("close", function() {
            connected = false;
        });
        socket.on("error", function() {
            setTimeout(function() {
                if (socket) {
                    connect();
                }
            }, 5000);
        });

        connect();
    }

    if (socket && connected) {
        if (message === "emitting") {
            percentage = 1;
        }

        var done = percentage >= 1;

        const data = JSON.stringify({
            done: done,
            message: message,
            percentage: percentage * 100,
        });

        socket.write(data + "\n");

        if (done) {
            socket.destroy();
            socket = null;

            connected = false;
        }
    }
};

module.exports = {
    createProgressPlugin: function(plugin) {
        if (!plugin) { plugin = { }};
        
        // Setup progress handler
        var handler = plugin.handler;
        plugin.handler = function(percentage, message) {
            if (handler) {
                handler(percentage, message);
            }

            notify(percentage, message);
        };
        
        return plugin;
    },
};
