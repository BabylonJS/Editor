var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var OAuthManager = (function () {
            function OAuthManager() {
            }
            // When user authentificated using the popup window (and accepted BabylonJSEditor to access files)
            OAuthManager._OnAuthentificated = function () {
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
                window.opener.BABYLON.EDITOR.OAuthManager._ClosePopup(token, expires, window);
            };
            // Closes the login popup
            OAuthManager._ClosePopup = function (token, expires, window) {
                OAuthManager._TOKEN = token;
                if (token === "") {
                    EDITOR.GUI.GUIWindow.CreateAlert("Cannot connect to OneDrive or get token...");
                }
                else {
                    OAuthManager._TOKEN_EXPIRES_IN = parseInt(expires);
                    OAuthManager._TOKEN_EXPIRES_NOW = Date.now();
                }
                if (window.StorageCallback) {
                    window.StorageCallback();
                }
                window.close();
            };
            // Login into storage (OneDrive, DropBox, etc.)
            OAuthManager._Login = function (core, success) {
                var now = (Date.now() - OAuthManager._TOKEN_EXPIRES_NOW) / 1000;
                if (OAuthManager._TOKEN === "" || now >= OAuthManager._TOKEN_EXPIRES_IN) {
                    /*
                    var uri = "https://login.live.com/oauth20_authorize.srf"
                        + "?client_id=" + OAuthManager._ClientID
                        + "&redirect_uri=" + Tools.GetBaseURL() + "redirect.html"
                        + "&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite wl.offline_access";
                    
                    var popup = Tools.OpenWindowPopup(uri, 512, 512);
                    */
                    var popup = EDITOR.Tools.OpenWindowPopup(OAuthManager._URI, 512, 512);
                    popup.StorageCallback = success;
                }
                else {
                    success();
                }
            };
            return OAuthManager;
        }());
        //public static _ClientID = "";
        OAuthManager._URI = "";
        OAuthManager._TOKEN = "";
        OAuthManager._TOKEN_EXPIRES_IN = 0;
        OAuthManager._TOKEN_EXPIRES_NOW = 0;
        OAuthManager._POPUP = null;
        EDITOR.OAuthManager = OAuthManager;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.oauthManager.js.map
