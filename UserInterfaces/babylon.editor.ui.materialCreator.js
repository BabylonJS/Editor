/// <reference path="../index.html" />

/// Extends (already exists)
var __extends = this.__extends;

var MaterialCreator = (function (_super) {
    __extends(MaterialCreator, _super);
    function MaterialCreator() {
        /// Extend class
        _super.call(this);

        /// Scene
        this._canvas = null;
        this._engine = null;
        this._scene = null;
        this._object = null;

        /// Shaders
        this._codeActiveTab = 'vertexShaderTab';
        this._codeEditor = null;
        this._consoleOutput = null;
        this._material = null;
        this._customUpdate = null;

        this._vertexShader = '';
        this._pixelShader = '';
        this._buildScript = '';
        this._callbackScript = '';

        /// UI
        this._window = null;

        this._layouts = null;
        this._leftPanel = null;
        this._rightPanel = null;
        this._compileShaderButton = null;
    }

    MaterialCreator.prototype.configure = function (core) {
        _super.prototype.configure.call(this, core);
        this.core.eventReceivers.push(this);
        this._createUI();
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
                }

            }
            else if (ev.event.eventType == BABYLON.Editor.Event.GUIEvent.BUTTON_CLICKED) {
                if (ev.event.caller == this._compileShaderButton) {
                    this._createMaterial();
                }
            }
        }
    }

    MaterialCreator.prototype._close = function () {
        this._window.close();
    }

    MaterialCreator.prototype._createMaterial = function () {
        var scope = this;

        if (this._material) {
            this._material.dispose(true);
        }

        document.getElementById('BabylonEditorMaterialEditorPixelCodeZone').innerHTML = this._pixelShader;
        document.getElementById('BabylonEditorMaterialEditorVertexCodeZone').innerHTML = this._vertexShader;

        /// Execute build script and configure arrays (attributes and uniforms)
        var buildScriptResult = eval(this._buildScript);

        var uniforms = ["worldViewProjection"];
        uniforms.push.apply(uniforms, buildScriptResult.uniforms);

        var attributes = ["position", "uv"];
        attributes.push.apply(attributes, buildScriptResult.attributes);

        /// Compile material
        this._material = new BABYLON.ShaderMaterial("ShaderMaterial", this._scene,
            { vertexElement: "BabylonEditorMaterialEditorVertexCodeZone", fragmentElement: "BabylonEditorMaterialEditorPixelCodeZone" },
            {attributes: attributes, uniforms: uniforms}
        );

        /// Configure material
        this._material.onError = function (sender, errors) {
            scope._consoleOutput.setValue(scope._consoleOutput.getValue() + errors + '\n', -1);
        }
        this._material.onCompiled = function () {
            scope._consoleOutput.setValue(scope._consoleOutput.getValue() + 'compiled successfully\n', -1);
        }

        /// Set up init and update functions
        var customBuild = eval(this._callbackScript);
        customBuild.init(this._material, this._scene);
        this._customUpdate = customBuild.update;

        /// Set material
        this._object.material = this._material;
    }

    MaterialCreator.prototype._createUI = function () {
        var scope = this;

        /// Create popup with a canvas
        this._window = new BABYLON.Editor.GUIWindow('BabylonEditorEditTexturesWindow', this.core, 'Material Editor', '<div id="BabylonEditorEditTexturesLayout" style="height: 100%"></div>', new BABYLON.Vector2(1000, 500), ['Ok', 'Close']);
        this._window.modal = true;
        this._window.buildElement();

        /// Create layouts
        this._layouts = new BABYLON.Editor.GUILayout('BabylonEditorEditTexturesLayout', this.core);

        (this._leftPanel = this._layouts.createPanel('Codes', 'left', 500, true)).setContent(
              '<div id="BabylonEditorMaterialEditorCodeZone" style="height: 75%;"></div>'
            + '<div id="BabylonEditorMaterialEditorConsoleOutput" style="height: 25%;"></div>'
            + '<div type="application/shader" id="BabylonEditorMaterialEditorPixelCodeZone" style="height: 0%; display: none;"></div>'
            + '<div type="application/shader" id="BabylonEditorMaterialEditorVertexCodeZone" style="height: 0%; display: none;"></div>'
        );
        this._leftPanel.createTab('vertexShaderTab', 'Vertex Shader');
        this._leftPanel.createTab('pixelShaderTab', 'Pixel Shader');
        this._leftPanel.createTab('buildScriptTab', 'Build Script');
        this._leftPanel.createTab('callbackTab', 'Callback');

        (this._rightPanel = this._layouts.createPanel('TexturePreview', 'right', 500, true)).setContent(
            '<canvas id="materialEditorCanvas" style="height: 97%; width: 100%"></canvas>'
        );
        this._rightPanel.createTab('renderTab', 'Preview');
        this._rightPanel.createTab('optionsTab', 'Options');

        this._layouts.buildElement('BabylonEditorEditTexturesLayout');
        this._layouts.on('resize', function () {
            scope._engine.resize();
        });

        /// Create editors
        this._codeEditor = ace.edit('BabylonEditorMaterialEditorCodeZone');
        this._codeEditor.setTheme("ace/theme/twilight");
        this._codeEditor.getSession().setMode("ace/mode/glsl");
        this._codeEditor.setAutoScrollEditorIntoView(true);

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

        /// Create right button (to compile shader)
        this._compileShaderButton = BabylonEditorUICreator.createCustomField('materialEditorCanvas', 'CompileShader',
                '<button type="button" id="CompileShader" style="width: 100%;">Compile !</button>',
                this.core, function (event) {
                    BABYLON.Editor.Utils.sendEventButtonClicked(scope._compileShaderButton, scope.core);
                }, false
            );

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
        this._scene.clearColor = new BABYLON.Color3(0.5, 0.5, 0.5);

        this._camera = new BABYLON.ArcRotateCamera("AddMeshCamera", 1, 1.3, 100, new BABYLON.Vector3(0, 0, 0), this._scene);
        this._camera.attachControl(this._canvas, false);

        this._object = BABYLON.Mesh.CreateBox("previewObject", 6.0, this._scene);

        this._engine.runRenderLoop(function () {
            scope._scene.render();
            if (scope._customUpdate && scope._material)
                scope._customUpdate(scope._material, scope._scene);
        });

        /// Configure window
        this._window.removeElementsOnClose(['BabylonEditorEditTexturesLayout', 'EditTexturesGrid']);
        this._window.onClose(function () {
            _super.prototype.close.call(scope);
            scope._engine.dispose();
        });
        this._window.addElementsToResize([this._layouts]);
        this._window.onToggle(function (maximized, width, height) {
            scope._layouts.setSize('left', width / 2);
            scope._layouts.setSize('right', width / 2);
            scope._engine.resize(true);
            scope._codeEditor.resize();
        });

        this._window.on('open', function (event) {
            scope._window.maximize();
        });

    }

    return MaterialCreator;

})(BABYLON.Editor.Plugin);


this.createPlugin = function (parameters) {
    return new MaterialCreator();
}
//# sourceMappingURL=babylon.editor.ui.editTextures.js.map
