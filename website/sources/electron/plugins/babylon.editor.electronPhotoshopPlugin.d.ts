declare module BABYLON.EDITOR {
    class ElectronPhotoshopPlugin implements IEventReceiver {
        private _core;
        private _statusBarId;
        private _server;
        private _client;
        private _texture;
        private static _Textures;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        disconnect(): boolean;
        connect(): boolean;
        private static _Instance;
        static Connect(core: EditorCore): void;
        static Disconnect(): void;
    }
}
