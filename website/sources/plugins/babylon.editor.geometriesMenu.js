var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GeometriesMenuPlugin = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function GeometriesMenuPlugin(mainToolbar) {
                // Public members
                this.menuID = "GEOMETRIES-MENU";
                this._createCubeID = "CREATE-CUBE";
                this._createSphereID = "CREATE-SPHERE";
                this._createTubeID = "CREATE-TUBE";
                this._createGroundID = "CREATE-GROUND";
                this._createPlane = "CREATE-PLANE";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Geometry", "icon-bounding-box");
                // Create items
                toolbar.createMenuItem(menu, "button", this._createCubeID, "Add Cube", "icon-box-mesh");
                toolbar.createMenuItem(menu, "button", this._createSphereID, "Add Sphere", "icon-sphere-mesh");
                toolbar.createMenuItem(menu, "button", this._createTubeID, "Create Tube", "icon-cylinder");
                toolbar.addBreak(menu); // Or not
                toolbar.createMenuItem(menu, "button", this._createGroundID, "Add Ground", "icon-ground");
                toolbar.createMenuItem(menu, "button", this._createPlane, "Add Plane", "icon-plane");
                // Etc.
            }
            /**
            * Called when a menu item is selected by the user
            * "selected" is the id of the selected item
            */
            GeometriesMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                // Switch selected menu id
                switch (selected) {
                    case this._createCubeID:
                        EDITOR.SceneFactory.AddBoxMesh(this._core);
                        break;
                    case this._createSphereID:
                        EDITOR.SceneFactory.AddSphereMesh(this._core);
                        break;
                    case this._createTubeID:
                        EDITOR.SceneFactory.AddCylinderMesh(this._core);
                        break;
                    case this._createGroundID:
                        EDITOR.SceneFactory.AddGroundMesh(this._core);
                        break;
                    case this._createPlane:
                        EDITOR.SceneFactory.AddPlaneMesh(this._core);
                        break;
                    default: break;
                }
            };
            return GeometriesMenuPlugin;
        }());
        EDITOR.GeometriesMenuPlugin = GeometriesMenuPlugin;
        // Finally, register the plugin using the plugin manager
        EDITOR.PluginManager.RegisterMainToolbarPlugin(GeometriesMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.geometriesMenu.js.map
