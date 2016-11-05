/* global Buffer */

var net = require("net");
var path = require("path");

var ipAddress = '127.0.0.1';
var port = 1337;
var data = null;
var documentId = "";

// Connection
var connected = false;

module.exports.init = function (generator) {
    
    // Wi-Fi (sockets)
    var client = null;
    var clients = [];
    
    function createSockets() {
        client = new net.Socket();
        client.connect(port, ipAddress, function() {
            console.log("Connected");
            connected = true;
            
            if (data !== null) {
                encodeAndSend();
            }
        });
        
        client.on("error", function(error) {
            console.log("Error : " + error);
            createSockets();
        });
        
        client.on("disconnect", function() {
            console.log("Disconnected");
            createSockets();
        });
    }
    createSockets();
    
    // First render
    render();
    
    // Events
    generator.onPhotoshopEvent("currentDocumentChanged", render);
    generator.onPhotoshopEvent("imageChanged", render);
    
    // Helpers
    function encodeAndSend() {
        generator.getDocumentInfo(documentId).then(function(document) {
            documentId = document.file;
            
            var size = 4 * 3 + data.pixels.length; // Data size
            var buf = new Buffer(20 + documentId.length + data.pixels.length); // Buffer
            
            buf.writeUInt32BE(size, 0); // Buffer size
            buf.writeUInt32BE(data.pixels.length, 4); // Pixels size
            buf.writeUInt32BE(data.width, 8); // Image width
            buf.writeUInt32BE(data.height, 12); // Image height
            buf.writeUInt32BE(documentId.length, 16); // Document Id length
            buf.write(documentId, 20, documentId.length); // Document Id
            
            var tempBuffer = new Buffer(data.pixels); // Pixels
            tempBuffer.copy(buf, 20 + documentId.length);
            
            if (client !== null) {
                client.write(buf, null, function() { // Write
                    client.destroy();
                    client = null;
                    console.log("Sent...");
                });
            }
            else {
                createSockets();
            }
        });
    }
    
    // Render
    function render() {
        generator.evaluateJSXString("app.activeDocument.id").then(function (id) {
            console.log(id);
            if (id) {
                generator.getDocumentPixmap(id).then(function (pixmap) {
                    
                    var pixels = pixmap.pixels;
                    var channels = pixmap.channelCount;
                    
                    if (channels !== 4) {
                        console.log("Channels count must be 4");
                        return;
                    }
                    
                    // set pixels order
                    for (var i=0; i < pixels.length; i+=channels) {
                        var a = pixels[i];
                        var r = pixels[i+1];
                        var g = pixels[i+2];
                        var b = pixels[i+3];
                        
                        pixels[i] = r;
                        pixels[i+1] = g;
                        pixels[i+2] = b;
                        pixels[i+3] = a;
                    }
                    
                    // Construct final object
                    data = {
                      width: pixmap.width,
                      height: pixmap.height,
                      pixels: pixels
                    }
                    console.log(data.width);
                    console.log(data.height);
                    
                    documentId = id;
                    
                    if (connected) {
                        console.log("Send data...");
                        encodeAndSend();
                    }
                        
                }, function (reason) {
                    console.log("getDocumentPixmap rejected, ", reason);
                });
            } else {
                console.log("No document to export");
            }
        });    
    }
};