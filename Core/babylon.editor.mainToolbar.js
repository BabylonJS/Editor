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

                    /// Main Toolbar
                    /// Position, rotation or scaling
                    if (['MainToolBarPosition', 'MainToolBarRotation', 'MainToolBarScale'].indexOf(ev.event.caller) > -1) {
                        var checked = BabylonEditorUICreator.Toolbar.isItemChecked(this._toolbar, ev.event.caller);
                        /// Uncheck position, rotation and scaling
                        BabylonEditorUICreator.Toolbar.setItemChecked(this._toolbar, 'MainToolBarPosition', false);
                        BabylonEditorUICreator.Toolbar.setItemChecked(this._toolbar, 'MainToolBarRotation', false);
                        BabylonEditorUICreator.Toolbar.setItemChecked(this._toolbar, 'MainToolBarScale', false);
                        /// And check or uncheck it
                        BabylonEditorUICreator.Toolbar.setItemChecked(this._toolbar, ev.event.caller, !checked);
                        /// Set transformer
                        this.setTransformer(checked ? null : ev.event.caller);
                    } else if (ev.event.caller == 'MainToolBarAddMesh') {
                        BABYLON.Editor.Plugin.executeScript('UserInterfaces/babylon.editor.ui.addMesh.js', this._core);
                    }

                    else /// Tools Toolbar

                    if (ev.event.caller == 'MainToolsToolbarAddCube') {
                        BABYLON.Editor.Factory.addBox(this._core);
                    } else if (ev.event.caller == 'MainToolsToolbarAddSphere') {
                        BABYLON.Editor.Factory.addSphere(this._core);
                    } else if (ev.event.caller == 'MainToolsToolbarAddGround') {
                        BABYLON.Editor.Factory.addGround(this._core);
                    } else if (ev.event.caller == 'MainToolsToolbarAddBillboard') {
                        /// Nothing for the moment... 
                    } else if (ev.event.caller == 'MainToolsToolbarAddLight') {
                        BABYLON.Editor.Factory.addLight(this._core);
                    }
                }
            }

        }

        /// Sets the appropriate transformer, identified by its id (string)
        MainToolbar.prototype.setTransformer = function (id) {
            if (id == 'MainToolBarPosition')
                this._core.transformer.setTransformerType(BabylonEditorTransformerType.Position);
            else if (id == 'MainToolBarRotation')
                this._core.transformer.setTransformerType(BabylonEditorTransformerType.Rotation);
            else if (id == 'MainToolBarScale')
                this._core.transformer.setTransformerType(BabylonEditorTransformerType.Scaling);
            else
                this._core.transformer.setTransformerType(BabylonEditorTransformerType.Nothing);
        }

        /// Creates the toolbars
        MainToolbar.prototype._createUI = function () {
            /// Create items
            var items = new Array();
            BabylonEditorUICreator.Toolbar.extendItems(items, [
                BabylonEditorUICreator.Toolbar.createMenu('menu', 'MainFiles', 'File', 'icon-open-file', false, [
                    BabylonEditorUICreator.Toolbar.createItem('button', 'open-scene', 'Open a saved scene...', 'icon-open-file'),
                    BabylonEditorUICreator.Toolbar.createItem('button', 'save-scene', 'Save scene..', 'icon-save-file')
                ]),
                BabylonEditorUICreator.Toolbar.createMenu('menu', 'MainEdit', 'Edit', 'icon-edit', false, [
                    BabylonEditorUICreator.Toolbar.createItem('button', 'edit-materials', 'Edit Materials...'),
                    BabylonEditorUICreator.Toolbar.createItem('button', 'edit-material-shaders', 'Edit Material Shaders..'),
                    BabylonEditorUICreator.Toolbar.createItem('break'),
                    BabylonEditorUICreator.Toolbar.createItem('button', 'edit-current-scene', 'Edit Current Scene...'),
                ]),
                BabylonEditorUICreator.Toolbar.createMenu('break'),
                BabylonEditorUICreator.Toolbar.createMenu('menu', 'MainToolBarAddLight', 'Add Light', 'icon-add-light', false, [
                    BabylonEditorUICreator.Toolbar.createItem('button', 'add-point-light', 'Point Light', 'icon-add-light'),
                    BabylonEditorUICreator.Toolbar.createItem('button', 'add-spot-light', 'Spot Light', 'icon-add-light'),
                ]),
                BabylonEditorUICreator.Toolbar.createMenu('menu', 'MainToolBarAddPrimitive', 'Primitives', 'icon-primitives', false, [
                    BabylonEditorUICreator.Toolbar.createItem('button', 'add-ground', 'Add Ground', 'icon-add-ground'),
                    BabylonEditorUICreator.Toolbar.createItem('button', 'add-sphere', 'Add Sphere', 'icon-add-sphere'),
                    BabylonEditorUICreator.Toolbar.createItem('button', 'add-cube', 'Add Cube', 'icon-add-cube'),
                    BabylonEditorUICreator.Toolbar.createItem('button', 'add-billboard', 'Add Billboard', 'icon-add-billboard'),
                ]),
                BabylonEditorUICreator.Toolbar.createMenu('button', 'MainToolBarAddMesh', 'Add Mesh...', 'icon-mesh', false),
                BabylonEditorUICreator.Toolbar.createMenu('break'),
                BabylonEditorUICreator.Toolbar.createMenu('button', 'MainToolBarPosition', '', 'icon-position', false),
                BabylonEditorUICreator.Toolbar.createMenu('button', 'MainToolBarRotation', '', 'icon-rotation', false),
                BabylonEditorUICreator.Toolbar.createMenu('button', 'MainToolBarScale', '', 'icon-scale', false),
            ]);

            /// Create main tool bar
            this._toolbar = BabylonEditorUICreator.Toolbar.createToolbar('MainToolBar', items, this, 'Main');

            /// Create tools items
            items = new Array();
            BabylonEditorUICreator.Toolbar.extendItems(items, [
                BabylonEditorUICreator.Toolbar.createMenu('button', 'MainToolsToolbarAddCube', '', 'icon-add-cube', false),
                BabylonEditorUICreator.Toolbar.createMenu('button', 'MainToolsToolbarAddSphere', '', 'icon-add-sphere', false),
                BabylonEditorUICreator.Toolbar.createMenu('button', 'MainToolsToolbarAddGround', '', 'icon-add-ground', false),
                BabylonEditorUICreator.Toolbar.createMenu('button', 'MainToolsToolbarAddBillboard', '', 'icon-add-billboard', false),
                BabylonEditorUICreator.Toolbar.createMenu('button', 'MainToolsToolbarAddLight', '', 'icon-add-light', false),
            ]);
            this._toolsToolbar = BabylonEditorUICreator.Toolbar.createToolbar('MainToolsToolBar', items, this, 'Tools');

        }

        return MainToolbar;

    })();

BABYLON.Editor.MainToolbar = MainToolbar;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON