module BABYLON.EDITOR {
    var net = require("net");

    interface ITextureInformation {
        [index: string]: DynamicTexture;
    }

    export class ElectronPhotoshopPlugin implements IEventReceiver {
        // Public members

        // Private members
        private _core: EditorCore;
        private _statusBarId = "STATUS-BAR-PHOTOSHOP";

        private _server: any = null;
        private _client: any = null;
        private _texture: DynamicTexture = null;

        private static _Textures: ITextureInformation = { };

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;
            this._core.eventReceivers.push(this);

            // Status bar
            this._core.editor.statusBar.addElement(this._statusBarId, "Ready", "icon-photoshop-connect");
        }

        // On event
        public onEvent(event: Event): boolean {

            return false;
        }

        // Disconnect photoshop
        public disconnect(): boolean {
            if (this._server) {
                this._server.close((err: any) => {
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
        }

        // Connect to photoshop
        public connect(): boolean {
            this._core.editor.statusBar.showSpinner(this._statusBarId);
            this._core.editor.statusBar.setText(this._statusBarId, "Connecting...");

            var buffers: NodeJSBuffer[] = [];

            this._server = net.createServer((socket) => {
                this._client = socket;
                this._client.on("data", (data: Uint8Array) => {
                    this._core.editor.statusBar.showSpinner(this._statusBarId);

                    var buffer = new global.Buffer(data);
                    buffers.push(buffer);
                });

                this._client.on("end", () => {
                    this._client = null;

                    var finalBuffer = global.Buffer.concat(buffers);
                    buffers = [];

                    var bufferSize = finalBuffer.readUInt32BE(0);
                    var pixelsSize = finalBuffer.readUInt32BE(4);
                    var width = finalBuffer.readUInt32BE(8);
                    var height = finalBuffer.readUInt32BE(12);

                    var documentNameLength = finalBuffer.readUInt32BE(16);
                    var documentName = finalBuffer.toString("utf-8", 20, 20 + documentNameLength);

                    var texture = ElectronPhotoshopPlugin._Textures[documentName];

                    if (!texture || texture.getBaseSize().width !== width || texture.getBaseSize().height !== height) {
                        if (texture)
                            texture.dispose();

                        var texture = new DynamicTexture(documentName, { width: width, height: height }, this._core.currentScene, false);
                        Event.sendSceneEvent(texture, SceneEventType.OBJECT_ADDED, this._core);

                        ElectronPhotoshopPlugin._Textures[documentName] = texture;
                    }
                    
                    var context = texture.getContext();
                    var data = context.getImageData(0, 0, width, height);

                    for (var i = 0; i < pixelsSize; i++) {
                        data.data[i] = finalBuffer.readUInt8(20 + documentNameLength + i);
                    }

                    context.putImageData(data, 0, 0);
                    texture.update(true);

                    Event.sendSceneEvent(texture, SceneEventType.OBJECT_CHANGED, this._core);

                    this._core.editor.statusBar.hideSpinner(this._statusBarId);
                });
            })
            .on("error", (error) => {
                this._core.editor.statusBar.hideSpinner(this._statusBarId);
                throw error;
            });

            this._server.maxConnections = 1;
            this._server.listen(1337, "127.0.0.1", null, () => {
                // Status bar
                this._core.editor.statusBar.setText(this._statusBarId, "Listening...");
                this._core.editor.statusBar.hideSpinner(this._statusBarId);
            });

            return true;
        }

        /*
        * Static methods
        */
        private static _Instance: ElectronPhotoshopPlugin = null;

        public static Connect(core: EditorCore): void {
            if (!this._Instance)
                this._Instance = new ElectronPhotoshopPlugin(core);

            this._Instance.connect();
        }

        public static Disconnect(): void {
            if (this._Instance)
                this._Instance.disconnect();

            this._Instance = null;
        }
    }
}