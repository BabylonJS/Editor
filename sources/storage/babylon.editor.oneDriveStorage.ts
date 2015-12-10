module BABYLON.EDITOR {
    export class OneDriverStorage implements IStorage {
        // Public members

        // Private members

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {

        }

        // Authenticate to OneDrive
        public authenticate(): void {
            var cookie = document.cookie;
            var name = "odauth=";
            var index = cookie.indexOf(name);

            if (index !== -1) {

            }
            else {

            }
        }

        // Get token from cookie
        private _getTokenFromCookie(): string {
            var cookie = document.cookie;
            var name = "odauth=";
            var index = cookie.indexOf(name);

            if (index !== -1) {

            }
            
            return null;
        }
    }
}