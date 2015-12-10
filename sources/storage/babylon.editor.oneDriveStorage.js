var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var OneDriverStorage = (function () {
            // Public members
            // Private members
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function OneDriverStorage(core) {
            }
            // Authenticate to OneDrive
            OneDriverStorage.prototype.authenticate = function () {
                var cookie = document.cookie;
                var name = "odauth=";
                var index = cookie.indexOf(name);
                if (index !== -1) {
                }
                else {
                }
            };
            // Get token from cookie
            OneDriverStorage.prototype._getTokenFromCookie = function () {
                var cookie = document.cookie;
                var name = "odauth=";
                var index = cookie.indexOf(name);
                if (index !== -1) {
                }
                return null;
            };
            return OneDriverStorage;
        })();
        EDITOR.OneDriverStorage = OneDriverStorage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.oneDriveStorage.js.map