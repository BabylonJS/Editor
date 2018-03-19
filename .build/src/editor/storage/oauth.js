// OAuth Manager for Babylon.js Editor redirection
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var OAuthManager = /** @class */ (function () {
            function OAuthManager() {
            }
            /**
             * On the user has been authentificated
             */
            OAuthManager.OnAuthentificated = function () {
                // Get token from URL
                var token = '';
                var expires = '';
                if (window.location.hash) {
                    var response = window.location.hash.substring(1);
                    var authInfo = JSON.parse('{\"' + response.replace(/&/g, '","').replace(/=/g, '":"') + '"}', function (key, value) { return key === '' ? value : decodeURIComponent(value); });
                    token = authInfo.access_token;
                    expires = authInfo.expires_in;
                }
                // Close popup
                window.opener.BABYLON.EDITOR.OAuthManager.ClosePopup(token, expires, window);
            };
            /**
             * Closes the original popup
             * @param token: the retrieved token
             * @param expires: expiration of the token
             * @param window: the original popup window
             */
            OAuthManager.ClosePopup = function (token, expires, window) {
                if (token === '')
                    throw new Error('Cannot connect to OneDrive or get token...');
                if (window['StorageCallback'])
                    window['StorageCallback'](token, parseInt(expires), Date.now());
                window.close();
            };
            return OAuthManager;
        }());
        EDITOR.OAuthManager = OAuthManager;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=oauth.js.map