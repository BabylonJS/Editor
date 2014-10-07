/// <reference path="../../index.html" />

/* 
General forms for objects configuration
*/

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

var EditionToolGeneral = (function () {

    function EditionToolGeneral(core, parent) {
        /// Core
        this._core = core;
        this.object = null;
        this.parent = parent;

        /// Forms
        this._generalForm = null;
        this._transformForm = null;
        this._optionsForm = null;
        this._renderingForm = null;

        /// GUI elements
        this._castDialog = null;

        /// Others
        this._generalForms = [
            'MainEditObjectGeneral',
            'MainEditObjectTransform',
            'MainEditObjectOptions',
            'MainEditObjectRendering'
        ];
        this._objectCastingShadows = null;

        /// Finish
        this._core.eventReceivers.push(this);
    }

    EditionToolGeneral.prototype.onEvent = function (ev) {
        if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.CONFIRM_DIALOG) {
                /// Exclude object from shadows calculations
                if (ev.event.caller = this._castDialog) {
                    if (ev.event.result == "Yes") {
                        BABYLON.Editor.Utils.excludeObjectFromShadowsCalculations(this.object, this._core.currentScene);
                        this._objectCastingShadows = false;
                    } else {
                        /// Restore checking
                        this._renderingForm.setFieldChecked('MainEditMeshRenderingCastShadows', true);
                    }
                }
            }
        }
    }

    EditionToolGeneral.prototype.applyChanges = function () {
        /// Get elements of forms
        var general = this._generalForm.getElements();
        var transform = this._transformForm.getElements();
        var options = this._optionsForm.getElements();

        /// General 
        this.object.name = general['MainEditObjectName'].value;
        this.object.setEnabled(general['MainEditObjectEnabled'].checked);

        /// Transforms
        this.object.position = new BABYLON.Vector3(
            BABYLON.Editor.Utils.toFloat(transform['MainEditObjectTransformPositionX'].value),
            BABYLON.Editor.Utils.toFloat(transform['MainEditObjectTransformPositionY'].value),
            BABYLON.Editor.Utils.toFloat(transform['MainEditObjectTransformPositionZ'].value)
        );

        if (this.object instanceof BABYLON.Mesh) {
            this.object.rotation = new BABYLON.Vector3(
                BABYLON.Editor.Utils.toFloat(transform['MainEditMeshTransformRotationX'].value),
                BABYLON.Editor.Utils.toFloat(transform['MainEditMeshTransformRotationY'].value),
                BABYLON.Editor.Utils.toFloat(transform['MainEditMeshTransformRotationZ'].value)
            );

            this.object.scaling = new BABYLON.Vector3(
                BABYLON.Editor.Utils.toFloat(transform['MainEditMeshTransformScaleX'].value),
                BABYLON.Editor.Utils.toFloat(transform['MainEditMeshTransformScaleY'].value),
                BABYLON.Editor.Utils.toFloat(transform['MainEditMeshTransformScaleZ'].value)
            );
        }

        /// Options
        if (this.object instanceof BABYLON.Mesh) {
            this.object.isVisible = options['MainEditMeshOptionsVisible'].checked;
            this.object.infiniteDistance = options['MainEditMeshOptionsInfiniteDistance'].checked;
            this.object.checkCollisions = options['MainEditMeshOptionsCheckCollisions'].checked;
        }

        /// Rendering
        if (this.object instanceof BABYLON.Mesh) {
            var rendering = this._renderingForm.getElements();
            this.object.receiveShadows = rendering['MainEditMeshRenderingReceiveShadows'].checked;

            var castShadows = rendering['MainEditMeshRenderingCastShadows'].checked;
            if (!castShadows && this._objectCastingShadows) {
                this._castDialog = new BABYLON.Editor.GUIDialog('BabylonEditorCastDialog', this._core, 'Informations',
                    'Are you sure ?\n' + 'The object will be removed from all shadows calculations.',
                    new BABYLON.Vector2(350, 200)
                );
                this._castDialog.buildElement();
            } else if (castShadows && !this._objectCastingShadows) {
                BABYLON.Editor.Utils.addObjectInShadowsCalculations(this.object, this._core.currentScene);
                this._objectCastingShadows = true;
            }
        }
    }

    EditionToolGeneral.prototype.objectChanged = function () {
        BABYLON.Editor.GUIForm.UpdateFieldsFromVector3(this._transformForm, ['MainEditObjectTransformPositionX', 'MainEditObjectTransformPositionY', 'MainEditObjectTransformPositionZ'], this.object.position);
        if (this.object instanceof BABYLON.Mesh) {
            BABYLON.Editor.GUIForm.UpdateFieldsFromVector3(this._transformForm, ['MainEditMeshTransformRotationX', 'MainEditMeshTransformRotationY', 'MainEditMeshTransformRotationZ'], this.object.rotation);
            BABYLON.Editor.GUIForm.UpdateFieldsFromVector3(this._transformForm, ['MainEditMeshTransformScaleX', 'MainEditMeshTransformScaleY', 'MainEditMeshTransformScaleZ'], this.object.scaling);
        }
        this._transformForm.refresh();
    }

    EditionToolGeneral.prototype.createUI = function () {
        /// Create divs for forms
        /// We use forms because the editor can work as a collaborative edition, why not.
        BabylonEditorUICreator.Form.createDivsForForms(this._generalForms, 'BabylonEditorEditObject', true);

        /// -----------------------------------------------------------------------------------------------------
        /// General
        this._generalForm = new BABYLON.Editor.GUIForm('MainEditObjectGeneral', this._core, 'General');
        this._generalForm.createField('MainEditObjectName', 'text', 'Name :', 5);
        this._generalForm.createField('MainEditObjectEnabled', 'checkbox', 'Enabled :', 5);

        this._generalForm.buildElement('MainEditObjectGeneral');

        this._generalForm.fillFields([this.object.name, this.object.isEnabled()]);
        /// -----------------------------------------------------------------------------------------------------

        /// -----------------------------------------------------------------------------------------------------
        /// Transforms
        this._transformForm = new BABYLON.Editor.GUIForm('MainEditObjectTransform', this._core, 'Transforms');

        this._transformForm.createField('MainEditObjectTransformPositionX', 'float', 'Position :', 3, '<img src="UI/images/position.png"></img>');
        this._transformForm.createField('MainEditObjectTransformPositionY', 'float', ' ', 3);
        this._transformForm.createField('MainEditObjectTransformPositionZ', 'float', ' ', 3);
        if (this.object instanceof BABYLON.Mesh) {
            this._transformForm.createField('MainEditMeshTransformRotationX', 'float', 'Rotation :', 3, '<img src="UI/images/rotation.png"></img>');
            this._transformForm.createField('MainEditMeshTransformRotationY', 'float', ' ', 3);
            this._transformForm.createField('MainEditMeshTransformRotationZ', 'float', ' ', 3);

            this._transformForm.createField('MainEditMeshTransformScaleX', 'float', 'Scaling :', 3, '<img src="UI/images/scale.png"></img>');
            this._transformForm.createField('MainEditMeshTransformScaleY', 'float', ' ', 3);
            this._transformForm.createField('MainEditMeshTransformScaleZ', 'float', ' ', 3);
        }

        this._transformForm.buildElement('MainEditObjectTransform');

        BABYLON.Editor.GUIForm.UpdateFieldsFromVector3(this._transformForm, ['MainEditObjectTransformPositionX', 'MainEditObjectTransformPositionY', 'MainEditObjectTransformPositionZ'], this.object.position);
        if (this.object instanceof BABYLON.Mesh) {
            BABYLON.Editor.GUIForm.UpdateFieldsFromVector3(this._transformForm, ['MainEditMeshTransformRotationX', 'MainEditMeshTransformRotationY', 'MainEditMeshTransformRotationZ'], this.object.rotation);
            BABYLON.Editor.GUIForm.UpdateFieldsFromVector3(this._transformForm, ['MainEditMeshTransformScaleX', 'MainEditMeshTransformScaleY', 'MainEditMeshTransformScaleZ'], this.object.scaling);
        }

        /// -----------------------------------------------------------------------------------------------------

        /// -----------------------------------------------------------------------------------------------------
        /// Options
        this._optionsForm = new BABYLON.Editor.GUIForm('MainEditObjectOptions', this._core, 'Options');

        if (this.object instanceof BABYLON.Mesh) {
            this._optionsForm.createField('MainEditMeshOptionsVisible', 'checkbox', 'Visible :', 6);
            this._optionsForm.createField('MainEditMeshOptionsInfiniteDistance', 'checkbox', 'Infinite Distance :', 6);
            this._optionsForm.createField('MainEditMeshOptionsCheckCollisions', 'checkbox', 'Check Collisions :', 6);
        }

        this._optionsForm.buildElement('MainEditObjectOptions');

        this._optionsForm.fillFields([this.object.isVisible, this.object.infiniteDistance, this.object.checkCollisions]);
        /// -----------------------------------------------------------------------------------------------------

        /// -----------------------------------------------------------------------------------------------------
        /// Rendering
        this._renderingForm = new BABYLON.Editor.GUIForm('MainEditObjectRendering', this._core, 'Rendering');
        if (this.object instanceof BABYLON.Mesh) {
            this._renderingForm.createField('MainEditMeshRenderingCastShadows', 'checkbox', 'Cast Shadows :', 6);
            this._renderingForm.createField('MainEditMeshRenderingReceiveShadows', 'checkbox', 'Receive Shadows :', 6);

            this._renderingForm.buildElement('MainEditObjectRendering');

            this._renderingForm.fillFields([BABYLON.Editor.Utils.isObjectCastingShadows(this.object, this._core.currentScene), this.object.receiveShadows]);
        }
        /// -----------------------------------------------------------------------------------------------------

        this._objectCastingShadows = BABYLON.Editor.Utils.isObjectCastingShadows(this.object, this._core.currentScene);
    }

    EditionToolGeneral.prototype.clearUI = function () {
        if (this._generalForm)
            this._generalForm.destroy();
        if (this._transformForm)
            this._transformForm.destroy();
        if (this._optionsForm)
            this._optionsForm.destroy();
        if (this._renderingForm)
            this._renderingForm.destroy();
    }

    return EditionToolGeneral;

})();

BABYLON.Editor.EditionToolGeneral = EditionToolGeneral;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON