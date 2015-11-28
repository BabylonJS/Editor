var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var MainToolbar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function MainToolbar(core) {
                // Public members
                this.container = "BABYLON-EDITOR-MAIN-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this._mainRendring = "MAIN-RENDERING";
                this._enablePostProcesses = "ENABLE-POST-PROCESSES";
                this._enableShadows = "ENABLE-SHADOWS";
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("top");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            MainToolbar.prototype.onPreUpdate = function () {
            };
            // Post update
            MainToolbar.prototype.onPostUpdate = function () {
            };
            // Event
            MainToolbar.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
                    var finalID = id.split(":");
                    var item = this.toolbar.getItemByID(finalID[finalID.length - 1]);
                    if (item === null)
                        return false;
                    // Rendering
                    if (id.indexOf(this._mainRendring) !== -1) {
                        if (id.indexOf(this._enablePostProcesses) !== -1) {
                            this._core.currentScene.postProcessesEnabled = !this._core.currentScene.postProcessesEnabled;
                        }
                        else if (id.indexOf(this._enableShadows) !== -1) {
                            this._core.currentScene.shadowsEnabled = !this._core.currentScene.shadowsEnabled;
                        }
                    }
                }
                return false;
            };
            // Creates the UI
            MainToolbar.prototype.createUI = function () {
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this._core);
                var menu = this.toolbar.createMenu("menu", "MAIN-FILES", "File", "icon-folder");
                //...
                menu = this.toolbar.createMenu("menu", "MAIN-EDIT", "Edit", "icon-edit");
                //...
                menu = this.toolbar.createMenu("menu", "MAIN-ADD", "Add", "icon-add");
                //...
                menu = this.toolbar.createMenu("menu", this._mainRendring, "Rendering", "icon-camera");
                this.toolbar.createMenuItem(menu, "check", this._enablePostProcesses, "Enable Post-Processes", "icon-shaders", true);
                this.toolbar.createMenuItem(menu, "check", this._enableShadows, "Enable Shadows", "icon-light", true);
                //...
                // Build element
                this.toolbar.buildElement(this.container);
            };
            return MainToolbar;
        })();
        EDITOR.MainToolbar = MainToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.mainToolbar.js.map