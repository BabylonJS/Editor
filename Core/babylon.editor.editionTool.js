/// <reference path="../index.html" />

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

var EditionTool = (function () {
    function EditionTool(babylonEditorCore) {
        /// This
        this._core = babylonEditorCore;
        this._core.eventReceivers.push(this);
        this._core.customUpdates.push(this);

        this._objectCastingShadows = null;

        /// Scene
        this.object = null;

        /// GUI Elements
        this._forms = [
            'MainEditObjectGeneral',
            'MainEditObjectTransform',
            'MainEditObjectOptions',
            'MainEditObjectRendering'
        ];

        this._emptyForm = null;
        this._generalForm = null;
        this._transformForm = null;
        this._optionsForm = null;
        this._renderingForm = null;

        this._castDialog = null;

        /// Finish
        this.createEmptyForm();
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
                    this.createEmptyForm();
                }

            }

        }

        else /// UI Event

        if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.FORM_CHANGED) {

                if (this._forms.indexOf(ev.event.caller.name) > -1) {
                    this._onChange();
                }

            }

            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.CONFIRM_DIALOG) {
                /// Exclude object from shadows calculations
                if (ev.event.caller = this._castDialog) {
                    if (ev.event.result == "Yes") {
                        BABYLON.Editor.Utils.excludeObjectFromShadowsCalculations(this.object, this._core.currentScene);
                    } else {
                        /// Restore checking
                        BabylonEditorUICreator.Form.setItemChecked(this._renderingForm, 'MainEditMeshRenderingCastShadows', true);
                    }
                }
            }
        }

    }

    EditionTool.prototype.update = function () {
        if (this.object != null) {
            /// Update forms records here...
        }
    }

    /// Creates an empty form to tell 0 object is selected
    EditionTool.prototype.createEmptyForm = function () {
        BabylonEditorUICreator.Form.createDivsForForms(['MainEditorEditObjectEmpty'], 'MainEditorEditObject', true);
        this._emptyForm = BabylonEditorUICreator.Form.createForm('MainEditorEditObjectEmpty', 'Empty', [], this,
            'To edit an object, double click in the scene or select and object in the graph.'
        );
    }

    /// Clears the UI
    EditionTool.prototype._clearUI = function () {
        BabylonEditorUICreator.clearUI(this._forms);
        /// Can clear other forms or UI elements
        if (this._emptyForm)
            BabylonEditorUICreator.clearUI([this._emptyForm.name]);
    }

    EditionTool.prototype._onChange = function () {
        /// Get elements of forms
        var general = BabylonEditorUICreator.Form.getElements(this._generalForm);
        var transform = BabylonEditorUICreator.Form.getElements(this._transformForm);
        var options = BabylonEditorUICreator.Form.getElements(this._optionsForm);

        var scope = general.scope;

        /// General 
        scope.object.name = general.fields['MainEditObjectName'].value;
        scope.object.setEnabled(general.fields['MainEditObjectEnabled'].checked);

        /// Transforms
        scope.object.position = new BABYLON.Vector3(
            BABYLON.Editor.Utils.toFloat(transform.fields['MainEditObjectTransformPositionX'].value),
            BABYLON.Editor.Utils.toFloat(transform.fields['MainEditObjectTransformPositionY'].value),
            BABYLON.Editor.Utils.toFloat(transform.fields['MainEditObjectTransformPositionZ'].value)
        );

        if (scope.object instanceof BABYLON.Mesh) {
            scope.object.rotation = new BABYLON.Vector3(
                BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformRotationX'].value),
                BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformRotationY'].value),
                BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformRotationZ'].value)
            );

            scope.object.scaling = new BABYLON.Vector3(
                BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformScaleX'].value),
                BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformScaleY'].value),
                BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformScaleZ'].value)
            );
        }

        /// Options
        if (scope.object instanceof BABYLON.Mesh) {
            scope.object.isVisible = options.fields['MainEditMeshOptionsVisible'].checked;
            scope.object.infiniteDistance = options.fields['MainEditMeshOptionsInfiniteDistance'].checked;
            scope.object.checkCollisions = options.fields['MainEditMeshOptionsCheckCollisions'].checked;
        }

        /// Rendering
        if (scope.object instanceof BABYLON.Mesh) {
            var rendering = BabylonEditorUICreator.Form.getElements(this._renderingForm);
            scope.object.receiveShadows = rendering.fields['MainEditMeshRenderingReceiveShadows'].checked;

            var castShadows = rendering.fields['MainEditMeshRenderingCastShadows'].checked;
            if (!castShadows && this._objectCastingShadows) {
                this._castDialog = BabylonEditorUICreator.Popup.createPopup(
                    'Informations',
                    'Are you sure ?\n'
                    + 'The object will be removed from all shadows calculations.',
                    BabylonEditorUICreator.Popup.YES_NO, true, 350, 200, this
                );
            } else if (castShadows && !this._objectCastingShadows) {
                BABYLON.Editor.Utils.addObjectInShadowsCalculations(this.object, this._core.currentScene);
            }
            this._objectCastingShadows = castShadows;
        }

        /// FIXME: Reset focus
        $(this).focus();

        /// Send event because object changed
        var event = new BABYLON.Editor.Event();
        event.eventType = BABYLON.Editor.EventType.SceneEvent;
        event.event = new BABYLON.Editor.Event.SceneEvent();
        event.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED;
        event.event.object = scope.object;
        scope._core.sendEvent(event);
    }

    EditionTool.prototype._createUI = function () {

        /// Create divs for forms
        /// We use forms because the editor can work as a collaborative edition, why not.
        BabylonEditorUICreator.Form.createDivsForForms(this._forms, 'MainEditorEditObject', true);

        /// -----------------------------------------------------------------------------------------------------
        /// General
        var fields = new Array();

        BabylonEditorUICreator.Form.extendFields(fields, [
            BabylonEditorUICreator.Form.createField('MainEditObjectName', 'text', 'Name :', 5),
            BabylonEditorUICreator.Form.createField('MainEditObjectEnabled', 'checkbox', 'Enabled :', 5),
        ]);

        this._generalForm = BabylonEditorUICreator.Form.createForm('MainEditObjectGeneral', 'General', fields, this);

        /// Fill fields
        BabylonEditorUICreator.Form.extendRecord(this._generalForm, {
            MainEditObjectName: this.object.name,
            MainEditObjectEnabled: this.object.isEnabled()
        });

        /// -----------------------------------------------------------------------------------------------------

        /// -----------------------------------------------------------------------------------------------------
        /// Transforms

        fields = new Array();
        BabylonEditorUICreator.Form.extendFields(fields, [
            /// Position
            BabylonEditorUICreator.Form.createField('MainEditObjectTransformPositionX', 'float', 'Position :', 3, '<img src="UI/images/position.png"></img>'),
            BabylonEditorUICreator.Form.createField('MainEditObjectTransformPositionY', 'float', ' ', 3),
            BabylonEditorUICreator.Form.createField('MainEditObjectTransformPositionZ', 'float', ' ', 3),
        ]);

        /// If mesh
        if (this.object instanceof BABYLON.Mesh) {
            BabylonEditorUICreator.Form.extendFields(fields, [
                /// Rotation
                BabylonEditorUICreator.Form.createField('MainEditMeshTransformRotationX', 'float', 'Rotation :', 3, '<img src="UI/images/rotation.png"></img>'),
                BabylonEditorUICreator.Form.createField('MainEditMeshTransformRotationY', 'float', ' ', 3),
                BabylonEditorUICreator.Form.createField('MainEditMeshTransformRotationZ', 'float', ' ', 3),
                /// Scale
                BabylonEditorUICreator.Form.createField('MainEditMeshTransformScaleX', 'float', 'Scaling :', 3, '<img src="UI/images/scale.png"></img>'),
                BabylonEditorUICreator.Form.createField('MainEditMeshTransformScaleY', 'float', ' ', 3),
                BabylonEditorUICreator.Form.createField('MainEditMeshTransformScaleZ', 'float', ' ', 3)
            ]);
        }

        this._transformForm = BabylonEditorUICreator.Form.createForm('MainEditObjectTransform',
                                                                     'Transforms', fields, this);

        /// Fill fields
        BabylonEditorUICreator.Form.extendRecord(this._transformForm, {
            MainEditObjectTransformPositionX: this.object.position.x,
            MainEditObjectTransformPositionY: this.object.position.y,
            MainEditObjectTransformPositionZ: this.object.position.z,
        });

        if (this.object instanceof BABYLON.Mesh) {
            BabylonEditorUICreator.Form.extendRecord(this._transformForm, {
                MainEditMeshTransformRotationX: this.object.rotation.x,
                MainEditMeshTransformRotationY: this.object.rotation.y,
                MainEditMeshTransformRotationZ: this.object.rotation.z,

                MainEditMeshTransformScaleX: this.object.scaling.x,
                MainEditMeshTransformScaleY: this.object.scaling.y,
                MainEditMeshTransformScaleZ: this.object.scaling.z
            });
        }

        /// -----------------------------------------------------------------------------------------------------

        /// -----------------------------------------------------------------------------------------------------
        /// Options
        fields = new Array();
        if (this.object instanceof BABYLON.Mesh) {
            BabylonEditorUICreator.Form.extendFields(fields, [
                BabylonEditorUICreator.Form.createField('MainEditMeshOptionsVisible', 'checkbox', 'Visible :', 6),
                BabylonEditorUICreator.Form.createField('MainEditMeshOptionsInfiniteDistance', 'checkbox', 'Infinite Distance :', 6),
                BabylonEditorUICreator.Form.createField('MainEditMeshOptionsCheckCollisions', 'checkbox', 'Check Collisions :', 6)
            ]);
        }

        this._optionsForm = BabylonEditorUICreator.Form.createForm('MainEditObjectOptions',
                                                                    'Options', fields, this);

        /// Configure fields
        if (this.object instanceof BABYLON.Mesh) {
            BabylonEditorUICreator.Form.extendRecord(this._optionsForm, {
                MainEditMeshOptionsVisible: this.object.isVisible,
                MainEditMeshOptionsInfiniteDistance: this.object.infiniteDistance,
                MainEditMeshOptionsCheckCollisions: this.object.checkCollisions
            });
        }
        /// -----------------------------------------------------------------------------------------------------

        /// -----------------------------------------------------------------------------------------------------
        /// Rendering
        fields = new Array();
        if (this.object instanceof BABYLON.Mesh) {
            BabylonEditorUICreator.Form.extendFields(fields, [
                BabylonEditorUICreator.Form.createField('MainEditMeshRenderingCastShadows', 'checkbox', 'Cast Shadows :', 6),
                BabylonEditorUICreator.Form.createField('MainEditMeshRenderingReceiveShadows', 'checkbox', 'Receive Shadows :', 6),
            ]);

            this._renderingForm = BabylonEditorUICreator.Form.createForm('MainEditObjectRendering',
                                                                         'Rendering', fields, this);

            /// Configure fields
            BabylonEditorUICreator.Form.extendRecord(this._renderingForm, {
                MainEditMeshRenderingCastShadows: BABYLON.Editor.Utils.isObjectCastingShadows(this.object, this._core.currentScene),
                MainEditMeshRenderingReceiveShadows: this.object.receiveShadows,
            });
        }
        /// -----------------------------------------------------------------------------------------------------

        this._objectCastingShadows = BABYLON.Editor.Utils.isObjectCastingShadows(this.object, this._core.currentScene);

    }

    return EditionTool;

})();

BABYLON.Editor.EditionTool = EditionTool;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON