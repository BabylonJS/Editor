var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GeometriesMenuPlugin = (function () {
            function GeometriesMenuPlugin(mainToolbar) {
                this.menuID = "GEOMETRIES-MENU";
                this._createCubeID = "CREATE-CUBE";
                this._createSphereID = "CREATE-SPHERE";
                this._createGroundID = "CREATE-GROUND";
                this._createHeightMap = "CREATE-HEIGHTMAP";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                var menu = toolbar.createMenu("menu", this.menuID, "Geometry", "icon-bounding-box");
                toolbar.createMenuItem(menu, "button", this._createCubeID, "Add Cube", "icon-box-mesh");
                toolbar.createMenuItem(menu, "button", this._createSphereID, "Add Sphere", "icon-sphere-mesh");
                toolbar.addBreak(menu);
                toolbar.createMenuItem(menu, "button", this._createGroundID, "Add Ground", "icon-mesh");
            }
            GeometriesMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    case this._createCubeID:
                        EDITOR.SceneFactory.AddBoxMesh(this._core);
                        break;
                    case this._createSphereID:
                        EDITOR.SceneFactory.AddSphereMesh(this._core);
                        break;
                    case this._createGroundID:
                        EDITOR.SceneFactory.AddGroundMesh(this._core);
                        break;
                    default: break;
                }
            };
            return GeometriesMenuPlugin;
        }());
        EDITOR.GeometriesMenuPlugin = GeometriesMenuPlugin;
        EDITOR.PluginManager.RegisterMainToolbarPlugin(GeometriesMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
