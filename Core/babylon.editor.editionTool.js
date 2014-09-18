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
            'MainEditorEditObjectGeneral',
            'MainEditorEditObjectMaterial'
        ];
        this._activeTab = this._tabs[0];
        
        this._layouts = layouts;
        this._panel = BabylonEditorUICreator.Layout.getPanelFromname(layouts, 'left');

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
                        BabylonEditorUICreator.Form.setItemChecked(this._renderingForm, 'MainEditMeshRenderingCastShadows', true);
                    }
                }
            }

            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.TAB_CHANGED) {
                if (ev.event.caller == 'Mainlayout' && this._tabs.indexOf(ev.event.result) != -1) {
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
                        BabylonEditorUICreator.Popup.closeWindow(this._addMaterialWindow);
                    } else {
                        /// Accept
                        var index = BabylonEditorUICreator.List.getSelectedItem(this._addMaterialList);

                        if (index == 0) this.object.material = new BABYLON.StandardMaterial('New Material', this._core.currentScene);
                        else if (index == 1) this.object.material = new BABYLON.ShaderMaterial('New Material', this._core.currentScene);

                        BabylonEditorUICreator.Popup.closeWindow(this._addMaterialWindow);
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
        BabylonEditorUICreator.Form.createDivsForForms(['MainEditorEditObjectEmpty'], 'MainEditorEditObject', true);
        this._emptyForm = BabylonEditorUICreator.Form.createForm('MainEditorEditObjectEmpty', name, [], this, this._core, text);
    }

    /// Clears the UI
    EditionTool.prototype._clearUI = function () {
        BabylonEditorUICreator.Layout.setTabEnabled(this._panel, 'MainEditorEditObjectMaterial', false);

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
        if (this._activeTab == 'MainEditorEditObjectGeneral') {
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
        }

        BabylonEditorUICreator.updateElement(this._transformForm);
    }

    EditionTool.prototype._onChange = function () {

        if (this._activeTab == 'MainEditorEditObjectGeneral') {

            /// Get elements of forms
            var general = BabylonEditorUICreator.Form.getElements(this._generalForm);
            var transform = BabylonEditorUICreator.Form.getElements(this._transformForm);
            var options = BabylonEditorUICreator.Form.getElements(this._optionsForm);

            /// General 
            this.object.name = general.fields['MainEditObjectName'].value;
            this.object.setEnabled(general.fields['MainEditObjectEnabled'].checked);

            /// Transforms
            this.object.position = new BABYLON.Vector3(
                BABYLON.Editor.Utils.toFloat(transform.fields['MainEditObjectTransformPositionX'].value),
                BABYLON.Editor.Utils.toFloat(transform.fields['MainEditObjectTransformPositionY'].value),
                BABYLON.Editor.Utils.toFloat(transform.fields['MainEditObjectTransformPositionZ'].value)
            );

            if (this.object instanceof BABYLON.Mesh) {
                this.object.rotation = new BABYLON.Vector3(
                    BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformRotationX'].value),
                    BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformRotationY'].value),
                    BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformRotationZ'].value)
                );

                this.object.scaling = new BABYLON.Vector3(
                    BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformScaleX'].value),
                    BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformScaleY'].value),
                    BABYLON.Editor.Utils.toFloat(transform.fields['MainEditMeshTransformScaleZ'].value)
                );
            }

            /// Options
            if (this.object instanceof BABYLON.Mesh) {
                this.object.isVisible = options.fields['MainEditMeshOptionsVisible'].checked;
                this.object.infiniteDistance = options.fields['MainEditMeshOptionsInfiniteDistance'].checked;
                this.object.checkCollisions = options.fields['MainEditMeshOptionsCheckCollisions'].checked;
            }

            /// Rendering
            if (this.object instanceof BABYLON.Mesh) {
                var rendering = BabylonEditorUICreator.Form.getElements(this._renderingForm);
                this.object.receiveShadows = rendering.fields['MainEditMeshRenderingReceiveShadows'].checked;

                var castShadows = rendering.fields['MainEditMeshRenderingCastShadows'].checked;
                if (!castShadows && this._objectCastingShadows) {
                    this._castDialog = BabylonEditorUICreator.Popup.createPopup(
                        'Informations',
                        'Are you sure ?\n'
                        + 'The object will be removed from all shadows calculations.',
                        BabylonEditorUICreator.Popup.YES_NO, true, 350, 200, this._core
                    );
                } else if (castShadows && !this._objectCastingShadows) {
                    BABYLON.Editor.Utils.addObjectInShadowsCalculations(this.object, this._core.currentScene);
                    this._objectCastingShadows = true;
                }
            }

        } else if (this._activeTab == 'MainEditorEditObjectMaterial') {

            /// Get elements of forms
            var colors = BabylonEditorUICreator.Form.getElements(this._colorsForm);
            var parameters = BabylonEditorUICreator.Form.getElements(this._materialParametersForm);
            var textures = BabylonEditorUICreator.Form.getElements(this._texturesForm);

            this.object.material.ambiantColor = BABYLON.Editor.Utils.HexToRGBColor('#' + colors.fields['MainEditObjectAmbiantColor'].value);
            this.object.material.diffuseColor = BABYLON.Editor.Utils.HexToRGBColor('#' + colors.fields['MainEditObjectDiffuseColor'].value);
            this.object.material.specularColor = BABYLON.Editor.Utils.HexToRGBColor('#' + colors.fields['MainEditObjectSpecularColor'].value);
            this.object.material.emissiveColor = BABYLON.Editor.Utils.HexToRGBColor('#' + colors.fields['MainEditObjectEmissiveColor'].value);

            this.object.material.specularPower = BABYLON.Editor.Utils.toFloat(parameters.fields['MainEditObjectSpecularPower'].value);
            this.object.material.useAlphaFromDiffuseTexture = parameters.fields['MainEditObjectUseAlphaFromDiffuseTexture'].checked;

            this.object.material.diffuseTexture = BABYLON.Editor.Utils.GetTextureFromName(textures.fields['MainEditObjectMaterialTexturesDiffuse'].value, this._core.currentScene);
            this.object.material.bumpTexture = BABYLON.Editor.Utils.GetTextureFromName(textures.fields['MainEditObjectMaterialTexturesNormal'].value, this._core.currentScene);
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
            BabylonEditorUICreator.Layout.setTabEnabled(this._panel, 'MainEditorEditObjectGeneral', true);
            BabylonEditorUICreator.Layout.setTabEnabled(this._panel, 'MainEditorEditObjectMaterial', true);

            BabylonEditorUICreator.Form.createDivsForForms(['MainEditorEditObjectAddMaterial'], 'MainEditorEditObject', false);
            this._addMaterialButton = BabylonEditorUICreator.createCustomField('MainEditorEditObjectAddMaterial', 'EditionAddMaterial',
                '<button type="button" id="EditionAddMaterial" style="width: 100%;">Add one...</button>',
                this.core, function (event) {
                    BABYLON.Editor.Utils.sendEventButtonClicked(scope._addMaterialButton, scope._core);
                }, false
            );

        } else {
            /// Create divs for forms
            /// We use forms because the editor can work as a collaborative edition, why not.
            BabylonEditorUICreator.Form.createDivsForForms(this._materialForms, 'MainEditorEditObject', true);

            /// -----------------------------------------------------------------------------------------------------
            /// Colors
            var fields = new Array();
            BabylonEditorUICreator.Form.extendFields(fields, [
                BabylonEditorUICreator.Form.createField('MainEditObjectAmbiantColor', 'color', 'Ambiant Color :', 5),
                BabylonEditorUICreator.Form.createField('MainEditObjectDiffuseColor', 'color', 'Diffuse Color :', 5),
                BabylonEditorUICreator.Form.createField('MainEditObjectSpecularColor', 'color', 'Specular Color :', 5),
                BabylonEditorUICreator.Form.createField('MainEditObjectEmissiveColor', 'color', 'Emissive Color :', 5),
            ]);

            this._colorsForm = BabylonEditorUICreator.Form.createForm('MainEditObjectColors', 'Colors', fields, this, this._core);

            /// Fill fields
            BabylonEditorUICreator.Form.extendRecord(this._colorsForm, {
                MainEditObjectAmbiantColor: BABYLON.Editor.Utils.RGBToHexColor(this.object.material.ambiantColor),
                MainEditObjectDiffuseColor: BABYLON.Editor.Utils.RGBToHexColor(this.object.material.diffuseColor),
                MainEditObjectSpecularColor: BABYLON.Editor.Utils.RGBToHexColor(this.object.material.specularColor),
                MainEditObjectEmissiveColor: BABYLON.Editor.Utils.RGBToHexColor(this.object.material.emissiveColor),
            });
            /// -----------------------------------------------------------------------------------------------------

            /// -----------------------------------------------------------------------------------------------------
            /// Parameters
            fields = new Array();
            BabylonEditorUICreator.Form.extendFields(fields, [
                BabylonEditorUICreator.Form.createField('MainEditObjectSpecularPower', 'text', 'Specular Power :', 5),
                BabylonEditorUICreator.Form.createField('MainEditObjectUseAlphaFromDiffuseTexture', 'checkbox', 'Use alpha :', 5),
            ]);

            this._materialParametersForm = BabylonEditorUICreator.Form.createForm('MainEditObjectMaterialParameters', 'Parameters', fields, this, this._core);

            /// Fill fields
            BabylonEditorUICreator.Form.extendRecord(this._materialParametersForm, {
                MainEditObjectSpecularPower: this.object.material.specularPower,
                MainEditObjectUseAlphaFromDiffuseTexture: this.object.material.useAlphaFromDiffuseTexture,
            });

            BabylonEditorUICreator.Form.createDivsForForms(['MainEditorEditObjectRemoveMaterial'], 'MainEditorEditObject', false);
            this._removeMaterialButton = BabylonEditorUICreator.createCustomField('MainEditorEditObjectRemoveMaterial', 'EditionRemoveMaterial',
                '<button type="button" id="EditionRemoveMaterial" style="width: 100%;">Remove Material</button>',
                this.core, function (event) {
                    BABYLON.Editor.Utils.sendEventButtonClicked(scope._removeMaterialButton, scope._core);
                }, false
            );

            /// -----------------------------------------------------------------------------------------------------

            fields = new Array();
            var textures = new Array();
            textures.push('None');
            for (var i = 0; i < this._core.currentScene.textures.length; i++) {
                var tex = this._core.currentScene.textures[i];
                textures.push(tex.name);
            }

            BabylonEditorUICreator.Form.extendFields(fields, [
                BabylonEditorUICreator.Form.createFieldWithItems('MainEditObjectMaterialTexturesDiffuse', 'list', 'Diffuse Texture :', textures, 5),
                BabylonEditorUICreator.Form.createFieldWithItems('MainEditObjectMaterialTexturesNormal', 'list', 'Normal Texture :', textures, 5),
            ]);
            this._texturesForm = BabylonEditorUICreator.Form.createForm('MainEditObjectMaterialTextures', 'Textures', fields, this, this._core);

            BabylonEditorUICreator.Form.extendRecord(this._texturesForm, {
                MainEditObjectMaterialTexturesDiffuse: BABYLON.Editor.Utils.GetTextureName(this.object.material.diffuseTexture),
                MainEditObjectMaterialTexturesNormal: BABYLON.Editor.Utils.GetTextureName(this.object.material.bumpTexture),
            });
        }
    }

    EditionTool.prototype._createGeneralUI = function () {
        /// Create divs for forms
        /// We use forms because the editor can work as a collaborative edition, why not.
        BabylonEditorUICreator.Form.createDivsForForms(this._generalForms, 'MainEditorEditObject', true);

        /// -----------------------------------------------------------------------------------------------------
        /// General
        var fields = new Array();

        BabylonEditorUICreator.Form.extendFields(fields, [
            BabylonEditorUICreator.Form.createField('MainEditObjectName', 'text', 'Name :', 5),
            BabylonEditorUICreator.Form.createField('MainEditObjectEnabled', 'checkbox', 'Enabled :', 5),
        ]);

        this._generalForm = BabylonEditorUICreator.Form.createForm('MainEditObjectGeneral', 'General', fields, this, this._core);

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
                                                                     'Transforms', fields, this, this._core);

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
                                                                    'Options', fields, this, this._core);

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
                                                                         'Rendering', fields, this, this._core);

            /// Configure fields
            BabylonEditorUICreator.Form.extendRecord(this._renderingForm, {
                MainEditMeshRenderingCastShadows: BABYLON.Editor.Utils.isObjectCastingShadows(this.object, this._core.currentScene),
                MainEditMeshRenderingReceiveShadows: this.object.receiveShadows,
            });
        }
        /// -----------------------------------------------------------------------------------------------------
    }

    EditionTool.prototype._createUI = function () {

        if (this.object instanceof BABYLON.Mesh)
            BabylonEditorUICreator.Layout.setTabEnabled(this._panel, 'MainEditorEditObjectMaterial', true);
        else
            BabylonEditorUICreator.Layout.setTabEnabled(this._panel, 'MainEditorEditObjectMaterial', false);

        if (this._activeTab == 'MainEditorEditObjectGeneral')
            this._createGeneralUI();
        else if (this._activeTab == 'MainEditorEditObjectMaterial') {
            if (this.object instanceof BABYLON.Mesh)
                this._createMaterialUI();
            else {
                this.createEmptyForm('No material', 'This object cannot handle materials');
            }
        }

        this._objectCastingShadows = BABYLON.Editor.Utils.isObjectCastingShadows(this.object, this._core.currentScene);

    }

    EditionTool.prototype._createWindowAddMaterial = function () {
        /// Create popup with a canvas
        this._addMaterialWindow = BabylonEditorUICreator.Popup.createWindow(
            'Create a new material',
            '<div id="AddMaterial" style="height: 100%">'
            + '<span class="legend">Type : </span><input type="list" id="AddMaterialList" style="width: 83%; margin-top: 20px;"></input>'
            + '</div>', false, 400, 150,
            ['Add', 'Close'],
            this._core
        );

        /// Create list
        this._addMaterialList = BabylonEditorUICreator.List.createList('AddMaterialList', [
            'Standard Material',
            'Shader Material',
            'Multi Material'
        ], name);

    }

    return EditionTool;

})();

BABYLON.Editor.EditionTool = EditionTool;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON