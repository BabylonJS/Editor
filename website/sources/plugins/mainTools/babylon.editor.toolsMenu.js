var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ToolsMenu = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ToolsMenu(mainToolbar) {
                // Public members
                this.menuID = "TOOLS-PLUGIN-MENU";
                this._openActionsBuilder = "OPEN-ACTIONS-BUILDER";
                this._openPostProcessBuilder = "OPEN-POST-PROCESS-BUILDER";
                this._openMaterialBuilder = "OPEN-MATERIAL-BUILDER";
                this._openSoftBodyBuilder = "OPEN-SOFT-BODY-BUILDER";
                this._openCosmos = "OPEN-COSMOS";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Tools", "icon-scenario");
                // Create items
                toolbar.createMenuItem(menu, "button", this._openActionsBuilder, "Open Actions Builder", "icon-graph");
                toolbar.addBreak(menu);
                toolbar.createMenuItem(menu, "button", this._openPostProcessBuilder, "Open Post-Process Builder", "icon-render");
                toolbar.createMenuItem(menu, "button", this._openMaterialBuilder, "Open Material Builder", "icon-shaders");
                toolbar.addBreak(menu);
                toolbar.createMenuItem(menu, "button", this._openSoftBodyBuilder, "Open Soft Body Builder", "icon-soft-body");
                //toolbar.createMenuItem(menu, "button", this._openCosmos, "Open Cosmos Editor", "icon-shaders");
                // Test
                // ActionsBuilder.GetInstance(this._core);
                // new PostProcessBuilder(this._core);
                // new CosmosEditor(this._core);
                // new SoftBodyBuilder(this._core);
            }
            // Called when a menu item is selected by the user
            ToolsMenu.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    case this._openActionsBuilder:
                        EDITOR.ActionsBuilder.GetInstance(this._core);
                        break;
                    case this._openPostProcessBuilder:
                        new EDITOR.PostProcessBuilder(this._core);
                        break;
                    case this._openMaterialBuilder:
                        new EDITOR.MaterialBuilder(this._core);
                        break;
                    case this._openSoftBodyBuilder:
                        new EDITOR.SoftBodyBuilder(this._core);
                        break;
                    case this._openCosmos:
                        new EDITOR.CosmosEditor(this._core);
                        break;
                    default: break;
                }
            };
            return ToolsMenu;
        }());
        EDITOR.ToolsMenu = ToolsMenu;
        // Finally, register the plugin using the plugin manager
        EDITOR.PluginManager.RegisterMainToolbarPlugin(ToolsMenu);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.toolsMenu.js.map
