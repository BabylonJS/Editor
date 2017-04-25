var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneFactory2D = (function () {
            function SceneFactory2D() {
            }
            // Adds a new container2d
            SceneFactory2D.AddContainer2D = function (core) {
                var container = new BABYLON.Container2D("New Container", core.scene2d);
                container.id = EDITOR.SceneFactory.GenerateUUID();
                EDITOR.SceneFactory.ConfigureObject(container, core);
                return container;
            };
            // Adds a new sprite2d
            SceneFactory2D.AddSprite2D = function (core) {
                var sprite = new BABYLON.Sprite2D("New sprite", core.scene2d);
                sprite.id = EDITOR.SceneFactory.GenerateUUID();
                EDITOR.SceneFactory.ConfigureObject(sprite, core);
                return sprite;
            };
            return SceneFactory2D;
        }());
        EDITOR.SceneFactory2D = SceneFactory2D;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.sceneFactory2d.js.map
