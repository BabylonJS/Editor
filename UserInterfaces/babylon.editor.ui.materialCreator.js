/// <reference path="../index.html" />

/// Extends (already exists)
var __extends = this.__extends;

var MaterialCreator = (function (_super) {

    /// Material Creator
    __extends(MaterialCreator, _super);
    function MaterialCreator(materialShader) {
        /// Extend class
        _super.call(this);

        /// Scene
        this._canvas = null;
        this._engine = null;
        this._scene = null;
        this._object = null;

        /// Shaders
        this._shaderData = materialShader;

        this._codeActiveTab = 'vertexShaderTab';
        this._codeEditor = null;
        this._consoleOutput = null;
        this._customUpdate = null;

        this._vertexShader = '';
        this._pixelShader = '';
        this._buildScript = '';
        this._callbackScript = '';

        this._material = null;
        this._shaderManager = null;
        this._samplers = new Array();
        this._spies = new Array();

        /// UI
        this._window = null;

        this._layouts = null;
        this._leftPanel = null;
        this._rightPanel = null;

        this._toolbar = null;
        this._imageSelector = null;

        this._renderingLayouts = null;
        this._optionsLayouts = null;
        this._generalForm = null;
        this._uniformsForm = null;
        this._texturesForm = null;

        this._saveWindow = null;
    }

    MaterialCreator.prototype.configure = function (core) {
        _super.prototype.configure.call(this, core);
        this.core.eventReceivers.push(this);
        this.core.customUpdates.push(this);
        this._createUI();
    }

    MaterialCreator.prototype.update = function () {
        if (this._material && this._shaderManager._enableSpies) {
            var spies = new Array();
            for (var i = 0; i < this._spies.length; i++) {
                var value = BABYLON.Editor.Utils.GetValueFromShaderMaterial(this._spies[i], this._material);
                spies.push(BABYLON.Editor.Utils.GetStringFromValue(value, true, 10000));
            }
            this._uniformsForm.fillFields(spies);
            this._uniformsForm.refresh();
        }
    }

    MaterialCreator.prototype.onEvent = function (ev) {
        if (ev.eventType == BABYLON.Editor.EventType.GUIEvent) {
            /// Tab changed
            if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.TAB_CHANGED) {

                /// Lef panel
                if (ev.event.caller == this._leftPanel) {
                    this._codeActiveTab = ev.event.result;
                    if (this._codeActiveTab == 'pixelShaderTab') {
                        this._codeEditor.setValue(this._pixelShader, -1);
                        this._codeEditor.getSession().setMode("ace/mode/glsl");
                    }else if (this._codeActiveTab == 'vertexShaderTab') {
                        this._codeEditor.setValue(this._vertexShader, -1);
                        this._codeEditor.getSession().setMode("ace/mode/glsl");
                    } else if (this._codeActiveTab == 'buildScriptTab') {
                        this._codeEditor.setValue(this._buildScript, -1);
                        this._codeEditor.getSession().setMode("ace/mode/javascript");
                    } else if (this._codeActiveTab == 'callbackTab') {
                        this._codeEditor.setValue(this._callbackScript, -1);
                        this._codeEditor.getSession().setMode("ace/mode/javascript");
                    }
                    return true;
                }

            }

            /// Form changed
            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.FORM_CHANGED) {

                if (ev.event.caller == this._texturesForm) {
                    var textures = this._texturesForm.getElements();
                    for (var i = 0; i < this._samplers.length; i++) {
                        var name = textures[this._samplers[i]].value;
                        this._material.setTexture(this._samplers[i], BABYLON.Editor.Utils.GetTextureFromName(name, this._scene));
                    }
                    return true;
                }

            }

            /// Confirm dialog
            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.CONFIRM_DIALOG) {

                if (ev.event.caller == this._saveWindow) {
                    if (ev.event.result == 'Yes') {
                        var manager = new BABYLON.Editor.MaterialManager();
                        manager.scene = this.core.currentScene;
                        var materialData = this.core.coreData.addMaterial(manager, this._vertexShader, this._pixelShader, this._buildScript, this._callbackScript);
                        materialData.isUpdating = false;
                    }
                    _super.prototype.close.call(this);
                    return true;
                }

            }

            /// Toolbar selected
            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.TOOLBAR_SELECTED) {
                if (ev.event.caller == this._toolbar) {
                    /// General
                    if (ev.event.result == 'EnableLogs') {
                        this._shaderManager._enableLogs = !this._toolbar.isItemChecked('EnableLogs');
                        this._toolbar.setAutoItemChecked('EnableLogs');
                        return true;
                    }
                    else if (ev.event.result == 'EnableSpies') {
                        this._shaderManager._enableSpies = !this._toolbar.isItemChecked('EnableSpies');
                        this._toolbar.setAutoItemChecked('EnableSpies');
                        return true;
                    }
                    else if (ev.event.result == 'BuildAll') {
                        this._createMaterial();
                        return true;
                    }
                    /// Files
                    else if (ev.event.result == 'MainFiles:save-material') {
                        this._createFinalMaterial();
                        return true;
                    }
                    else if (ev.event.result == 'MainFiles:close') {
                        this._close(true);
                        this._saveWindow = new BABYLON.Editor.GUIDialog('SaveMaterial', this.core, 'Save Material ?',
                                                                        'Do you want to save the material ?', new BABYLON.Vector2(500, 500));
                        this._saveWindow.buildElement();
                        return true;
                    }
                    /// Edit
                    else if (ev.event.result == 'MainEdit:eval-callback') {
                        this._evalCallback();
                        return true;
                    }
                    else if (ev.event.result == 'MainEdit:set-custom-texture') {
                        var scope = this;
                        this._imageSelector = document.getElementById('BabylonEditorMaterialEditorFileInput');
                        this._imageSelector.onchange = function (event) {
                            for (var i = 0; i < event.target.files.length; i++) {
                                var file = event.target.files[i];
                                BABYLON.Editor.Utils.GetTextureFromFile(file, scope._scene, function (tex) {
                                    scope._createForms();
                                });
                            }
                        }
                        this._imageSelector.click();
                        return true;
                    }
                    /// Object
                    else if (ev.event.result.indexOf('MainObject:') != -1) {
                        this._object.dispose();

                        if (ev.event.result == 'MainObject:set-object-box')
                            this._object = BABYLON.Mesh.CreateBox("previewObject", 6.0, this._scene);
                        else if (ev.event.result == 'MainObject:set-object-torus')
                            this._object = BABYLON.Mesh.CreateTorus("previewObject", 5, 1, 32, this._scene);
                        else if (ev.event.result == 'MainObject:set-object-torus-knot')
                            this._object = BABYLON.Mesh.CreateTorusKnot("previewObject", 2, 0.5, 128, 64, 2, 3, this._scene);

                        this._object.material = this._material;
                        return true;
                    }
                }
            }
        }

        return false;
    }

    MaterialCreator.prototype._close = function (keepPlugin) {
        this._object.dispose();
        this._window.close();

        if (!keepPlugin)
            _super.prototype.close.call(this);
    }

    MaterialCreator.prototype._evalCallback = function () {
        var customBuild = eval(this._callbackScript);
        try {
            customBuild.init(this._shaderManager);
        } catch (error) {
            this._shaderManager.log(error.message);
        }

        try {
            customBuild.update(this._shaderManager);
        } catch (error) {
            this._customUpdate = null;
            return;
        }
        this._customUpdate = customBuild.update;
    }

    MaterialCreator.prototype._createFinalMaterial = function () {
        var scope = this;

        var domElements = BABYLON.Editor.Utils.CreateMaterialShaderDiv(this._vertexShader, this._pixelShader);

        /// Create and store data
        var manager = new BABYLON.Editor.MaterialManager();
        manager.scene = scope.core.currentScene;
        var materialData = this.core.coreData.addMaterial(manager, this._vertexShader, this._pixelShader, this._buildScript, this._callbackScript);
        materialData.isUpdating = true;

        var buildScriptResult;
        try {
            buildScriptResult = eval(this._buildScript);
        } catch (error) {
            this._shaderManager.log(error.message);
            return;
        }

        var uniforms = ["worldViewProjection"];
        uniforms.push.apply(uniforms, buildScriptResult.uniforms);

        var attributes = ["position", "uv"];
        attributes.push.apply(attributes, buildScriptResult.attributes);

        var textures = buildScriptResult.samplers;

        var name = 'ShaderMaterial', it = 0;
        while (BABYLON.Editor.Utils.GetMaterialByName(name, this.core.currentScene)) {
            name += it;
            it++;
        }

        var material = new BABYLON.ShaderMaterial(name, this.core.currentScene,
            { vertexElement: domElements.vertexShaderId, fragmentElement: domElements.pixelShaderId },
            {attributes: attributes, uniforms: uniforms, samplers: textures}
        );

        manager.material = material;

        this._shaderManager._enableLogs = true;
        this._shaderManager.log('Creating final material...');
        this._shaderManager._enableLogs = false;

        material.onCompiled = function (m) {

        };

        this._close();
    }

    MaterialCreator.prototype._createMaterial = function () {
        var scope = this;

        if (this._material) {
            this._material._textures = [];
            this._material.dispose(true);
        }

        document.getElementById('BabylonEditorMaterialEditorPixelCodeZone').innerHTML = this._pixelShader;
        document.getElementById('BabylonEditorMaterialEditorVertexCodeZone').innerHTML = this._vertexShader;

        /// Execute build script and configure arrays (attributes and uniforms)
        var buildScriptResult;
        try {
            buildScriptResult = eval(this._buildScript);
        } catch (error) {
            this._shaderManager.log(error.message);
            return;
        }

        var uniforms = ["worldViewProjection"];
        uniforms.push.apply(uniforms, buildScriptResult.uniforms);

        var attributes = ["position", "uv"];
        attributes.push.apply(attributes, buildScriptResult.attributes);

        var textures = buildScriptResult.samplers;

        /// Compile material
        this._material = new BABYLON.ShaderMaterial("ShaderMaterial", this._scene,
            { vertexElement: "BabylonEditorMaterialEditorVertexCodeZone", fragmentElement: "BabylonEditorMaterialEditorPixelCodeZone" },
            {attributes: attributes, uniforms: uniforms, samplers: textures}
        );

        /// Configure material
        this._material.onError = function (sender, errors) {
            scope._consoleOutput.setValue(scope._consoleOutput.getValue() + errors + '\n', -1);
            scope._material = null;
        };

        this._material.onCompiled = function () {
            scope._consoleOutput.setValue(scope._consoleOutput.getValue() + 'compiled successfully\n', -1);
        };

        /// Set up init and update functions
        this._shaderManager.material = this._material;

        this._evalCallback();

        /// Set material
        this._object.material = this._material;

        /// Create forms
        this._samplers = textures;
        this._spies = buildScriptResult.spies;
        this._createForms();
    }

    MaterialCreator.prototype._createUI = function () {
        var scope = this;

        /// Create popup with layouts
        this._window = new BABYLON.Editor.GUIWindow('BabylonEditorEditTexturesWindow', this.core, 'Material Editor', '<div id="BabylonEditorMaterialEditorLayout" style="height: 100%"></div>', new BABYLON.Vector2(1000, 500), []);
        this._window.modal = true;
        this._window.buildElement();

        /// Create layouts
        this._layouts = new BABYLON.Editor.GUILayout('BabylonEditorMaterialEditorLayout', this.core);

        (this._leftPanel = this._layouts.createPanel('BabylonEditorMaterialEditorCodes', 'left', 500, true)).setContent(
              '<div id="BabylonEditorMaterialEditorCodeZone" style="height: 75%;"></div>'
            + '<b>\nOutput :\n</b><div id="BabylonEditorMaterialEditorConsoleOutput" style="height: 25%;"></div>'
            + '<div type="application/shader" id="BabylonEditorMaterialEditorPixelCodeZone" style="height: 0%; display: none;"></div>'
            + '<div type="application/shader" id="BabylonEditorMaterialEditorVertexCodeZone" style="height: 0%; display: none;"></div>'
        );
        this._leftPanel.createTab('vertexShaderTab', 'Vertex Shader');
        this._leftPanel.createTab('pixelShaderTab', 'Pixel Shader');
        this._leftPanel.createTab('buildScriptTab', 'Build Script');
        this._leftPanel.createTab('callbackTab', 'Callback');

        (this._rightPanel = this._layouts.createPanel('BabylonEditorMaterialEditorRenderPreview', 'right', 500, true)).setContent(
              '<div id="BabylonEditorMaterialEditorRenderingLayout" style="height: 100%; width: 100%"></div>'
              + '<input type="file" id="BabylonEditorMaterialEditorFileInput" multiple style="display:none" />'
        );

        this._layouts.createPanel('BabylonEditorMaterialEditorToolbar', 'top', 40, false).setContent(
            '<div id="BabylonEditorMaterialEditorToolbar"></div>'
        );

        this._layouts.buildElement('BabylonEditorMaterialEditorLayout');

        /// Rendering layouts
        this._renderingLayouts = new BABYLON.Editor.GUILayout('BabylonEditorMaterialEditorRenderingLayout', this.core);
        this._renderingLayouts.createPanel('BabylonEditorMaterialEditorRenderPreview', 'top', 250, true).setContent(
            '<canvas id="materialEditorCanvas" style="height: 100%; width: 100%"></canvas>'
        );
        this._renderingLayouts.createPanel('BabylonEditorMaterialEditorRenderOptions', 'bottom', 250, true).setContent(
            '<div id="BabylonEditorMaterialEditorOptionsLayout" style="height: 100%; width: 100%"></div>'
        );

        this._renderingLayouts.buildElement('BabylonEditorMaterialEditorRenderingLayout');
        this._renderingLayouts.on('resize', function () {
            scope._engine.resize();
        });

        /// Options layouts
        this._optionsLayouts = new BABYLON.Editor.GUILayout('BabylonEditorMaterialEditorOptionsLayout', this.core);
        this._optionsLayouts.createPanel('BabylonEditorMaterialEditorOptionsLayoutUniforms', 'left', 250, true).setContent(
            '<div id="BabylonEditorMaterialEditorOptionsLayoutUniforms"></div>'
        );
        this._optionsLayouts.createPanel('BabylonEditorMaterialEditorOptionsLayoutConfiguration', 'right', 250, true).setContent(
            '<div id="BabylonEditorMaterialEditorOptionsLayoutConfiguration"></div>'
        );
        this._optionsLayouts.buildElement('BabylonEditorMaterialEditorOptionsLayout');

        /// Create toolbar
        this._toolbar = new BABYLON.Editor.GUIToolbar('BabylonEditorMaterialEditorToolbar', this.core);

        var menu = this._toolbar.createMenu('menu', 'MainFiles', 'Material Editor', 'icon-folder');
        menu.createItem('button', 'save-material', 'Save Material...', 'icon-open-file');
        menu.createItem('button', 'close', 'Close', 'icon-save-file');

        menu = this._toolbar.createMenu('menu', 'MainEdit', 'Edit', 'icon-edit');
        menu.createItem('button', 'eval-callback', 'Re-eval callback', 'icon-filters');
        menu.createItem('button', 'set-custom-texture', 'Set custom texture...', 'icon-textures');

        menu = this._toolbar.createMenu('menu', 'MainObject', 'Object', 'icon-primitives');
        menu.createItem('button', 'set-object-box', 'Box', 'icon-add-cube');
        menu.createItem('button', 'set-object-torus', 'Torus', 'icon-add-sphere');
        menu.createItem('button', 'set-object-torus-knot', 'Torus Knot', 'icon-add-billboard');

        this._toolbar.createMenu('break');
        this._toolbar.createMenu('button', 'BuildAll', 'Build !', 'icon-shaders');
        this._toolbar.createMenu('button', 'EnableLogs', 'Enable Logs', 'icon-console');
        this._toolbar.createMenu('button', 'EnableSpies', 'Enable Spies', 'icon-filters');

        this._toolbar.buildElement('BabylonEditorMaterialEditorToolbar');

        /// Create editors
        this._codeEditor = ace.edit('BabylonEditorMaterialEditorCodeZone');
        this._codeEditor.setTheme("ace/theme/clouds");
        this._codeEditor.getSession().setMode("ace/mode/glsl");

        this._codeEditor.on('change', function (event) {
            if (scope._codeActiveTab == 'vertexShaderTab') {
                scope._vertexShader = scope._codeEditor.getValue();
            } else if (scope._codeActiveTab == 'pixelShaderTab') {
                scope._pixelShader = scope._codeEditor.getValue();
            } else if (scope._codeActiveTab == 'buildScriptTab') {
                scope._buildScript = scope._codeEditor.getValue();
            } else if (scope._codeActiveTab == 'callbackTab')
                scope._callbackScript = scope._codeEditor.getValue();
        });

        this._consoleOutput = ace.edit('BabylonEditorMaterialEditorConsoleOutput');

        /// Load default shader
        BABYLON.Tools.LoadFile('Babylon/Shaders/basic.vertex.fx', function (result) {
            scope._vertexShader = result;
            scope._codeEditor.setValue(result, -1);
        });
        BABYLON.Tools.LoadFile('Babylon/Shaders/basic.pixel.fx', function (result) {
            scope._pixelShader = result;
        });
        BABYLON.Tools.LoadFile('Babylon/Templates/shaderBuildScript.js', function (result) {
            scope._buildScript = result;
        });
        BABYLON.Tools.LoadFile('Babylon/Templates/shaderCallbackScript.js', function (result) {
            scope._callbackScript = result;
        });

        /// Create scene
        this._canvas = document.getElementById("materialEditorCanvas");

        this._engine = new BABYLON.Engine(this._canvas, true);

        this._scene = new BABYLON.Scene(this._engine);

        this._camera = new BABYLON.ArcRotateCamera("AddMeshCamera", 1, 1.3, 100, new BABYLON.Vector3(0, 0, 0), this._scene);
        this._camera.attachControl(this._canvas, false);

        this._object = BABYLON.Mesh.CreateBox("previewObject", 6.0, this._scene);
        this._engine.runRenderLoop(function () {
            scope._scene.render();
            if (scope._customUpdate && scope._material)
                scope._customUpdate(scope._shaderManager);
        });

        /// Configure window
        this._window.onClose(function () {
            scope._engine.dispose();
            scope._toolbar.destroy();
            if (scope._generalForm) scope._generalForm.destroy();
            if (scope._uniformsForm) scope._uniformsForm.destroy();
            if (scope._texturesForm) scope._texturesForm.destroy();
            scope._optionsLayouts.destroy();
            scope._renderingLayouts.destroy();
            scope._layouts.destroy();
        });

        this._window.addElementsToResize([this._layouts]);

        this._window.onToggle(function (maximized, width, height) {
            scope._layouts.setSize('left', width / 2 - 15);
            scope._layouts.setSize('right', width / 2 - 15);
            scope._renderingLayouts.setSize('top', height / 2);
            scope._renderingLayouts.setSize('bottom', height / 3);
            scope._optionsLayouts.setSize('left', (width / 2) / 2 - 30);
            scope._optionsLayouts.setSize('right', (width / 2) / 2 - 15);
            scope._codeEditor.setOptions({
                maxLines: (height - height / 4) / scope._codeEditor.renderer.lineHeight,
                minLines: (height - height / 4) / scope._codeEditor.renderer.lineHeight - 10
            });
            scope._consoleOutput.setOptions({
                maxLines: (height / 4) / scope._codeEditor.renderer.lineHeight,
                minLines: (height / 4) / scope._codeEditor.renderer.lineHeight - 3
            });
        });

        this._window.on('open', function (event) {
            scope._window.maximize();
        });
        
        this._window.on('keydown', function (event) { /// CTRL + B
            event = window.event ? window.event : event
            if (event.keyCode == 66 && event.ctrlKey) {
                scope._createMaterial();
                event.preventDefault();
            }
        });

        /// Configure shader manager
        this._shaderManager = new BABYLON.Editor.MaterialCreatorManager(this._consoleOutput);
        this._shaderManager.scene = this._scene;

    }

    MaterialCreator.prototype._createForms = function () {
        if (this._generalForm) this._generalForm.destroy();
        if (this._texturesForm) this._texturesForm.destroy();
        if (this._uniformsForm) this._uniformsForm.destroy();

        if (this._material == null)
            return;

        BabylonEditorUICreator.Form.createDivsForForms([
            'BabylonEditorMaterialEditorRenderOptionsTextures',
            'BabylonEditorMaterialEditorRenderOptionsUniforms'
        ], 'BabylonEditorMaterialEditorOptionsLayoutUniforms', true);
        BabylonEditorUICreator.Form.createDivsForForms([
            'BabylonEditorMaterialEditorOptionsLayoutConfiguration'
        ], 'BabylonEditorMaterialEditorRenderOptions', true);

        /// General
        this._generalForm = new BABYLON.Editor.GUIForm('BabylonEditorMaterialEditorRenderOptionsGeneral', this._core, 'General');

        this._generalForm.createField('GeneralMaterialName', 'text', 'Name :', 6);
        this._generalForm.createField('GeneralMaterialBacKFaceCulling', 'checkbox', 'Back Face Culling :', 6);
        this._generalForm.createField('GeneralMaterialWireframe', 'checkbox', 'Wireframe :', 6);
        this._generalForm.createField('GeneralMaterialAlpha', 'text', 'Alpha :', 6);

        this._generalForm.buildElement('BabylonEditorMaterialEditorOptionsLayoutConfiguration');

        this._generalForm.fillFields([this._material.name, this._material.backFaceCulling, this._material.wireframe, this._material.alpha]);

        /// Textures
        this._texturesForm = new BABYLON.Editor.GUIForm('BabylonEditorMaterialEditorRenderOptionsTextures', this._core, 'Textures');
        var texturesNames = new Array();
        texturesNames.push('None');
        for (var i = 0; i < this._scene.textures.length; i++) {
            var tex = this._scene.textures[i];
            texturesNames.push(tex.name);
        }

        for (var i = 0; i < this._samplers.length; i++)
            this._texturesForm.createFieldWithItems(this._samplers[i], 'list', this._samplers[i], texturesNames, 6);

        this._texturesForm.buildElement('BabylonEditorMaterialEditorRenderOptionsTextures');

        texturesNames = new Array();
        for (var i = 0; i < this._samplers.length; i++) {
            var tex = this._material._textures[this._samplers[i]];
            if (tex)
                texturesNames.push(tex.name);
            else
                texturesNames.push('None');
        }
        this._texturesForm.fillFields(texturesNames);

        /// Uniforms
        this._uniformsForm = new BABYLON.Editor.GUIForm('BabylonEditorMaterialEditorRenderOptionsUniforms', this._core, 'Uniforms - Spies');

        for (var i = 0; i < this._spies.length; i++) {
            this._uniformsForm.createField(this._spies[i], 'text', this._spies[i], 6);
        }

        this._uniformsForm.buildElement('BabylonEditorMaterialEditorRenderOptionsUniforms');
    }

    return MaterialCreator;

})(BABYLON.Editor.Plugin);


this.createPlugin = function (parameters) {
    return new MaterialCreator(parameters.materialShader);
}
//# sourceMappingURL=babylon.editor.ui.editTextures.js.map
