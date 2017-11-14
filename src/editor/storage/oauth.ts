// OAuth Manager for Babylon.js Editor redirection
module BABYLON.EDITOR {
    export class OAuthManager {
        /**
         * On the user has been authentificated
         */
        public static OnAuthentificated (): void {
            // Get token from URL
            let token = '';
            let expires = '';

            if (window.location.hash) {
                const response = window.location.hash.substring(1);
                const authInfo = JSON.parse('{\"' + response.replace(/&/g, '","').replace(/=/g, '":"') + '"}', function (key, value) { return key === '' ? value : decodeURIComponent(value); });

                token = authInfo.access_token;
                expires = authInfo.expires_in;
            }

            // Close popup
            window.opener.BABYLON.EDITOR.OAuthManager.ClosePopup(token, expires, window);
        }

        /**
         * Closes the original popup
         * @param token: the retrieved token
         * @param expires: expiration of the token
         * @param window: the original popup window
         */
        public static ClosePopup (token: string, expires: string, window: Window): void {
            if (token === '')
                throw new Error('Cannot connect to OneDrive or get token...');

            if (window['StorageCallback']) {
                window['StorageCallback'](token, parseInt(expires), Date.now());
            }

            window.close();
        }
    }
}
