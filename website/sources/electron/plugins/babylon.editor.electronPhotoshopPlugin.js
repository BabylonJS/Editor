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
                this._statusBarId = "STATUS-BAR-PHOTOSHOP";
                this._server = null;
                this._client = null;
                this._texture = null;
                // Initialize
                this._core = core;
                this._core.eventReceivers.push(this);
                // Status bar
                this._core.editor.statusBar.addElement(this._statusBarId, "Ready", "icon-photoshop-connect");
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
                this._core.editor.statusBar.removeElement(this._statusBarId);
                return true;
            };
            // Connect to photoshop
            ElectronPhotoshopPlugin.prototype.connect = function () {
                var _this = this;
                this._core.editor.statusBar.showSpinner(this._statusBarId);
                this._core.editor.statusBar.setText(this._statusBarId, "Connecting...");
                var buffers = [];
                this._server = net.createServer(function (socket) {
                    _this._client = socket;
                    _this._client.on("data", function (data) {
                        _this._core.editor.statusBar.showSpinner(_this._statusBarId);
                        var buffer = new global.Buffer(data);
                        buffers.push(buffer);
                    });
                    _this._client.on("end", function () {
                        _this._client = null;
                        var finalBuffer = global.Buffer.concat(buffers);
                        buffers = [];
                        var bufferSize = finalBuffer.readUInt32BE(0);
                        var pixelsSize = finalBuffer.readUInt32BE(4);
                        var width = finalBuffer.readUInt32BE(8);
                        var height = finalBuffer.readUInt32BE(12);
                        var effectiveWidth = BABYLON.Tools.GetExponentOfTwo(width, 4096);
                        var effectiveHeight = BABYLON.Tools.GetExponentOfTwo(height, 4096);
                        var documentNameLength = finalBuffer.readUInt32BE(16);
                        var documentName = finalBuffer.toString("utf-8", 20, 20 + documentNameLength);
                        var texture = ElectronPhotoshopPlugin._Textures[documentName];
                        if (!texture || texture.getBaseSize().width !== effectiveWidth || texture.getBaseSize().height !== effectiveHeight) {
                            if (texture)
                                texture.dispose();
                            var texture = new BABYLON.DynamicTexture(documentName, { width: effectiveWidth, height: effectiveHeight }, _this._core.currentScene, false);
                            EDITOR.Event.sendSceneEvent(texture, EDITOR.SceneEventType.OBJECT_ADDED, _this._core);
                            ElectronPhotoshopPlugin._Textures[documentName] = texture;
                        }
                        var context = texture.getContext();
                        var data = context.getImageData(0, 0, width, height);
                        for (var i = 0; i < pixelsSize; i++) {
                            data.data[i] = finalBuffer.readUInt8(20 + documentNameLength + i);
                        }
                        context.putImageData(data, 0, 0);
                        texture.update(true);
                        EDITOR.Event.sendSceneEvent(texture, EDITOR.SceneEventType.OBJECT_CHANGED, _this._core);
                        _this._core.editor.statusBar.hideSpinner(_this._statusBarId);
                    });
                })
                    .on("error", function (error) {
                    _this._core.editor.statusBar.hideSpinner(_this._statusBarId);
                    throw error;
                });
                this._server.maxConnections = 1;
                this._server.listen(1337, "127.0.0.1", null, function () {
                    // Status bar
                    _this._core.editor.statusBar.setText(_this._statusBarId, "Listening...");
                    _this._core.editor.statusBar.hideSpinner(_this._statusBarId);
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
                this._Instance = null;
            };
            ElectronPhotoshopPlugin._Textures = {};
            /*
            * Static methods
            */
            ElectronPhotoshopPlugin._Instance = null;
            return ElectronPhotoshopPlugin;
        }());
        EDITOR.ElectronPhotoshopPlugin = ElectronPhotoshopPlugin;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
