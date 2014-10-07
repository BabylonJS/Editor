/// <reference path="../../index.html" />

/* 
Materials forms for objects configuration
*/

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

var EditionToolMaterial = (function () {

    function EditionToolMaterial(core, parent) {
        /// Core
        this._core = core;
        this.object = null;
        this.parent = parent;

        /// Forms
        this._removeMaterialButton = null;
        this._addMaterialButton = null;
        this._selectMaterialButton = null;

        this._addMaterialWindow = null;
        this._addMaterialList = null;

        this._selectMaterialWindow = null;
        this._selectMaterialList = null;

        this._colorsForm = null;
        this._materialParametersForm = null;
        this._texturesForm = null;

        /// Others
        this._materialForms = [
            'MainEditObjectColors',
            'MainEditObjectMaterialParameters',
            'MainEditObjectMaterialTextures'
        ];

        /// Finish
        this._core.eventReceivers.push(this);
    }

    EditionToolMaterial.prototype.onEvent = function (ev) {
        if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED) {
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
                        this.clearUI();
                        this.createUI();
                    }
                }
                else if (ev.event.caller == this._selectMaterialWindow) {
                    if (ev.event.result == 'PopupButtonClose') {
                        this._selectMaterialWindow.close();
                    } else {
                        /// Selected...
                        var index = this._selectMaterialList.getSelected();
                        this.object.material = this._core.currentScene.materials[index];

                        this._selectMaterialWindow.close();
                        this.clearUI();
                        this.createUI();
                    }
                }
            }

            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.BUTTON_CLICKED) {
                if (ev.event.caller == this._addMaterialButton) {
                    this._createWindowAddMaterial();
                } else if (ev.event.caller == this._removeMaterialButton) {
                    this.object.material = null;
                    this.clearUI();
                    this.createUI();
                } else if (ev.event.caller == this._selectMaterialButton) {
                    this._createWindowSelectMaterial();
                }
            }
        }
    }

    EditionToolMaterial.prototype.applyChanges = function () {
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

    EditionToolMaterial.prototype.objectChanged = function () {
        /// Nothing for the moment...
    }

    EditionToolMaterial.prototype.createUI = function () {
        var scope = this;

        if (!this.object.material) {
            this.parent.createEmptyForm('No material', 'To edit material, please add one before.');
            this.parent._panel.setTabEnabled('GeneralTab', true);
            this.parent._panel.setTabEnabled('MaterialTab', true);

            BabylonEditorUICreator.Form.createDivsForForms(['MainEditorEditObjectAddMaterial', 'MainEditorEditObjectSelectMaterial'], 'BabylonEditorEditObject', false);
            this._addMaterialButton = BabylonEditorUICreator.createCustomField('MainEditorEditObjectAddMaterial', 'EditionAddMaterial',
                '<button type="button" id="EditionAddMaterial" style="width: 100%;">Add one...</button>',
                this.core, function (event) {
                    BABYLON.Editor.Utils.sendEventButtonClicked(scope._addMaterialButton, scope._core);
                }, false
            );
            this._selectMaterialButton = BabylonEditorUICreator.createCustomField('MainEditorEditObjectSelectMaterial', 'EditionSelectMaterial',
                '<button type="button" id="EditionSelectMaterial" style="width: 100%;">Select one...</button>',
                this.core, function (event) {
                    BABYLON.Editor.Utils.sendEventButtonClicked(scope._selectMaterialButton, scope._core);
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

    EditionToolMaterial.prototype.clearUI = function () {
        if (this._colorsForm)
            this._colorsForm.destroy();
        if (this._materialParametersForm)
            this._materialParametersForm.destroy();
        if (this._texturesForm)
            this._texturesForm.destroy();

        this._colorsForm = null;
        this._materialParametersForm = null;
        this._texturesForm = null;
        this._removeMaterialButton = null;
        this._addMaterialButton = null;
        this._selectMaterialButton = null;
        this._addMaterialWindow = null;
        this._addMaterialList = null;
    }

    EditionToolMaterial.prototype._createWindowAddMaterial = function () {
        var body = '<div id="AddMaterial" style="height: 100%">'
            + '<span class="legend">Type : </span><input type="list" id="AddMaterialList" style="width: 83%; margin-top: 20px;"></input>'
            + '</div>';

        this._addMaterialWindow = new BABYLON.Editor.GUIWindow('BabylonEditorCreateNewMaterial', this._core, 'Create a new material', body, new BABYLON.Vector2(400, 150), ['Add', 'Close']);
        this._addMaterialWindow.buildElement();

        this._addMaterialList = new BABYLON.Editor.GUIList('AddMaterialList', this._core);
        this._addMaterialList.addItem('Standard Material').addItem('Shader Material').addItem('Multi Material');
        this._addMaterialList.buildElement('AddMaterialList');

    }

    EditionToolMaterial.prototype._createWindowSelectMaterial = function () {
        var body = '<div id="AddMaterial" style="height: 100%">'
            + '<span class="legend">Type : </span><input type="list" id="SelectMaterialList" style="width: 83%; margin-top: 20px;"></input>'
            + '</div>';

        this._selectMaterialWindow = new BABYLON.Editor.GUIWindow('BabylonEditorSelectMaterial', this._core, 'Select a material', body, new BABYLON.Vector2(400, 150), ['Select', 'Close']);
        this._selectMaterialWindow.buildElement();

        this._selectMaterialList = new BABYLON.Editor.GUIList('SelectMaterialList', this._core);
        //this._addMaterialList.addItem('Standard Material').addItem('Shader Material').addItem('Multi Material');
        for (var i = 0; i < this._core.currentScene.materials.length; i++) {
            this._selectMaterialList.addItem(this._core.currentScene.materials[i].name);
        }
        this._selectMaterialList.buildElement('SelectMaterialList');
    }

    return EditionToolMaterial;

})();

BABYLON.Editor.EditionToolMaterial = EditionToolMaterial;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON