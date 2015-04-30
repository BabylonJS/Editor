/// <reference path="./../index.html" />

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

    var MainToolbar = (function() {
        function MainToolbar(babylonEditorCore) {
            /// This
            this._core = babylonEditorCore;
            this._core.eventReceivers.push(this);

            /// GUI Elements
            this._toolbar = null;
            this._toolsToolbar = null;
        };

        MainToolbar.prototype.onEvent = function (ev) {

            if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
                /// Tool bar menu/button/etc. selected
                if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.TOOLBAR_SELECTED) {

                    if (ev.event.caller == this._toolbar) {
                        /// Main Toolbar
                        /// Position, rotation or scaling
                        if (['MainPosition', 'MainRotation', 'MainScale'].indexOf(ev.event.result) > -1) {
                            var checked = this._toolbar.isItemChecked(ev.event.result);
                            /// Uncheck position, rotation and scaling
                            this._toolbar.setItemChecked('MainPosition', false);
                            this._toolbar.setItemChecked('MainRotation', false);
                            this._toolbar.setItemChecked('MainScale', false);
                            /// And check or uncheck it
                            this._toolbar.setItemChecked(ev.event.result, !checked);
                            /// Set transformer
                            this.setTransformer(checked ? null : ev.event.result);
                        }
                        else if (ev.event.result == 'MainAddMesh') {
                            BABYLON.Editor.Plugin.executeScript('UserInterfaces/babylon.editor.ui.addMesh.js', this._core);
                        }
                        else if (ev.event.result == 'MainPlayGame') {
                            this._core.engine.switchFullscreen(true);
                            document.body.appendChild(this._core.canvas);
                            this._core.engine.resize();
                        }

                        /// MainEdit
                        else if (ev.event.result == 'MainEdit:edit-textures') {
                            BABYLON.Editor.Plugin.executeScript('UserInterfaces/babylon.editor.ui.editTextures.js', this._core);
                        }
                        else if (ev.event.result == 'MainEdit:edit-material-shaders') {
                            BABYLON.Editor.Plugin.executeScript('UserInterfaces/babylon.editor.ui.editMaterials.js', this._core);
                        }
                        else if (ev.event.result == 'MainEdit:create-material-shader') {
                            BABYLON.Editor.Plugin.executeScript('UserInterfaces/babylon.editor.ui.materialCreator.js', this._core);
                        }

                        /// Main Add
                        /// Lights
                        else if (ev.event.result == 'MainAdd:add-directional-light') {
                            var light = new BABYLON.DirectionalLight('New Directional Light', BABYLON.Vector3.Zero(), this._core.currentScene);
                            var shadows = new BABYLON.ShadowGenerator(1024, light);
                            BABYLON.Editor.Utils.SendEventObjectAdded(light, this._core);
                        }
                        else if (ev.event.result == 'MainAdd:add-spot-light') {
                            var light = new BABYLON.SpotLight("New Spot Light", BABYLON.Vector3.Zero(), new BABYLON.Vector3(-1, -2, -1), Math.PI, 1, this._core.currentScene);
                            var shadows = new BABYLON.ShadowGenerator(1024, light);
                            BABYLON.Editor.Utils.SendEventObjectAdded(light, this._core);
                        }
                        else if (ev.event.result == 'MainAdd:add-point-light') {
                            var light = new BABYLON.PointLight("New Point Light", BABYLON.Vector3.Zero(), this._core.currentScene);
                            BABYLON.Editor.Utils.SendEventObjectAdded(light, this._core);
                        }

                        return true;

                    } else if (ev.event.caller == this._toolsToolbar) {/// Tools Toolbar

                        if (ev.event.result == 'ToolsAddCube') {
                            BABYLON.Editor.Factory.addBox(this._core);
                        } else if (ev.event.result == 'ToolsAddSphere') {
                            BABYLON.Editor.Factory.addSphere(this._core);
                        } else if (ev.event.result == 'ToolsAddGround') {
                            BABYLON.Editor.Factory.addGround(this._core);
                        } else if (ev.event.result == 'ToolsAddBillboard') {
                            /// Nothing for the moment... 
                        } else if (ev.event.result == 'ToolsAddLight') {
                            BABYLON.Editor.Factory.addLight(this._core);
                        }

                        return true;
                    }
                }
            }

            return false;
        }

        /// Sets the appropriate transformer, identified by its id (string)
        MainToolbar.prototype.setTransformer = function (id) {
            if (id == 'MainPosition')
                this._core.transformer.setTransformerType(BabylonEditorTransformerType.Position);
            else if (id == 'MainRotation')
                this._core.transformer.setTransformerType(BabylonEditorTransformerType.Rotation);
            else if (id == 'MainScale')
                this._core.transformer.setTransformerType(BabylonEditorTransformerType.Scaling);
            else
                this._core.transformer.setTransformerType(BabylonEditorTransformerType.Nothing);
        }

        /// Creates the toolbars
        MainToolbar.prototype._createUI = function () {

            /// Main toolbar
            this._toolbar = new BABYLON.Editor.GUIToolbar('BabylonEditorMainToolbar', this._core);
            var menu = this._toolbar.createMenu('menu', 'MainFiles', 'Files', 'icon-folder');
            menu.createItem('button', 'open-scene', 'Open saved scene...', 'icon-open-file');
            menu.createItem('button', 'save-scene', 'Save scene...', 'icon-save-file');

            menu = this._toolbar.createMenu('menu', 'MainEdit', 'Edit', 'icon-edit');
            menu.createItem('button', 'edit-textures', 'Edit textures...', 'icon-textures');
            menu.createItem('button', 'edit-material-shaders', 'Edit material shaders...', 'icon-shaders');
            menu.createItem('button', 'create-material-shader', 'Create a material shader...', 'icon-shaders');
            menu.createItem('break');

            this._toolbar.createMenu('break');

            menu = this._toolbar.createMenu('menu', 'MainAdd', 'Add...', 'icon-primitives');
            menu.createItem('button', 'add-ground', 'Add Ground', 'icon-add-ground');
            menu.createItem('button', 'add-sphere', 'Add Sphere', 'icon-add-sphere');
            menu.createItem('button', 'add-cube', 'Add Cube', 'icon-add-cube');
            menu.createItem('button', 'add-billboard', 'Add Billboard', 'icon-add-billboard');
            menu.createItem('break');
            menu.createItem('button', 'add-directional-light', 'Directional Light', 'icon-directional-light');
            menu.createItem('button', 'add-spot-light', 'Spot Light', 'icon-directional-light');
            menu.createItem('button', 'add-point-light', 'Point Light', 'icon-add-light');

            this._toolbar.createMenu('button', 'MainAddMesh', 'Add Mesh...', 'icon-mesh');

            this._toolbar.createMenu('break');

            this._toolbar.createMenu('button', 'MainPosition', '', 'icon-position');
            this._toolbar.createMenu('button', 'MainRotation', '', 'icon-rotation');
            this._toolbar.createMenu('button', 'MainScale', '', 'icon-scale');

            this._toolbar.createMenu('break');
            this._toolbar.createMenu('button', 'MainPlayGame', 'Play Game', 'icon-play-game');

            this._toolbar.buildElement('BabylonEditorMainToolbar');

            /// Tools toolbar
            this._toolsToolbar = new BABYLON.Editor.GUIToolbar('BabylonEditorToolsToolbar', this._core);
            this._toolsToolbar.createMenu('button', 'ToolsAddCube', '', 'icon-add-cube');
            this._toolsToolbar.createMenu('button', 'ToolsAddSphere', '', 'icon-add-sphere');
            this._toolsToolbar.createMenu('button', 'ToolsAddGround', '', 'icon-add-ground');
            this._toolsToolbar.createMenu('button', 'ToolsAddBillboard', '', 'icon-add-billboard');
            this._toolsToolbar.createMenu('button', 'ToolsAddLight', '', 'icon-add-light');

            this._toolsToolbar.buildElement('BabylonEditorToolsToolbar');
        }

        return MainToolbar;

    })();

BABYLON.Editor.MainToolbar = MainToolbar;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON