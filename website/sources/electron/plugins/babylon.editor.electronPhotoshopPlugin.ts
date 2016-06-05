module BABYLON.EDITOR {
    var net = require("net");

    interface ITextureInformation {
        [index: string]: DynamicTexture;
    }

    export class ElectronPhotoshopPlugin implements IEventReceiver {
        // Public members

        // Private members
        private _core: EditorCore;

        private _server: any = null;
        private _client: any = null;
        private _texture: DynamicTexture = null;
        private _textures: ITextureInformation = { };

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;
            this._core.eventReceivers.push(this);
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

            return true;
        }

        // Connect to photoshop
        public connect(): boolean {
            var buffers: Buffer[] = [];

            this._server = net.createServer((socket) => {
                this._client = socket;
                this._client.on("data", (data: Uint8Array) => {
                    var buffer = new Buffer(data);
                    buffers.push(buffer);
                });

                this._client.on("end", () => {
                    this._client = null;

                    var finalBuffer = Buffer.concat(buffers);
                    buffers = [];

                    var bufferSize = finalBuffer.readUInt32BE(0);
                    var pixelsSize = finalBuffer.readUInt32BE(4);
                    var width = finalBuffer.readUInt32BE(8);
                    var height = finalBuffer.readUInt32BE(12);

                    var documentNameLength = finalBuffer.readUInt32BE(16);
                    var documentName = finalBuffer.toString("utf-8", 20, 20 + documentNameLength);

                    var texture = this._textures[documentName];

                    if (!texture || texture.getBaseSize().width !== width || texture.getBaseSize().height !== height) {
                        if (texture)
                            texture.dispose();

                        var texture = new DynamicTexture(documentName, { width: width, height: height }, this._core.currentScene, false);
                        Event.sendSceneEvent(texture, SceneEventType.OBJECT_ADDED, this._core);

                        this._textures[documentName] = texture;
                    }

                    var context = texture.getContext();
                    var data = context.getImageData(0, 0, width, height);

                    for (var i = 0; i < pixelsSize; i++) {
                        data.data[i] = finalBuffer.readUInt8(20 + documentNameLength + i);
                    }

                    context.putImageData(data, 0, 0);
                    texture.update(true);

                    Event.sendSceneEvent(texture, SceneEventType.OBJECT_CHANGED, this._core);
                });
            })
            .on("error", (error) => {
                throw error;
            });

            this._server.maxConnections = 1;
            this._server.listen(1337, "127.0.0.1", null, () => {
                console.log("Server is listening...");
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