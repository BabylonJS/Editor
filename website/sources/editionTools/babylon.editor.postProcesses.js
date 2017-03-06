var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PostProcessesTool = (function (_super) {
            __extends(PostProcessesTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function PostProcessesTool(editionTool) {
                var _this = _super.call(this, editionTool) || this;
                // Public members
                _this.tab = "POSTPROCESSES.TAB";
                // Private members
                _this._renderEffects = {};
                // Initialize
                _this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-POSTPROCESSES"
                ];
                return _this;
            }
            // Object supported
            PostProcessesTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Scene)
                    return true;
                return false;
            };
            // Creates the UI
            PostProcessesTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Post-Processes" });
            };
            // Update
            PostProcessesTool.prototype.update = function () {
                var _this = this;
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Ckeck checkboxes
                EDITOR.SceneFactory.EnabledPostProcesses.standard = EDITOR.SceneFactory.StandardPipeline !== null;
                EDITOR.SceneFactory.EnabledPostProcesses.ssao = EDITOR.SceneFactory.SSAOPipeline !== null;
                // Standard
                var standardFolder = this._element.addFolder("Standard Rendering Pipeline");
                standardFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "standard").name("Enabled Standard").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.CreateStandardRenderingPipeline(_this._editionTool.core, function () { return _this.update(); });
                    else {
                        EDITOR.SceneFactory.StandardPipeline.dispose();
                        EDITOR.SceneFactory.StandardPipeline = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.StandardPipeline) {
                    var animationsFolder = standardFolder.addFolder("Animations");
                    animationsFolder.add(this, "_editAnimations").name("Edit Animations");
                    var highLightFolder = standardFolder.addFolder("Highlighting");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "exposure").min(0).max(10).step(0.01).name("Exposure");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "brightThreshold").min(0).max(10).step(0.01).name("Bright Threshold");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "gaussianCoefficient").min(0).max(10).step(0.01).name("Gaussian Coefficient");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "gaussianMean").min(0).max(30).step(0.01).name("Gaussian Mean");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "gaussianStandardDeviation").min(0).max(30).step(0.01).name("Gaussian Standard Deviation");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "blurWidth").min(0).max(5).step(0.01).name("Blur Width");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "horizontalBlur").name("Horizontal Blur");
                    this.addTextureFolder(EDITOR.SceneFactory.StandardPipeline, "Lens Dirt Texture", "lensTexture", highLightFolder).open();
                    highLightFolder.open();
                    var lensFolder = standardFolder.addFolder("Lens Flare");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "LensFlareEnabled").name("Lens Flare Enabled");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "lensFlareStrength").min(0).max(50).step(0.01).name("Strength");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "lensFlareHaloWidth").min(0).max(2).step(0.01).name("Halo Width");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "lensFlareGhostDispersal").min(0).max(10).step(0.1).name("Ghost Dispersal");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "lensFlareDistortionStrength").min(0).max(500).step(0.1).name("Distortion Strength");
                    this.addTextureFolder(EDITOR.SceneFactory.StandardPipeline, "Lens Flare Dirt Texture", "lensFlareDirtTexture", lensFolder).open();
                    lensFolder.open();
                    var hdrFolder = standardFolder.addFolder("HDR");
                    hdrFolder.add(EDITOR.SceneFactory.StandardPipeline, "HDREnabled").name("HDR Enabled");
                    hdrFolder.add(EDITOR.SceneFactory.StandardPipeline, "hdrMinimumLuminance").min(0).max(2).name("Minimum Luminance");
                    hdrFolder.add(EDITOR.SceneFactory.StandardPipeline, "hdrDecreaseRate").min(0).max(2).name("Decrease Rate");
                    hdrFolder.add(EDITOR.SceneFactory.StandardPipeline, "hdrIncreaseRate").min(0).max(2).name("Increase Rate");
                    hdrFolder.open();
                    var dofFolder = standardFolder.addFolder("Depth Of Field");
                    dofFolder.add(EDITOR.SceneFactory.StandardPipeline, "DepthOfFieldEnabled").name("Enable Depth-Of-Field");
                    dofFolder.add(EDITOR.SceneFactory.StandardPipeline, "depthOfFieldDistance").min(0).max(this._editionTool.core.currentScene.activeCamera.maxZ).name("DOF Distance");
                    dofFolder.add(EDITOR.SceneFactory.StandardPipeline, "depthOfFieldBlurWidth").min(0).max(5).name("Blur Width");
                    dofFolder.open();
                    var debugFolder = standardFolder.addFolder("Debug");
                    this._setupDebugPipeline(debugFolder, EDITOR.SceneFactory.StandardPipeline);
                }
                // SSAO
                var ssaoFolder = this._element.addFolder("SSAO");
                ssaoFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "ssao").name("Enable SSAO").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.SSAOPipeline = EDITOR.SceneFactory.CreateSSAOPipeline(_this._editionTool.core);
                    else {
                        EDITOR.SceneFactory.SSAOPipeline.dispose();
                        EDITOR.SceneFactory.SSAOPipeline = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.SSAOPipeline) {
                    ssaoFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "attachSSAO").name("Attach SSAO").onChange(function (result) {
                        _this._attachDetachPipeline(result, "ssao");
                    });
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "area").min(0).max(1).step(0.0001).name("Area");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "radius").min(0).max(1).step(0.00001).name("Radius");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "fallOff").min(0).step(0.000001).name("Fall Off");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "base").min(0).max(10).step(0.001).name("Base");
                    var debugFolder = ssaoFolder.addFolder("Debug");
                    this._setupDebugPipeline(debugFolder, EDITOR.SceneFactory.SSAOPipeline);
                }
                // VLS
                var vlsFolder = this._element.addFolder("Volumetric Light Scattering");
                vlsFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "vls").name("Enable VLS").onChange(function (result) {
                    if (result === true) {
                        var picker = new EDITOR.ObjectPicker(_this._editionTool.core);
                        picker.objectLists.push(_this._editionTool.core.currentScene.meshes);
                        picker.minSelectCount = 0;
                        picker.closeButtonName = "Cancel";
                        picker.selectButtonName = "Add";
                        picker.windowName = "Select an emitter?";
                        picker.onObjectPicked = function (names) {
                            var mesh = _this._editionTool.core.currentScene.getMeshByName(names[0]);
                            EDITOR.SceneFactory.VLSPostProcess = EDITOR.SceneFactory.CreateVLSPostProcess(_this._editionTool.core, mesh);
                            _this.update();
                        };
                        picker.open();
                    }
                    else {
                        EDITOR.SceneFactory.VLSPostProcess.dispose(_this._editionTool.core.camera);
                        EDITOR.SceneFactory.VLSPostProcess = null;
                        _this.update();
                    }
                });
                if (EDITOR.SceneFactory.VLSPostProcess) {
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "exposure").min(0).max(1).name("Exposure");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "decay").min(0).max(1).name("Decay");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "weight").min(0).max(1).name("Weight");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "density").min(0).max(1).name("Density");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "invert").name("Invert");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "useDiffuseColor").name("use Diffuse Color");
                    vlsFolder.add(EDITOR.SceneFactory.VLSPostProcess, "useCustomMeshPosition").name("Use Custom Position");
                    this.addVectorFolder(EDITOR.SceneFactory.VLSPostProcess.customMeshPosition, "Position", true, vlsFolder);
                    vlsFolder.add(this, "_setVLSAttachedNode").name("Attach Node...");
                }
                return true;
            };
            // Set up attached node of VLS
            PostProcessesTool.prototype._setVLSAttachedNode = function () {
                var _this = this;
                var picker = new EDITOR.ObjectPicker(this._editionTool.core);
                picker.objectLists.push(this._editionTool.core.currentScene.meshes);
                picker.objectLists.push(this._editionTool.core.currentScene.lights);
                picker.objectLists.push(this._editionTool.core.currentScene.cameras);
                picker.minSelectCount = 0;
                picker.onObjectPicked = function (names) {
                    var node = null;
                    if (names.length > 0)
                        node = _this._editionTool.core.currentScene.getNodeByName(names[0]);
                    EDITOR.SceneFactory.VLSPostProcess.attachedNode = node;
                };
                picker.open();
            };
            // Set up debug mode
            PostProcessesTool.prototype._setupDebugPipeline = function (folder, pipeline) {
                var _this = this;
                var renderEffects = pipeline._renderEffects;
                var configure = function () {
                    for (var effectName in renderEffects) {
                        if (_this._renderEffects[effectName] === true)
                            pipeline._enableEffect(effectName, _this._getPipelineCameras());
                        else
                            pipeline._disableEffect(effectName, _this._getPipelineCameras());
                    }
                };
                for (var effectName in renderEffects) {
                    var effect = renderEffects[effectName];
                    if (!this._renderEffects[effectName])
                        this._renderEffects[effectName] = true;
                    folder.add(this._renderEffects, effectName).onChange(function (result) {
                        configure();
                    });
                }
            };
            // Attach/detach pipeline
            PostProcessesTool.prototype._attachDetachPipeline = function (attach, pipeline) {
                if (attach)
                    this._editionTool.core.currentScene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(pipeline, this._getPipelineCameras());
                else
                    this._editionTool.core.currentScene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(pipeline, this._getPipelineCameras());
            };
            PostProcessesTool.prototype._getPipelineCameras = function () {
                var cameras = [this._editionTool.core.camera];
                if (this._editionTool.core.playCamera)
                    cameras.push(this._editionTool.core.playCamera);
                return cameras;
            };
            // Creates a function to change texture of a flare
            PostProcessesTool.prototype._loadHDRLensDirtTexture = function () {
                var _this = this;
                var input = EDITOR.Tools.CreateFileInpuElement("HDR-LENS-DIRT-LOAD-TEXTURE");
                input.change(function (data) {
                    var files = data.target.files || data.currentTarget.files;
                    if (files.length < 1)
                        return;
                    var file = files[0];
                    BABYLON.Tools.ReadFileAsDataURL(file, function (result) {
                        var texture = BABYLON.Texture.CreateFromBase64String(result, file.name, _this._editionTool.core.currentScene);
                        texture.name = texture.name.replace("data:", "");
                        EDITOR.SceneFactory.HDRPipeline.lensTexture = texture;
                        input.remove();
                    }, null);
                });
                input.click();
            };
            // Loads the animations tool
            PostProcessesTool.prototype._editAnimations = function () {
                var animCreator = new EDITOR.GUIAnimationEditor(this._editionTool.core, EDITOR.SceneFactory.StandardPipeline);
            };
            return PostProcessesTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.PostProcessesTool = PostProcessesTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.postProcesses.js.map
