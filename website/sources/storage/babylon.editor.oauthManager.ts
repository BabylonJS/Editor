module BABYLON.EDITOR {
    export class OAuthManager {
        //public static _ClientID = "";
        public static _URI = "";
        public static _TOKEN = "";
        public static _TOKEN_EXPIRES_IN = 0;
        public static _TOKEN_EXPIRES_NOW = 0;
        private static _POPUP: Window = null;

        // When user authentificated using the popup window (and accepted BabylonJSEditor to access files)
        private static _OnAuthentificated(): void {
            // Get token from URL
            var token = "";
            var expires = "";

            if (window.location.hash) {
                var response = window.location.hash.substring(1);
                var authInfo = JSON.parse("{\"" + response.replace(/&/g, '","').replace(/=/g, '":"') + "\"}", function (key, value) { return key === "" ? value : decodeURIComponent(value); });

                token = authInfo.access_token;
                expires = authInfo.expires_in;
            }

            // Close popup
            (<any>window).opener.BABYLON.EDITOR.OAuthManager._ClosePopup(token, expires, window);
        }

        // Closes the login popup
        private static _ClosePopup(token: string, expires: string, window: any): void {
            OAuthManager._TOKEN = token;

            if (token === "") {
                GUI.GUIWindow.CreateAlert("Cannot connect to OneDrive or get token...");
            }
            else {
                OAuthManager._TOKEN_EXPIRES_IN = parseInt(expires);
                OAuthManager._TOKEN_EXPIRES_NOW = Date.now();
            }

            if (window.StorageCallback) {
                window.StorageCallback();
            }

            window.close();
        }

        // Login into storage (OneDrive, DropBox, etc.)
        public static _Login(core: EditorCore, success: () => void): void {
            var now = (Date.now() - OAuthManager._TOKEN_EXPIRES_NOW) / 1000;
            
            if (OAuthManager._TOKEN === "" || now >= OAuthManager._TOKEN_EXPIRES_IN) {
                /*
                var uri = "https://login.live.com/oauth20_authorize.srf"
                    + "?client_id=" + OAuthManager._ClientID
                    + "&redirect_uri=" + Tools.GetBaseURL() + "redirect.html"
                    + "&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite wl.offline_access";
                
                var popup = Tools.OpenWindowPopup(uri, 512, 512);
                */
                var popup = Tools.OpenWindowPopup(OAuthManager._URI, 512, 512);
                popup.StorageCallback = success;
            }
            else {
                success();
            }
        }
    }
}
