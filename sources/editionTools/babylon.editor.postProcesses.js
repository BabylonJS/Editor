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
                this._enabledPostProcesses = null;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-POSTPROCESSES"
                ];
                this._enabledPostProcesses = {
                    hdr: false,
                    attachHDR: true,
                    ssao: false,
                    ssaoOnly: false,
                    attachSSAO: true,
                };
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
                this._enabledPostProcesses.hdr = EDITOR.SceneFactory.hdrPipeline !== null;
                this._enabledPostProcesses.ssao = EDITOR.SceneFactory.ssaoPipeline !== null;
                // HDR
                var hdrFolder = this._element.addFolder("HDR");
                hdrFolder.add(this._enabledPostProcesses, "hdr").name("Enabled HDR").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.CreateHDRPipeline(_this._editionTool.core);
                    else {
                        EDITOR.SceneFactory.hdrPipeline.dispose();
                        EDITOR.SceneFactory.hdrPipeline = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.hdrPipeline) {
                    hdrFolder.add(this._enabledPostProcesses, "attachHDR").name("Attach HDR").onChange(function (result) {
                        _this._attachDetachPipeline(result, "hdr");
                    });
                    hdrFolder.add(EDITOR.SceneFactory.hdrPipeline._originalPostProcess, "_exposureAdjustment").min(0).max(10).name("Exposure Adjustment");
                    hdrFolder.add(EDITOR.SceneFactory.hdrPipeline, "exposure").min(0).max(10).step(0.01).name("Exposure");
                    hdrFolder.add(EDITOR.SceneFactory.hdrPipeline, "brightThreshold").min(0).max(10).step(0.01).name("Bright Threshold");
                    hdrFolder.add(EDITOR.SceneFactory.hdrPipeline, "minimumLuminance").min(0).max(10).step(0.01).name("Minimum Luminance");
                    hdrFolder.add(EDITOR.SceneFactory.hdrPipeline, "luminanceDecreaseRate").min(0).max(5).step(0.01).name("Luminance Decrease Rate");
                    hdrFolder.add(EDITOR.SceneFactory.hdrPipeline, "luminanceIncreaserate").min(0).max(5).step(0.01).name("Luminance Increase Rate");
                    hdrFolder.add(EDITOR.SceneFactory.hdrPipeline, "gaussCoeff").min(0).max(10).step(0.01).name("Gaussian Coefficient").onChange(function (result) {
                        EDITOR.SceneFactory.hdrPipeline.update();
                    });
                    hdrFolder.add(EDITOR.SceneFactory.hdrPipeline, "gaussMean").min(0).max(30).step(0.01).name("Gaussian Mean").onChange(function (result) {
                        EDITOR.SceneFactory.hdrPipeline.update();
                    });
                    hdrFolder.add(EDITOR.SceneFactory.hdrPipeline, "gaussStandDev").min(0).max(30).step(0.01).name("Gaussian Standard Deviation").onChange(function (result) {
                        EDITOR.SceneFactory.hdrPipeline.update();
                    });
                    hdrFolder.add(EDITOR.SceneFactory.hdrPipeline, "gaussMultiplier").min(0).max(30).step(0.01).name("Gaussian Multiplier");
                }
                // SSAO
                var ssaoFolder = this._element.addFolder("SSAO");
                ssaoFolder.add(this._enabledPostProcesses, "ssao").name("Enable SSAO").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.ssaoPipeline = EDITOR.SceneFactory.CreateSSAOPipeline(_this._editionTool.core);
                    else {
                        EDITOR.SceneFactory.ssaoPipeline.dispose();
                        EDITOR.SceneFactory.ssaoPipeline = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.ssaoPipeline) {
                    ssaoFolder.add(this._enabledPostProcesses, "ssaoOnly").name("SSAO Only").onChange(function (result) {
                        _this._ssaoOnly(result);
                    });
                    ssaoFolder.add(this._enabledPostProcesses, "attachSSAO").name("Attach SSAO").onChange(function (result) {
                        _this._attachDetachPipeline(result, "ssao");
                    });
                    ssaoFolder.add(EDITOR.SceneFactory.ssaoPipeline, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                    ssaoFolder.add(EDITOR.SceneFactory.ssaoPipeline, "area").min(0).max(1).step(0.0001).name("Area");
                    ssaoFolder.add(EDITOR.SceneFactory.ssaoPipeline, "radius").min(0).max(1).step(0.00001).name("Radius");
                    ssaoFolder.add(EDITOR.SceneFactory.ssaoPipeline, "fallOff").min(0).step(0.00001).name("Fall Off");
                    ssaoFolder.add(EDITOR.SceneFactory.ssaoPipeline, "base").min(0).max(1).step(0.001).name("Base");
                    var hBlurFolder = ssaoFolder.addFolder("Horizontal Blur");
                    hBlurFolder.add(EDITOR.SceneFactory.ssaoPipeline.getBlurHPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                    hBlurFolder.add(EDITOR.SceneFactory.ssaoPipeline.getBlurHPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                    hBlurFolder.add(EDITOR.SceneFactory.ssaoPipeline.getBlurHPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
                    var vBlurFolder = ssaoFolder.addFolder("Vertical Blur");
                    vBlurFolder.add(EDITOR.SceneFactory.ssaoPipeline.getBlurVPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                    vBlurFolder.add(EDITOR.SceneFactory.ssaoPipeline.getBlurVPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                    vBlurFolder.add(EDITOR.SceneFactory.ssaoPipeline.getBlurVPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
                }
            };
            // Draws SSAO only
            PostProcessesTool.prototype._ssaoOnly = function (result) {
                if (result)
                    EDITOR.SceneFactory.ssaoPipeline._disableEffect(EDITOR.SceneFactory.ssaoPipeline.SSAOCombineRenderEffect, this._getPipelineCameras());
                else
                    EDITOR.SceneFactory.ssaoPipeline._enableEffect(EDITOR.SceneFactory.ssaoPipeline.SSAOCombineRenderEffect, this._getPipelineCameras());
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