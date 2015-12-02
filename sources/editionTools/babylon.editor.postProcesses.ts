module BABYLON.EDITOR {
    interface IEnabledPostProcesses {
        hdr: boolean;
        ssao: boolean;
    }

    export class PostProcessesTool extends AbstractTool {
        // Public members
        public tab: string = "POSTPROCESSES.TAB";

        // Private members
        private _element: GUI.GUIEditForm;
        private _enabledPostProcesses: IEnabledPostProcesses = null;

        private _hdrPipeline: HDRRenderingPipeline = null;
        private _ssaoPipeline: SSAORenderingPipeline = null;

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

            this._enabledPostProcesses = {
                hdr: false,
                ssao: false,
            }
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
        public update(): void {
            var object: Scene = this.object = this._editionTool.object;

            if (this._element) {
                this._element.remove();
                this._element = null;
            }

            if (!object)
                return;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // HDR
            var hdrFolder = this._element.addFolder("HDR");
            hdrFolder.add(this._enabledPostProcesses, "hdr").name("Enabled HDR").onChange((result: any) => {
                if (result === true)
                    this._hdrPipeline = SceneFactory.CreateHDRPipeline(this._editionTool.core);
                else
                    this._hdrPipeline.dispose();
                this.update();
            });

            if (this._enabledPostProcesses.hdr) {
                hdrFolder.add(this._hdrPipeline, 'exposure').min(0).max(10).step(0.01).name("Exposure");
                hdrFolder.add(this._hdrPipeline, 'brightThreshold').min(0).max(10).step(0.01).name("Bright Threshold");
                hdrFolder.add(this._hdrPipeline, 'minimumLuminance').min(0).max(10).step(0.01).name("Minimum Luminance");
                hdrFolder.add(this._hdrPipeline, 'luminanceDecreaseRate').min(0).max(5).step(0.01).name("Luminance Decrease Rate");
                hdrFolder.add(this._hdrPipeline, 'luminanceIncreaserate').min(0).max(1).step(0.01).name("Luminance Increase Rate");
                hdrFolder.add(this._hdrPipeline, 'gaussCoeff').min(0).max(10).step(0.01).name("Gaussian Coefficient").onChange((result: any) => {
                    this._hdrPipeline.update();
                });
                hdrFolder.add(this._hdrPipeline, 'gaussMean').min(0).max(30).step(0.01).name("Gaussian Mean").onChange((result: any) => {
                    this._hdrPipeline.update();
                });
                hdrFolder.add(this._hdrPipeline, 'gaussStandDev').min(0).max(30).step(0.01).name("Gaussian Standard Deviation").onChange((result: any) => {
                    this._hdrPipeline.update();
                });
                hdrFolder.add(this._hdrPipeline, 'gaussMultiplier').min(0).max(30).step(0.01).name("Gaussian Multiplier");
            }

            // SSAO
            var ssaoFolder = this._element.addFolder("SSAO");
            ssaoFolder.add(this._enabledPostProcesses, "ssao").name("Enable SSAO").onChange((result: any) => {
                if (result === true)
                    this._ssaoPipeline = SceneFactory.CreateSSAOPipeline(this._editionTool.core);
                else
                    this._ssaoPipeline.dispose();
                this.update();
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
        }

        // Resize
        public resize(): void {
            this._element.width = this._editionTool.panel.width - 15;
        }
    }
}