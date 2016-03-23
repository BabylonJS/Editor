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
                _super.call(this, editionTool);
                // Public members
                this.tab = "POSTPROCESSES.TAB";
                // Private members
                this._renderEffects = {};
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-POSTPROCESSES"
                ];
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
                EDITOR.SceneFactory.EnabledPostProcesses.hdr = EDITOR.SceneFactory.HDRPipeline !== null;
                EDITOR.SceneFactory.EnabledPostProcesses.ssao = EDITOR.SceneFactory.SSAOPipeline !== null;
                // HDR
                var hdrFolder = this._element.addFolder("HDR");
                hdrFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "hdr").name("Enabled HDR").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.CreateHDRPipeline(_this._editionTool.core);
                    else {
                        EDITOR.SceneFactory.HDRPipeline.dispose();
                        EDITOR.SceneFactory.HDRPipeline = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.HDRPipeline) {
                    hdrFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "attachHDR").name("Attach HDR").onChange(function (result) {
                        _this._attachDetachPipeline(result, "hdr");
                    });
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "exposureAdjustment").min(0).max(10).name("Exposure Adjustment");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "exposure").min(0).max(10).step(0.01).name("Exposure");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "brightThreshold").min(0).max(10).step(0.01).name("Bright Threshold");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "minimumLuminance").min(0).max(10).step(0.01).name("Minimum Luminance");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "luminanceDecreaseRate").min(0).max(5).step(0.01).name("Luminance Decrease Rate");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "luminanceIncreaserate").min(0).max(5).step(0.01).name("Luminance Increase Rate");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "gaussCoeff").min(0).max(10).step(0.01).name("Gaussian Coefficient").onChange(function (result) {
                        EDITOR.SceneFactory.HDRPipeline.update();
                    });
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "gaussMean").min(0).max(30).step(0.01).name("Gaussian Mean").onChange(function (result) {
                        EDITOR.SceneFactory.HDRPipeline.update();
                    });
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "gaussStandDev").min(0).max(30).step(0.01).name("Gaussian Standard Deviation").onChange(function (result) {
                        EDITOR.SceneFactory.HDRPipeline.update();
                    });
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "gaussMultiplier").min(0).max(30).step(0.01).name("Gaussian Multiplier");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "lensDirtPower").min(0).max(30).step(0.01).name("Lens Dirt Power");
                    this.addTextureFolder(EDITOR.SceneFactory.HDRPipeline, "Lens Texture", "lensTexture", hdrFolder).open();
                    var debugFolder = hdrFolder.addFolder("Debug");
                    this._setupDebugPipeline(debugFolder, EDITOR.SceneFactory.HDRPipeline);
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
                    /*
                    var hBlurFolder = ssaoFolder.addFolder("Horizontal Blur");
                    hBlurFolder.add(SceneFactory.SSAOPipeline.getBlurHPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                    hBlurFolder.add(SceneFactory.SSAOPipeline.getBlurHPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                    hBlurFolder.add(SceneFactory.SSAOPipeline.getBlurHPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
    
                    var vBlurFolder = ssaoFolder.addFolder("Vertical Blur");
                    vBlurFolder.add(SceneFactory.SSAOPipeline.getBlurVPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                    vBlurFolder.add(SceneFactory.SSAOPipeline.getBlurVPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                    vBlurFolder.add(SceneFactory.SSAOPipeline.getBlurVPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
                    */
                    var debugFolder = ssaoFolder.addFolder("Debug");
                    this._setupDebugPipeline(debugFolder, EDITOR.SceneFactory.SSAOPipeline);
                }
                /**
                * VLS
                */
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
            return PostProcessesTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.PostProcessesTool = PostProcessesTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
