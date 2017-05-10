var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var EditorExtension = (function () {
                function EditorExtension() {
                }
                // Loads the extensions file and parses it
                EditorExtension.LoadExtensionsFile = function (url, callback) {
                    BABYLON.Tools.LoadFile(url, function (data) {
                        EditorExtension._ExtensionsDatas = JSON.parse(data);
                        callback();
                    });
                };
                // Returns the wanted extension of type T
                EditorExtension.GetExtensionData = function (key) {
                    if (!EditorExtension._ExtensionsDatas[key])
                        return null;
                    return EditorExtension._ExtensionsDatas[key];
                };
                // Returns the extension giving its name
                EditorExtension.GetExtensionByName = function (name) {
                    for (var i = 0; i < this._InstancedExtensions.length; i++) {
                        if (this._InstancedExtensions[i].extensionKey === name)
                            return this._InstancedExtensions[i];
                    }
                    return null;
                };
                // Applies all the extensions
                EditorExtension.ApplyExtensions = function (scene) {
                    for (var i = 0; i < EditorExtension._Extensions.length; i++) {
                        var extension = new EditorExtension._Extensions[i](scene);
                        var data = EditorExtension.GetExtensionData(extension.extensionKey);
                        if (data || extension.applyEvenIfDataIsNull) {
                            extension.apply(data);
                            this._InstancedExtensions.push(extension);
                        }
                    }
                };
                // Registers extension
                EditorExtension.RegisterExtension = function (extension) {
                    EditorExtension._Extensions.push(extension);
                };
                return EditorExtension;
            }());
            // The extensions plugins
            EditorExtension._Extensions = [];
            EditorExtension._InstancedExtensions = [];
            EXTENSIONS.EditorExtension = EditorExtension;
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.editorExtensions.js.map