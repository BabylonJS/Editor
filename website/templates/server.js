var staticServer = null;

var createServer = function() {
    // Run server
    var http = require("http");

    var file = new(staticServer.Server)();

    http.createServer(function (req, res) {
      file.serve(req, res);
    }).listen(8000);

    console.log("You can now access http://localhost:8000 to run your game");
}

try {
    staticServer = require("node-static");
    createServer();
} catch (error) {
    var exec = require("child_process").exec;
    var child = exec("npm install node-static", function (error, stdout, stderr) {
        console.log("stdout: " + stdout);

        if (error !== null) {
            console.log("exec error: " + error);
        }
        else {
            // Run server
            staticServer = require("node-static");
            createServer();
        }
    });
}
