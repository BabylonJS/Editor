/// <reference path="./../index.html" />

function BabylonEditorMainToolbar(babylonEditorCore) {
    this._core = babylonEditorCore;
    this._core.eventReceivers.push(this);
};

BabylonEditorMainToolbar.prototype.onEvent = function (event) {

    if (event.EventType == BabylonEditorEventType.UIEvent) {
        /// Tool bar menu/button/etc. selected
        if (event.UIEvent.Type == BabylonEditorEvents.UIEvents.ToolbarSelected) {
            
            /// Position, rotation or scaling
            if (['MainToolBarPosition', 'MainToolBarRotation', 'MainToolBarScale'].indexOf(event.UIEvent.Caller) > -1) {
                var checked = BabylonEditorUICreator.Toolbar.isItemChecked('MainToolBar', event.UIEvent.Caller);
                /// Uncheck position, rotation and scaling
                BabylonEditorUICreator.Toolbar.setItemChecked('MainToolBar', 'MainToolBarPosition', false);
                BabylonEditorUICreator.Toolbar.setItemChecked('MainToolBar', 'MainToolBarRotation', false);
                BabylonEditorUICreator.Toolbar.setItemChecked('MainToolBar', 'MainToolBarScale', false);
                /// And check or uncheck it
                BabylonEditorUICreator.Toolbar.setItemChecked('MainToolBar', event.UIEvent.Caller, !checked);
                /// Set transformer
                this.setTransformer(checked ? null : event.UIEvent.Caller);
            }

        }
    }

}

/// Sets the appropriate transformer, identified by its id (string)
BabylonEditorMainToolbar.prototype.setTransformer = function (id) {
    /// To fill
    if (id == 'MainToolBarPosition')
        this._core.transformer.setTransformerType(BabylonEditorTransformerType.Position);
    else if (id == 'MainToolBarRotation')
        this._core.transformer.setTransformerType(BabylonEditorTransformerType.Rotation);
    else if (id == 'MainToolBarScale')
        this._core.transformer.setTransformerType(BabylonEditorTransformerType.Scaling);
    else
        this._core.transformer.setTransformerType(BabylonEditorTransformerType.Nothing);
}

BabylonEditorMainToolbar.prototype._createUI = function () {
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

    /// Create tool bar
    BabylonEditorUICreator.Toolbar.createToolbar('MainToolBar', items, this);

}
