/// <reference path="../index.html" />

/// Extends (already exists)
var __extends = this.__extends;

var MaterialManager = (function (_super) {
    __extends(MaterialManager, _super);
    function MaterialManager() {
        /// Extend class
        _super.call(this);

        /// UI
        this._window = null;
        this._layouts = null;
        /// Left
        this._materialsGrid = null;
        /// Right
        this._materialForm = null;
    }

    MaterialManager.prototype.configure = function (core) {
        _super.prototype.configure.call(this, core);
        this.core.eventReceivers.push(this);

        this._createUI();
    }

    MaterialManager.prototype.onEvent = function (ev) {

        if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.GRID_SELECTED) {
                if (ev.event.caller == this._materialsGrid) {
                    var index = ev.event.result;
                    if (index >= 0 && index < this.core.coreData.materialShaders.length) {
                        this._materialForm.fillSpecifiedFields(['MaterialName'], [this.core.coreData.materialShaders[index].name]);
                    }
                    return true;
                }
            }

            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.GRID_ROW_REMOVED) {
                if (ev.event.caller == this._materialsGrid) {
                    var selectedRows = this._materialsGrid.getSelectedRows();
                    for (var i = 0; i < selectedRows.length; i++) {
                        this.core.coreData.removeMaterial(selectedRows[i] - i);
                    }
                    return true;
                }
            }
            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.GRID_ADD_ROW) {
                if (ev.event.caller == this._materialsGrid) {
                    var m = this.core.coreData.addMaterial(null, '', '', '', '');
                    this._materialsGrid.addRow({ name: m.name });
                    return true;
                }
            }
            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.GRID_EDIT_ROW) {
                if (ev.event.caller == this._materialsGrid) {
                    if (ev.event.result.length == 1) {
                        _super.prototype.close.call(this);
                        BABYLON.Editor.Plugin.executeScript('UserInterfaces/babylon.editor.ui.materialCreator.js', this.core, null,
                            { materialShader: this.core.coreData.materialShaders[ev.event.result[0]] });
                        this._close();
                    }
                }
            }

            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.FORM_CHANGED) {
                if (ev.event.caller == this._materialForm) {
                    var selectedRows = this._materialsGrid.getSelectedRows();
                    if (selectedRows.length == 1) {
                        var elements = this._materialForm.getElements();
                        this.core.coreData.materialShaders[selectedRows[0]].name = elements['MaterialName'].value;
                        this._materialsGrid.modifyRow(selectedRows[0], { name: this.core.coreData.materialShaders[selectedRows[0]].name });
                    }
                    return true;
                }
            }

            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED) {
                if (ev.event.caller == this._window) { /// Close button
                    _super.prototype.close.call(this);
                    this._window.close();
                }

            }
        }

        return false;
    }

    MaterialManager.prototype._close = function () {
        this._materialForm.destroy();
        this._materialsGrid.destroy();
        this._layouts.destroy();
    }

    MaterialManager.prototype._createUI = function () {
        var scope = this;

        /// Create popup with a canvas
        this._window = new BABYLON.Editor.GUIWindow('BabylonEditorAddMeshWindow', this.core, 'Materials Manager', '<div id="BabylonEditorEditMaterialsLayout" style="height: 100%"></div>', new BABYLON.Vector2(1000, 500), ['Close']);
        this._window.buildElement();
        this._window.onClose(function () {
            scope._close();
        });

        /// Layouts
        this._layouts = new BABYLON.Editor.GUILayout('BabylonEditorEditMaterialsLayout');
        this._layouts.createPanel('BabylonEditorEditMaterialsGrid', 'left', 500, false).setContent('<div id="BabylonEditorEditMaterialsGrid" style="height: 100%; width: 100%;"></div>');
        this._layouts.createPanel('BabylonEditorEditMaterialsForm', 'right', 500, false).setContent('<div id="BabylonEditorEditMaterialsForm"></div>');
        this._layouts.buildElement('BabylonEditorEditMaterialsLayout');

        /// Grid
        this._materialsGrid = new BABYLON.Editor.GUIGrid('BabylonEditorEditMaterialsGrid', this.core, 'Custom Materials');
        this._materialsGrid.showAdd = true;
        this._materialsGrid.showDelete = true;
        this._materialsGrid.showEdit = true;
        this._materialsGrid.createColumn('name', 'Material Name', '100%');
        this._materialsGrid.buildElement('BabylonEditorEditMaterialsGrid');

        for (var i = 0; i < this.core.coreData.materialShaders.length; i++) {
            this._materialsGrid.addRow({ name: this.core.coreData.materialShaders[i].name });
        }

        /// Form
        this._materialForm = new BABYLON.Editor.GUIForm('BabylonEditorEditMaterialsForm', this.core, 'Properties');
        this._materialForm.createField('MaterialName', 'text', 'Name :', 5);
        this._materialForm.buildElement('BabylonEditorEditMaterialsForm');
    }

    return MaterialManager;

})(BABYLON.Editor.Plugin);


this.createPlugin = function () {
    return new MaterialManager();
}
//# sourceMappingURL=babylon.editor.ui.editMaterials.js.map
