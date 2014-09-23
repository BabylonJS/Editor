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

        this._objectCastingShadows = null;

        /// Scene
        this.object = null;

        /// GUI Elements
        this._generalForms = [
            'MainEditObjectGeneral',
            'MainEditObjectTransform',
            'MainEditObjectOptions',
            'MainEditObjectRendering'
        ];
        this._materialForms = [
            'MainEditObjectColors',
            'MainEditObjectMaterialParameters',
            'MainEditObjectMaterialTextures'
        ];

        this._tabs = [
            'GeneralTab',
            'MaterialTab'
        ];

        this._panel = layouts.getPanelFromType('left');
        this._activeTab = this._panel.getTabIDFromIndex(0);

        /// Genral
        this._emptyForm = null;
        this._generalForm = null;
        this._transformForm = null;
        this._optionsForm = null;
        this._renderingForm = null;

        /// Material
        this._removeMaterialButton = null;
        this._addMaterialButton = null;
        this._addMaterialWindow = null;
        this._addMaterialList = null;

        this._colorsForm = null;
        this._materialParametersForm = null;
        this._texturesForm = null;

        this._castDialog = null;

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

            }

            /// Object changed
            else if (ev.event.eventType == BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED) {
                if (ev.event.object == this.object) {
                    this._objectChanged();
                }
            }

        }

        else /// UI Event

        if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.FORM_CHANGED) {

                if (this._generalForms.indexOf(ev.event.caller.name) > -1
                    || this._materialForms.indexOf(ev.event.caller.name) > -1)
                {
                    this._onChange();
                }

            }

            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.CONFIRM_DIALOG) {
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

            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.TAB_CHANGED) {
                if (ev.event.caller == this._panel && this._tabs.indexOf(ev.event.result) != -1 && this.object) {
                    this._clearUI();
                    this._activeTab = ev.event.result;
                    this._createUI();
                }
            }

            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.BUTTON_CLICKED) {
                if (ev.event.caller == this._addMaterialButton) {
                    this._createWindowAddMaterial();
                } else if (ev.event.caller == this._removeMaterialButton) {
                    this.object.material.dispose();
                    this.object.material = null;
                    this._clearUI();
                    this._createUI();
                }
            }

            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED) {
                if (ev.event.caller == this._addMaterialWindow) {
                    if (ev.event.result == 'PopupButtonClose') {
                        /// Close
                        this._addMaterialWindow.close();
                    } else {
                        /// Accept
                        var index = this._addMaterialList.getSelected();

                        if (index == 0) this.object.material = new BABYLON.StandardMaterial('New Material', this._core.currentScene);
                        else if (index == 1) this.object.material = new BABYLON.ShaderMaterial('New Material', this._core.currentScene);

                        this._addMaterialWindow.close();
                        this._clearUI();
                        this._createUI();
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
    EditionTool.prototype.createEmptyForm = function (name, text) {
        this._clearUI();
        BabylonEditorUICreator.Form.createDivsForForms(['MainEditorEditObjectEmpty'], 'BabylonEditorEditObject', true);
        this._emptyForm = new BABYLON.Editor.GUIForm('MainEditObjectColors', this._core, 'Colors');
        this._emptyForm.textBlock = text;
        this._emptyForm.buildElement('MainEditorEditObjectEmpty');
    }

    /// Clears the UI
    EditionTool.prototype._clearUI = function () {
        this._panel.setTabEnabled('MaterialTab', false);

        BabylonEditorUICreator.clearUI(this._generalForms);
        BabylonEditorUICreator.clearUI(this._materialForms);

        this._generalForm = null;
        this._transformForm = null;
        this._optionsForm = null;
        this._renderingForm = null;

        this._colorsForm = null;

        /// Can clear other forms or UI elements
        if (this._emptyForm)
            BabylonEditorUICreator.clearUI([this._emptyForm.name]);
    }

    EditionTool.prototype._objectChanged = function () {
        if (this._activeTab == 'GeneralTab') {
            BABYLON.Editor.GUIForm.UpdateFieldsFromVector3(this._transformForm, ['MainEditObjectTransformPositionX', 'MainEditObjectTransformPositionY', 'MainEditObjectTransformPositionZ'], this.object.position);
            if (this.object instanceof BABYLON.Mesh) {
                BABYLON.Editor.GUIForm.UpdateFieldsFromVector3(this._transformForm, ['MainEditMeshTransformRotationX', 'MainEditMeshTransformRotationY', 'MainEditMeshTransformRotationZ'], this.object.rotation);
                BABYLON.Editor.GUIForm.UpdateFieldsFromVector3(this._transformForm, ['MainEditMeshTransformScaleX', 'MainEditMeshTransformScaleY', 'MainEditMeshTransformScaleZ'], this.object.scaling);
            }
            this._transformForm.refresh();
        }
    }

    EditionTool.prototype._onChange = function () {

        if (this._activeTab == 'GeneralTab') {

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

        } else if (this._activeTab == 'MaterialTab') {

            /// Get elements of forms
            var colors = this._colorsForm.getElements();
            var parameters = this._materialParametersForm.getElements();
            var textures = this._texturesForm.getElements();

            this.object.material.ambiantColor = BABYLON.Editor.Utils.HexToRGBColor('#' + colors['MainEditObjectAmbiantColor'].value);
            this.object.material.diffuseColor = BABYLON.Editor.Utils.HexToRGBColor('#' + colors['MainEditObjectDiffuseColor'].value);
            this.object.material.specularColor = BABYLON.Editor.Utils.HexToRGBColor('#' + colors['MainEditObjectSpecularColor'].value);
            this.object.material.emissiveColor = BABYLON.Editor.Utils.HexToRGBColor('#' + colors['MainEditObjectEmissiveColor'].value);

            this.object.material.specularPower = BABYLON.Editor.Utils.toFloat(parameters['MainEditObjectSpecularPower'].value);
            this.object.material.useAlphaFromDiffuseTexture = parameters['MainEditObjectUseAlphaFromDiffuseTexture'].checked;

            this.object.material.diffuseTexture = BABYLON.Editor.Utils.GetTextureFromName(textures['MainEditObjectMaterialTexturesDiffuse'].value, this._core.currentScene);
            this.object.material.bumpTexture = BABYLON.Editor.Utils.GetTextureFromName(textures['MainEditObjectMaterialTexturesNormal'].value, this._core.currentScene);
        }

        /// Send event because object changed
        var event = new BABYLON.Editor.Event();
        event.eventType = BABYLON.Editor.EventType.SceneEvent;
        event.event = new BABYLON.Editor.Event.SceneEvent();
        event.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED;
        event.event.object = this.object;
        this._core.sendEvent(event);
    }

    EditionTool.prototype._createMaterialUI = function () {
        var scope = this;

        if (!this.object.material) {
            this.createEmptyForm('No material', 'To edit material, please add one before.');
            this._panel.setTabEnabled('GeneralTab', true);
            this._panel.setTabEnabled('MaterialTab', true);

            BabylonEditorUICreator.Form.createDivsForForms(['MainEditorEditObjectAddMaterial'], 'BabylonEditorEditObject', false);
            this._addMaterialButton = BabylonEditorUICreator.createCustomField('MainEditorEditObjectAddMaterial', 'EditionAddMaterial',
                '<button type="button" id="EditionAddMaterial" style="width: 100%;">Add one...</button>',
                this.core, function (event) {
                    BABYLON.Editor.Utils.sendEventButtonClicked(scope._addMaterialButton, scope._core);
                }, false
            );

        } else {
            /// cf. EditionTool._createGeneralUI()
            BabylonEditorUICreator.Form.createDivsForForms(this._materialForms, 'BabylonEditorEditObject', true);

            /// -----------------------------------------------------------------------------------------------------
            /// Colors
            this._colorsForm = new BABYLON.Editor.GUIForm('MainEditObjectColors', this._core, 'Colors');
            this._colorsForm.createField('MainEditObjectAmbiantColor', 'color', 'Ambiant Color :', 5);
            this._colorsForm.createField('MainEditObjectDiffuseColor', 'color', 'Diffuse Color :', 5);
            this._colorsForm.createField('MainEditObjectSpecularColor', 'color', 'Specular Color :', 5);
            this._colorsForm.createField('MainEditObjectEmissiveColor', 'color', 'Emissive Color :', 5);

            this._colorsForm.buildElement('MainEditObjectColors');

            this._colorsForm.fillFields([
                BABYLON.Editor.Utils.RGBToHexColor(this.object.material.ambiantColor),
                BABYLON.Editor.Utils.RGBToHexColor(this.object.material.diffuseColor),
                BABYLON.Editor.Utils.RGBToHexColor(this.object.material.specularColor),
                BABYLON.Editor.Utils.RGBToHexColor(this.object.material.emissiveColor)
            ]);
            /// -----------------------------------------------------------------------------------------------------

            /// -----------------------------------------------------------------------------------------------------
            /// Parameters
            this._materialParametersForm = new BABYLON.Editor.GUIForm('MainEditObjectMaterialParameters', this._core, 'Parameters');
            this._materialParametersForm.createField('MainEditObjectSpecularPower', 'text', 'Specular Power :', 5);
            this._materialParametersForm.createField('MainEditObjectUseAlphaFromDiffuseTexture', 'checkbox', 'Use Alpha :', 5);

            this._materialParametersForm.buildElement('MainEditObjectMaterialParameters');

            this._materialParametersForm.fillFields([this.object.material.specularPower, this.object.material.useAlphaFromDiffuseTexture]);
            /// -----------------------------------------------------------------------------------------------------

            BabylonEditorUICreator.Form.createDivsForForms(['MainEditorEditObjectRemoveMaterial'], 'BabylonEditorEditObject', false);
            this._removeMaterialButton = BabylonEditorUICreator.createCustomField('MainEditorEditObjectRemoveMaterial', 'EditionRemoveMaterial',
                '<button type="button" id="EditionRemoveMaterial" style="width: 100%;">Remove Material</button>',
                this.core, function (event) {
                    BABYLON.Editor.Utils.sendEventButtonClicked(scope._removeMaterialButton, scope._core);
                }, false
            );

            /// -----------------------------------------------------------------------------------------------------
            /// Textures
            var textures = new Array();
            textures.push('None');
            for (var i = 0; i < this._core.currentScene.textures.length; i++) {
                var tex = this._core.currentScene.textures[i];
                textures.push(tex.name);
            }

            this._texturesForm = new BABYLON.Editor.GUIForm('MainEditObjectMaterialTextures', this._core, 'Textures');

            this._texturesForm.createFieldWithItems('MainEditObjectMaterialTexturesDiffuse', 'list', 'Diffuse Texture :', textures, 5);
            this._texturesForm.createFieldWithItems('MainEditObjectMaterialTexturesNormal', 'list', 'Normal Texture :', textures, 5);

            this._texturesForm.buildElement('MainEditObjectMaterialTextures');

            this._texturesForm.fillFields([
                BABYLON.Editor.Utils.GetTextureName(this.object.material.diffuseTexture),
                BABYLON.Editor.Utils.GetTextureName(this.object.material.bumpTexture)
            ]);
            /// -----------------------------------------------------------------------------------------------------

        }
    }

    EditionTool.prototype._createGeneralUI = function () {
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
    }

    EditionTool.prototype._createUI = function () {
        if (!this.object) return;

        if (this.object instanceof BABYLON.Mesh)
            this._panel.setTabEnabled('MaterialTab', true);
        else
            this._panel.setTabEnabled('MaterialTab', false);

        if (this._activeTab == 'GeneralTab')
            this._createGeneralUI();
        else if (this._activeTab == 'MaterialTab') {
            if (this.object instanceof BABYLON.Mesh)
                this._createMaterialUI();
            else {
                this.createEmptyForm('No material', 'This object cannot handle materials');
            }
        }

        this._objectCastingShadows = BABYLON.Editor.Utils.isObjectCastingShadows(this.object, this._core.currentScene);

    }

    EditionTool.prototype._createWindowAddMaterial = function () {

        var body = '<div id="AddMaterial" style="height: 100%">'
            + '<span class="legend">Type : </span><input type="list" id="AddMaterialList" style="width: 83%; margin-top: 20px;"></input>'
            + '</div>';

        this._addMaterialWindow = new BABYLON.Editor.GUIWindow('BabylonEditorCreateNewMaterial', this._core, 'Create a new material', body, new BABYLON.Vector2(400, 150), ['Add', 'Close']);
        this._addMaterialWindow.buildElement();

        this._addMaterialList = new BABYLON.Editor.GUIList('AddMaterialList', this._core);
        this._addMaterialList.addItem('Standard Material').addItem('Shader Material').addItem('Multi Material');
        this._addMaterialList.buildElement('AddMaterialList');

    }

    return EditionTool;

})();

BABYLON.Editor.EditionTool = EditionTool;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON