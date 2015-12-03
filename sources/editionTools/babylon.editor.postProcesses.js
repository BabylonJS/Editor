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
                this._hdrPipeline = null;
                this._ssaoPipeline = null;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-POSTPROCESSES"
                ];
                this._enabledPostProcesses = {
                    hdr: false,
                    ssao: false,
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
                // HDR
                var hdrFolder = this._element.addFolder("HDR");
                hdrFolder.add(this._enabledPostProcesses, "hdr").name("Enabled HDR").onChange(function (result) {
                    if (result === true)
                        _this._hdrPipeline = EDITOR.SceneFactory.CreateHDRPipeline(_this._editionTool.core);
                    else
                        _this._hdrPipeline.dispose();
                    _this.update();
                });
                if (this._enabledPostProcesses.hdr) {
                    hdrFolder.add(this._hdrPipeline, 'exposure').min(0).max(10).step(0.01).name("Exposure");
                    hdrFolder.add(this._hdrPipeline, 'brightThreshold').min(0).max(10).step(0.01).name("Bright Threshold");
                    hdrFolder.add(this._hdrPipeline, 'minimumLuminance').min(0).max(10).step(0.01).name("Minimum Luminance");
                    hdrFolder.add(this._hdrPipeline, 'luminanceDecreaseRate').min(0).max(5).step(0.01).name("Luminance Decrease Rate");
                    hdrFolder.add(this._hdrPipeline, 'luminanceIncreaserate').min(0).max(1).step(0.01).name("Luminance Increase Rate");
                    hdrFolder.add(this._hdrPipeline, 'gaussCoeff').min(0).max(10).step(0.01).name("Gaussian Coefficient").onChange(function (result) {
                        _this._hdrPipeline.update();
                    });
                    hdrFolder.add(this._hdrPipeline, 'gaussMean').min(0).max(30).step(0.01).name("Gaussian Mean").onChange(function (result) {
                        _this._hdrPipeline.update();
                    });
                    hdrFolder.add(this._hdrPipeline, 'gaussStandDev').min(0).max(30).step(0.01).name("Gaussian Standard Deviation").onChange(function (result) {
                        _this._hdrPipeline.update();
                    });
                    hdrFolder.add(this._hdrPipeline, 'gaussMultiplier').min(0).max(30).step(0.01).name("Gaussian Multiplier");
                }
                // SSAO
                var ssaoFolder = this._element.addFolder("SSAO");
                ssaoFolder.add(this._enabledPostProcesses, "ssao").name("Enable SSAO").onChange(function (result) {
                    if (result === true)
                        _this._ssaoPipeline = EDITOR.SceneFactory.CreateSSAOPipeline(_this._editionTool.core);
                    else
                        _this._ssaoPipeline.dispose();
                    _this.update();
                });
                if (this._enabledPostProcesses.ssao) {
                    ssaoFolder.add(this._ssaoPipeline, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                    ssaoFolder.add(this._ssaoPipeline, "area").min(0).max(1).step(0.001).name("Area");
                    ssaoFolder.add(this._ssaoPipeline, "radius").min(0).max(1).step(0.001).name("Radius");
                    ssaoFolder.add(this._ssaoPipeline, "fallOff").min(0).step(0.00001).name("Fall Off");
                    ssaoFolder.add(this._ssaoPipeline, "base").min(0).max(1).step(0.001).name("Base");
                    var hBlurFolder = ssaoFolder.addFolder("Horizontal Blur");
                    hBlurFolder.add(this._ssaoPipeline.getBlurHPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                    hBlurFolder.add(this._ssaoPipeline.getBlurHPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                    hBlurFolder.add(this._ssaoPipeline.getBlurHPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
                    var vBlurFolder = ssaoFolder.addFolder("Vertical Blur");
                    vBlurFolder.add(this._ssaoPipeline.getBlurVPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                    vBlurFolder.add(this._ssaoPipeline.getBlurVPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                    vBlurFolder.add(this._ssaoPipeline.getBlurVPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
                }
            };
            return PostProcessesTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.PostProcessesTool = PostProcessesTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.postProcesses.js.map