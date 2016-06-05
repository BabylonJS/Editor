var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var net = require("net");
        var ElectronPhotoshopPlugin = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function ElectronPhotoshopPlugin(core) {
                this._server = null;
                this._client = null;
                this._texture = null;
                this._textures = {};
                // Initialize
                this._core = core;
                this._core.eventReceivers.push(this);
            }
            // On event
            ElectronPhotoshopPlugin.prototype.onEvent = function (event) {
                return false;
            };
            // Disconnect photoshop
            ElectronPhotoshopPlugin.prototype.disconnect = function () {
                if (this._server) {
                    this._server.close(function (err) {
                        console.log("Closed server...");
                        if (err)
                            console.log(err.message);
                    });
                }
                else
                    return false;
                if (this._client) {
                    this._client.destroy();
                }
                this._server = null;
                this._client = null;
                return true;
            };
            // Connect to photoshop
            ElectronPhotoshopPlugin.prototype.connect = function () {
                var _this = this;
                var buffers = [];
                this._server = net.createServer(function (socket) {
                    _this._client = socket;
                    _this._client.on("data", function (data) {
                        var buffer = new Buffer(data);
                        buffers.push(buffer);
                    });
                    _this._client.on("end", function () {
                        _this._client = null;
                        var finalBuffer = Buffer.concat(buffers);
                        buffers = [];
                        var bufferSize = finalBuffer.readUInt32BE(0);
                        var pixelsSize = finalBuffer.readUInt32BE(4);
                        var width = finalBuffer.readUInt32BE(8);
                        var height = finalBuffer.readUInt32BE(12);
                        var documentNameLength = finalBuffer.readUInt32BE(16);
                        var documentName = finalBuffer.toString("utf-8", 20, 20 + documentNameLength);
                        var texture = _this._textures[documentName];
                        if (!texture || texture.getBaseSize().width !== width || texture.getBaseSize().height !== height) {
                            if (texture)
                                texture.dispose();
                            var texture = new BABYLON.DynamicTexture(documentName, { width: width, height: height }, _this._core.currentScene, false);
                            EDITOR.Event.sendSceneEvent(texture, EDITOR.SceneEventType.OBJECT_ADDED, _this._core);
                            _this._textures[documentName] = texture;
                        }
                        var context = texture.getContext();
                        var data = context.getImageData(0, 0, width, height);
                        for (var i = 0; i < pixelsSize; i++) {
                            data.data[i] = finalBuffer.readUInt8(20 + documentNameLength + i);
                        }
                        context.putImageData(data, 0, 0);
                        texture.update(true);
                        EDITOR.Event.sendSceneEvent(texture, EDITOR.SceneEventType.OBJECT_CHANGED, _this._core);
                    });
                })
                    .on("error", function (error) {
                    throw error;
                });
                this._server.maxConnections = 1;
                this._server.listen(1337, "127.0.0.1", null, function () {
                    console.log("Server is listening...");
                });
                return true;
            };
            ElectronPhotoshopPlugin.Connect = function (core) {
                if (!this._Instance)
                    this._Instance = new ElectronPhotoshopPlugin(core);
                this._Instance.connect();
            };
            ElectronPhotoshopPlugin.Disconnect = function () {
                if (this._Instance)
                    this._Instance.disconnect();
            };
            /*
            * Static methods
            */
            ElectronPhotoshopPlugin._Instance = null;
            return ElectronPhotoshopPlugin;
        }());
        EDITOR.ElectronPhotoshopPlugin = ElectronPhotoshopPlugin;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
