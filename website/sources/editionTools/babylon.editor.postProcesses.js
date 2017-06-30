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
                _this._defaultVignetteMultiply = false;
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
                // Default
                var defaultFolder = this._element.addFolder("Default Rendering Pipeline");
                defaultFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "default").name("Enable Default Rendering Pipeline").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.CreateDefaultPipeline(_this._editionTool.core);
                    else {
                        EDITOR.SceneFactory.DefaultPipeline.dispose();
                        EDITOR.SceneFactory.DefaultPipeline = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.DefaultPipeline) {
                    var bloomFolder = defaultFolder.addFolder("Bloom");
                    bloomFolder.open();
                    bloomFolder.add(EDITOR.SceneFactory.DefaultPipeline, "bloomEnabled").name("Enable Bloom");
                    bloomFolder.add(EDITOR.SceneFactory.DefaultPipeline, "bloomWeight").min(0).max(1).step(0.01).name("Bloom Weight").onChange(function () { return _this.update(); });
                    bloomFolder.add(EDITOR.SceneFactory.DefaultPipeline, "bloomKernel").min(0).step(1).name("Bloom Kernel");
                    var imgProcessingFolder = defaultFolder.addFolder("Image Processing");
                    imgProcessingFolder.open();
                    imgProcessingFolder.add(EDITOR.SceneFactory.DefaultPipeline, "imageProcessingEnabled").name("Enable Image Processing");
                    imgProcessingFolder.add(EDITOR.SceneFactory.DefaultPipeline.imageProcessing, "cameraToneMappingEnabled").name("Camera Tone Mapping");
                    imgProcessingFolder.add(EDITOR.SceneFactory.DefaultPipeline.imageProcessing, "vignetteEnabled").name("Vignette");
                    imgProcessingFolder.add(EDITOR.SceneFactory.DefaultPipeline.imageProcessing, "colorCurvesEnabled").name("Color Curves");
                    imgProcessingFolder.add(EDITOR.SceneFactory.DefaultPipeline.imageProcessing, "cameraContrast").min(0).max(10).step(0.01).name("Camera Constrast");
                    imgProcessingFolder.add(EDITOR.SceneFactory.DefaultPipeline.imageProcessing, "cameraExposure").min(0).max(10).step(0.01).name("Camera Exposure");
                    this._defaultVignetteMultiply = EDITOR.SceneFactory.DefaultPipeline.imageProcessing.vignetteBlendMode === BABYLON.ImageProcessingPostProcess.VIGNETTEMODE_MULTIPLY;
                    imgProcessingFolder.add(this, "_defaultVignetteMultiply").name("Vignette Multiply").onChange(function (result) {
                        var blendMode = result ? BABYLON.ImageProcessingPostProcess.VIGNETTEMODE_MULTIPLY : BABYLON.ImageProcessingPostProcess.VIGNETTEMODE_OPAQUE;
                        EDITOR.SceneFactory.DefaultPipeline.imageProcessing.vignetteBlendMode = blendMode;
                    });
                    this.addColorFolder(EDITOR.SceneFactory.DefaultPipeline.imageProcessing.vignetteColor, "Vignette Color", true, imgProcessingFolder);
                    imgProcessingFolder.add(EDITOR.SceneFactory.DefaultPipeline.imageProcessing, "vignetteWeight").min(0).max(10).step(0.01).name("Vignette Weight");
                    var fxaaFolder = defaultFolder.addFolder("FXAA");
                    fxaaFolder.open();
                    fxaaFolder.add(EDITOR.SceneFactory.DefaultPipeline, "fxaaEnabled").name("Enable FXAA");
                }
                // Standard
                var standardFolder = this._element.addFolder("Standard Rendering Pipeline");
                standardFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "standard").name("Enabled Standard Rendering Pipeline").onChange(function (result) {
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
                    var highLightFolder = standardFolder.addFolder("Bloom");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "BloomEnabled").name("Bloom Enabled");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "exposure").min(0).max(10).step(0.01).name("Exposure");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "brightThreshold").min(0).max(10).step(0.01).name("Bright Threshold");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "blurWidth").min(0).max(512).step(0.01).name("Blur Width");
                    highLightFolder.add(EDITOR.SceneFactory.StandardPipeline, "horizontalBlur").name("Horizontal Blur");
                    this.addTextureFolder(EDITOR.SceneFactory.StandardPipeline, "Lens Dirt Texture", "lensTexture", highLightFolder).open();
                    highLightFolder.open();
                    var vlsFolder = standardFolder.addFolder("Volumetric Lights");
                    vlsFolder.add(EDITOR.SceneFactory.StandardPipeline, "VLSEnabled").name("VLS Enabled").onChange(function (result) {
                        if (result)
                            _this._setVLSAttachedSourceLight();
                        else
                            EDITOR.SceneFactory.StandardPipeline.VLSEnabled = result;
                    });
                    vlsFolder.add(EDITOR.SceneFactory.StandardPipeline, "volumetricLightCoefficient").min(0).max(1).step(0.01).name("Scattering Coefficient");
                    vlsFolder.add(EDITOR.SceneFactory.StandardPipeline, "volumetricLightPower").min(0).max(10).step(0.01).name("Scattering Power");
                    vlsFolder.add(EDITOR.SceneFactory.StandardPipeline, "volumetricLightBlurScale").min(0).max(64).step(1).name("Blur scale");
                    vlsFolder.open();
                    var lensFolder = standardFolder.addFolder("Lens Flare");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "LensFlareEnabled").name("Lens Flare Enabled");
                    lensFolder.add(EDITOR.SceneFactory.StandardPipeline, "lensFlareStrength").min(0).max(100).step(0.01).name("Strength");
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
                    dofFolder.add(EDITOR.SceneFactory.StandardPipeline, "depthOfFieldDistance").min(0).max(1).step(0.01).name("DOF Distance");
                    dofFolder.add(EDITOR.SceneFactory.StandardPipeline, "depthOfFieldBlurWidth").min(0).max(64).name("Blur Width");
                    dofFolder.open();
                    var motionBlurFolder = standardFolder.addFolder("Motion Blur");
                    motionBlurFolder.add(EDITOR.SceneFactory.StandardPipeline, "MotionBlurEnabled").name("Enable Motion Blur");
                    motionBlurFolder.add(EDITOR.SceneFactory.StandardPipeline, "motionBlurSamples").min(1).max(64).step(1).name("Samples Count");
                    motionBlurFolder.add(EDITOR.SceneFactory.StandardPipeline, "motionStrength").min(0).step(0.01).name("Strength");
                    motionBlurFolder.open();
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
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "area").min(0).max(1).step(0.0001).name("Area");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "radius").min(0).max(1).step(0.00001).name("Radius");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "fallOff").min(0).step(0.000001).name("Fall Off");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "base").min(0).max(10).step(0.001).name("Base");
                    var debugFolder = ssaoFolder.addFolder("Debug");
                    this._setupDebugPipeline(debugFolder, EDITOR.SceneFactory.SSAOPipeline);
                }
                // SSAO2
                var ssao2Folder = this._element.addFolder("SSAO 2");
                ssao2Folder.add(EDITOR.SceneFactory.EnabledPostProcesses, "ssao2").name("Enable SSAO 2").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.SSAOPipeline2 = EDITOR.SceneFactory.CreateSSAO2Pipeline(_this._editionTool.core);
                    else {
                        EDITOR.SceneFactory.SSAOPipeline2.dispose();
                        EDITOR.SceneFactory.SSAOPipeline2 = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.SSAOPipeline2) {
                    ssao2Folder.add(EDITOR.SceneFactory.SSAOPipeline2, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                    ssao2Folder.add(EDITOR.SceneFactory.SSAOPipeline2, "radius").min(0).max(10).step(0.01).name("Radius");
                    ssao2Folder.add(EDITOR.SceneFactory.SSAOPipeline2, "base").min(0).max(10).step(0.001).name("Base");
                    ssao2Folder.add(EDITOR.SceneFactory.SSAOPipeline2, "samples").min(1).max(64).step(1).name("Samples");
                    ssao2Folder.add(EDITOR.SceneFactory.SSAOPipeline2, "expensiveBlur").name("Expensive Blur");
                    ssao2Folder.add(EDITOR.SceneFactory.SSAOPipeline2, "minZAspect").min(0).step(0.01).name("Min Z Aspect");
                    ssao2Folder.add(EDITOR.SceneFactory.SSAOPipeline2, "maxZ").min(0).step(0.01).name("Max Z");
                    var debugFolder = ssao2Folder.addFolder("Debug");
                    this._setupDebugPipeline(debugFolder, EDITOR.SceneFactory.SSAOPipeline2);
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
            // Set up attached standard source light
            PostProcessesTool.prototype._setVLSAttachedSourceLight = function () {
                var _this = this;
                var scene = this._editionTool.core.currentScene;
                var objects = [];
                for (var i = 0; i < scene.lights.length; i++) {
                    var light = scene.lights[i];
                    if ((light instanceof BABYLON.SpotLight || light instanceof BABYLON.DirectionalLight) && light.getShadowGenerator())
                        objects.push(light);
                }
                var picker = new EDITOR.ObjectPicker(this._editionTool.core);
                picker.objectLists.push(objects);
                picker.minSelectCount = 0;
                picker.onObjectPicked = function (names) {
                    var node = null;
                    if (names.length > 0)
                        node = _this._editionTool.core.currentScene.getNodeByName(names[0]);
                    EDITOR.SceneFactory.StandardPipeline.sourceLight = node;
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
            PostProcessesTool.prototype._getPipelineCameras = function () {
                var cameras = [this._editionTool.core.camera];
                if (this._editionTool.core.playCamera)
                    cameras.push(this._editionTool.core.playCamera);
                return cameras;
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
