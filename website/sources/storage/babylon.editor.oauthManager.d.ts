declare module BABYLON.EDITOR {
    class OAuthManager {
        static _URI: string;
        static _TOKEN: string;
        static _TOKEN_EXPIRES_IN: number;
        static _TOKEN_EXPIRES_NOW: number;
        private static _POPUP;
        private static _OnAuthentificated();
        private static _ClosePopup(token, expires, window);
        static _Login(core: EditorCore, success: () => void): void;
    }
}
