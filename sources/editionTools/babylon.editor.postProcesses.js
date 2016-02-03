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
            // Private members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function PostProcessesTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "POSTPROCESSES.TAB";
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
                    return;
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
                    ssaoFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "ssaoOnly").name("SSAO Only").onChange(function (result) {
                        _this._ssaoOnly(result);
                    });
                    ssaoFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "attachSSAO").name("Attach SSAO").onChange(function (result) {
                        _this._attachDetachPipeline(result, "ssao");
                    });
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "area").min(0).max(1).step(0.0001).name("Area");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "radius").min(0).max(1).step(0.00001).name("Radius");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "fallOff").min(0).step(0.00001).name("Fall Off");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "base").min(0).max(10).step(0.001).name("Base");
                    var hBlurFolder = ssaoFolder.addFolder("Horizontal Blur");
                    hBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurHPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                    hBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurHPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                    hBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurHPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
                    var vBlurFolder = ssaoFolder.addFolder("Vertical Blur");
                    vBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurVPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                    vBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurVPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                    vBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurVPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
                }
            };
            // Draws SSAO only
            PostProcessesTool.prototype._ssaoOnly = function (result) {
                if (result)
                    EDITOR.SceneFactory.SSAOPipeline._disableEffect(EDITOR.SceneFactory.SSAOPipeline.SSAOCombineRenderEffect, this._getPipelineCameras());
                else
                    EDITOR.SceneFactory.SSAOPipeline._enableEffect(EDITOR.SceneFactory.SSAOPipeline.SSAOCombineRenderEffect, this._getPipelineCameras());
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
            return PostProcessesTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.PostProcessesTool = PostProcessesTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.postProcesses.js.map