/// <reference path="../index.html" />

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

var EditionTool = (function () {
    function EditionTool(babylonEditorCore, layouts) {
        /// This
        this._core = babylonEditorCore;
        this._core.eventReceivers.push(this);
        this._core.customUpdates.push(this);

        /// Scene
        this.object = null;

        /// GUI Elements
        this.panel = layouts.getPanelFromType('left');
        this._activeTab = this.panel.getTabIDFromIndex(0);
        this._emptyForm = null;

        //
        // Edition tools
        //
        this.editionTools = new Array();

        //
        // Default edition tools (forms)
        //
        /// Genral
        this._generalForms = new BABYLON.Editor.EditionToolGeneral(this._core, this);
        /// Material
        this._materialForms = new BABYLON.Editor.EditionToolMaterial(this._core, this);

        /// Finish
        this.createEmptyForm('Empty', 'To edit an object, double click in the scene or select and object in the graph.');
    };

    EditionTool.prototype.onEvent = function (ev) {

        /// Scene Event
        if (ev.eventType == BABYLON.Editor.EventType.SceneEvent) {

            /// Object picked
            if (ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_PICKED) {

                if (this.object != null && this.object instanceof BABYLON.Mesh) {
                    this.object.showBoundingBox = false;
                    this.object.showSubMeshesBoundingBox = false;
                }

                this.object = ev.event.object;

                /// Update edition tools
                for (var i = 0; i < this.editionTools.length; i++)
                    this.editionTools[i].object = this.object;

                /// Test here for the moment...
                this._core.transformer.setNodeToTransform(this.object);
                /// Tested here for the moment...

                if (this.object != null) {

                    if (this.object instanceof BABYLON.Mesh) {
                        this.object.showBoundingBox = true;
                        this.object.showSubMeshesBoundingBox = true;
                    }

                    this._clearUI();
                    this._createUI();
                } else {
                    this._clearUI();
                    this.createEmptyForm('Empty', 'To edit an object, double click in the scene or select and object in the graph.');
                }
                return false;
            }

            /// Object changed
            else if (ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED) {
                if (ev.event.object == this.object && this.object) {
                    this._objectChanged();
                    return false;
                }
            }

            /// Object removed
            else if (ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_REMOVED) {
                if (ev.event.object == this.object) {
                    this.object = null;
                    this._clearUI();
                    this.createEmptyForm('Empty', 'To edit an object, double click in the scene or select and object in the graph.');
                }
                return false;
            }

        }

        else /// UI Event

        if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.FORM_CHANGED) {
                for (var i = 0; i < this.editionTools.length; i++) {
                    if (this.editionTools[i].forms.indexOf(ev.event.result) != -1) {
                        this._onChange();
                        return true;
                    }
                }
            }

            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.TAB_CHANGED) {
                for (var i = 0; i < this.editionTools.length; i++) {
                    if (this.editionTools[i].EditionToolName == ev.event.result) {
                        this._clearUI();
                        this._activeTab = ev.event.result;
                        this._createUI();
                        return true;
                    }
                }
            }

        }

        return false;

    }

    EditionTool.prototype.update = function () {
        if (this.object != null) {
            /// Update forms records here...
        }
    }

    /// Creates an empty form to tell 0 object is selected
    EditionTool.prototype.createEmptyForm = function (name, text) {
        this._clearUI();
        BabylonEditorUICreator.Form.createDivsForForms(['MainEditorEditObjectEmpty'], 'BabylonEditorEditObject', true);
        this._emptyForm = new BABYLON.Editor.GUIForm('MainEditorEditObjectEmpty', this._core, 'Empty');
        this._emptyForm.textBlock = text;
        this._emptyForm.buildElement('MainEditorEditObjectEmpty');
    }

    /// Clears the UI
    EditionTool.prototype._clearUI = function () {

        for (var i = 0; i < this.editionTools.length; i++) {
            this.panel.setTabEnabled(this.editionTools[i].EditionToolName);
            this.editionTools[i].clearUI();
        }

        /// Can clear other forms or UI elements
        if (this._emptyForm)
            BabylonEditorUICreator.clearUI([this._emptyForm.name]);
    }

    EditionTool.prototype._objectChanged = function () {

        for (var i = 0; i < this.editionTools.length; i++)
            if (this._activeTab == this.editionTools[i].EditionToolName) {
                this.editionTools[i].objectChanged();
                break;
            }
    }

    EditionTool.prototype._onChange = function () {

        for (var i = 0; i < this.editionTools.length; i++) {
            if (this._activeTab == this.editionTools[i].EditionToolName) {
                this.editionTools[i].applyChanges();
                break;
            }
        }

        /// Send event because object changed
        var event = new BABYLON.Editor.Event();
        event.eventType = BABYLON.Editor.EventType.SceneEvent;
        event.event = new BABYLON.Editor.Event.SceneEvent();
        event.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED;
        event.event.object = this.object;
        this._core.sendEvent(event);
    }

    EditionTool.prototype._createUI = function () {
        if (!this.object) return;

        for (var i = 0; i < this.editionTools.length; i++) {
            if (this.editionTools[i].isObjectSupported(this.object)) {
                this.panel.setTabEnabled(this.editionTools[i].EditionToolName, true);

                if (this._activeTab == this.editionTools[i].EditionToolName)
                    this.editionTools[i].createUI();
            }
            else
                this.panel.setTabEnabled(this.editionTools[i].EditionToolName, false);
        }

    }

    return EditionTool;

})();

BABYLON.Editor.EditionTool = EditionTool;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON
