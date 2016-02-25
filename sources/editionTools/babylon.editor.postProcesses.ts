module BABYLON.EDITOR {

    export class PostProcessesTool extends AbstractDatTool {
        // Public members
        public tab: string = "POSTPROCESSES.TAB";

        // Private members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-POSTPROCESSES"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Scene)
                return true;

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Post-Processes" });
        }

        // Update
        public update(): boolean {
            var object: Scene = this.object = this._editionTool.object;

            super.update();

            if (!object)
                return false;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // Ckeck checkboxes
            SceneFactory.EnabledPostProcesses.hdr = SceneFactory.HDRPipeline !== null;
            SceneFactory.EnabledPostProcesses.ssao = SceneFactory.SSAOPipeline !== null;

            // HDR
            var hdrFolder = this._element.addFolder("HDR");
            hdrFolder.add(SceneFactory.EnabledPostProcesses, "hdr").name("Enabled HDR").onChange((result: any) => {
                if (result === true)
                    SceneFactory.CreateHDRPipeline(this._editionTool.core);
                else {
                    SceneFactory.HDRPipeline.dispose();
                    SceneFactory.HDRPipeline = null;
                }
                this.update();
            });

            if (SceneFactory.HDRPipeline) {
                hdrFolder.add(SceneFactory.EnabledPostProcesses, "attachHDR").name("Attach HDR").onChange((result: any) => {
                    this._attachDetachPipeline(result, "hdr");
                });

                hdrFolder.add(SceneFactory.HDRPipeline, "exposureAdjustment").min(0).max(10).name("Exposure Adjustment");
                hdrFolder.add(SceneFactory.HDRPipeline, "exposure").min(0).max(10).step(0.01).name("Exposure");
                hdrFolder.add(SceneFactory.HDRPipeline, "brightThreshold").min(0).max(10).step(0.01).name("Bright Threshold");
                hdrFolder.add(SceneFactory.HDRPipeline, "minimumLuminance").min(0).max(10).step(0.01).name("Minimum Luminance");
                hdrFolder.add(SceneFactory.HDRPipeline, "luminanceDecreaseRate").min(0).max(5).step(0.01).name("Luminance Decrease Rate");
                hdrFolder.add(SceneFactory.HDRPipeline, "luminanceIncreaserate").min(0).max(5).step(0.01).name("Luminance Increase Rate");
                hdrFolder.add(SceneFactory.HDRPipeline, "gaussCoeff").min(0).max(10).step(0.01).name("Gaussian Coefficient").onChange((result: any) => {
                    SceneFactory.HDRPipeline.update();
                });
                hdrFolder.add(SceneFactory.HDRPipeline, "gaussMean").min(0).max(30).step(0.01).name("Gaussian Mean").onChange((result: any) => {
                    SceneFactory.HDRPipeline.update();
                });
                hdrFolder.add(SceneFactory.HDRPipeline, "gaussStandDev").min(0).max(30).step(0.01).name("Gaussian Standard Deviation").onChange((result: any) => {
                    SceneFactory.HDRPipeline.update();
                });
                hdrFolder.add(SceneFactory.HDRPipeline, "gaussMultiplier").min(0).max(30).step(0.01).name("Gaussian Multiplier");
                hdrFolder.add(SceneFactory.HDRPipeline, "lensDirtPower").min(0).max(30).step(0.01).name("Lens Dirt Power");
                hdrFolder.add(this, "_loadHDRLensDirtTexture").name("Load Dirt Texture ...");
            }

            // SSAO
            var ssaoFolder = this._element.addFolder("SSAO");
            ssaoFolder.add(SceneFactory.EnabledPostProcesses, "ssao").name("Enable SSAO").onChange((result: any) => {
                if (result === true)
                    SceneFactory.SSAOPipeline = SceneFactory.CreateSSAOPipeline(this._editionTool.core);
                else {
                    SceneFactory.SSAOPipeline.dispose();
                    SceneFactory.SSAOPipeline = null;
                }
                this.update();
            });

            if (SceneFactory.SSAOPipeline) {
                ssaoFolder.add(SceneFactory.EnabledPostProcesses, "ssaoOnly").name("SSAO Only").onChange((result: any) => {
                    this._ssaoOnly(result);
                });

                ssaoFolder.add(SceneFactory.EnabledPostProcesses, "attachSSAO").name("Attach SSAO").onChange((result: any) => {
                    this._attachDetachPipeline(result, "ssao");
                });

                ssaoFolder.add(SceneFactory.SSAOPipeline, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                ssaoFolder.add(SceneFactory.SSAOPipeline, "area").min(0).max(1).step(0.0001).name("Area");
                ssaoFolder.add(SceneFactory.SSAOPipeline, "radius").min(0).max(1).step(0.00001).name("Radius");
                ssaoFolder.add(SceneFactory.SSAOPipeline, "fallOff").min(0).step(0.00001).name("Fall Off");
                ssaoFolder.add(SceneFactory.SSAOPipeline, "base").min(0).max(10).step(0.001).name("Base");

                var hBlurFolder = ssaoFolder.addFolder("Horizontal Blur");
                hBlurFolder.add(SceneFactory.SSAOPipeline.getBlurHPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                hBlurFolder.add(SceneFactory.SSAOPipeline.getBlurHPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                hBlurFolder.add(SceneFactory.SSAOPipeline.getBlurHPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");

                var vBlurFolder = ssaoFolder.addFolder("Vertical Blur");
                vBlurFolder.add(SceneFactory.SSAOPipeline.getBlurVPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                vBlurFolder.add(SceneFactory.SSAOPipeline.getBlurVPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                vBlurFolder.add(SceneFactory.SSAOPipeline.getBlurVPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
            }

            return true;
        }

        // Draws SSAO only
        private _ssaoOnly(result: boolean): void {
            if (result)
                SceneFactory.SSAOPipeline._disableEffect(SceneFactory.SSAOPipeline.SSAOCombineRenderEffect, this._getPipelineCameras());
            else
                SceneFactory.SSAOPipeline._enableEffect(SceneFactory.SSAOPipeline.SSAOCombineRenderEffect, this._getPipelineCameras());
        }

        // Attach/detach pipeline
        private _attachDetachPipeline(attach: boolean, pipeline: string): void {
            if (attach)
                this._editionTool.core.currentScene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(pipeline, this._getPipelineCameras());
            else
                this._editionTool.core.currentScene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(pipeline, this._getPipelineCameras());
        }

        private _getPipelineCameras(): Camera[] {
            var cameras: Camera[] = [this._editionTool.core.camera];
            if (this._editionTool.core.playCamera)
                cameras.push(this._editionTool.core.playCamera);

            return cameras;
        }

        // Creates a function to change texture of a flare
        private _loadHDRLensDirtTexture(): void {
            var input = Tools.CreateFileInpuElement("HDR-LENS-DIRT-LOAD-TEXTURE");

            input.change((data: any) => {
                var files: File[] = data.target.files || data.currentTarget.files;

                if (files.length < 1)
                    return;

                var file = files[0];
                BABYLON.Tools.ReadFileAsDataURL(file, (result: string) => {
                    var texture = Texture.CreateFromBase64String(result, file.name, this._editionTool.core.currentScene);
                    texture.name = texture.name.replace("data:", "");

                    SceneFactory.HDRPipeline.lensTexture = texture;
                    input.remove();
                }, null);
            });

            input.click();
        }
    }
}