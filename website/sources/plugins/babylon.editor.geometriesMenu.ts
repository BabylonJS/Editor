module BABYLON.EDITOR {
    export class GeometriesMenuPlugin implements ICustomToolbarMenu {
        // Public members
        public menuID = "GEOMETRIES-MENU";

        // Private members
        private _core: EditorCore;

        private _createCubeID = "CREATE-CUBE";
        private _createSphereID = "CREATE-SPHERE";
        private _createTubeID = "CREATE-TUBE";

        private _createGroundID = "CREATE-GROUND";
        private _createPlane = "CREATE-PLANE";

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar) {
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
        public onMenuItemSelected(selected: string): void {
            // Switch selected menu id
            switch (selected) {
                case this._createCubeID:
                    SceneFactory.AddBoxMesh(this._core);
                    break;
                case this._createSphereID:
                    SceneFactory.AddSphereMesh(this._core);
                    break;
                case this._createTubeID:
                    SceneFactory.AddCylinderMesh(this._core);
                    break;

                case this._createGroundID:
                    SceneFactory.AddGroundMesh(this._core);
                    break;
                case this._createPlane:
                    SceneFactory.AddPlaneMesh(this._core);
                    break;
                default: break;
            }
        }
    }

    // Finally, register the plugin using the plugin manager
    PluginManager.RegisterMainToolbarPlugin(GeometriesMenuPlugin);
}