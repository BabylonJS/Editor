module BABYLON.EDITOR {

    export class PostProcessesTool extends AbstractDatTool {
        // Public members
        public tab: string = "POSTPROCESSES.TAB";

        // Private members
        private _renderEffects: { } = { };
        private _defaultVignetteMultiply: boolean = false;

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
            SceneFactory.EnabledPostProcesses.standard = SceneFactory.StandardPipeline !== null;
            SceneFactory.EnabledPostProcesses.ssao = SceneFactory.SSAOPipeline !== null;

            // Default
            var defaultFolder = this._element.addFolder("Default Rendering Pipeline");
            defaultFolder.add(SceneFactory.EnabledPostProcesses, "default").name("Enable Default Rendering Pipeline").onChange((result: any) => {
                if (result === true)
                    SceneFactory.CreateDefaultPipeline(this._editionTool.core);
                else {
                    SceneFactory.DefaultPipeline.dispose();
                    SceneFactory.DefaultPipeline = null;
                }

                this.update();
            });

            if (SceneFactory.DefaultPipeline) {
                var bloomFolder = defaultFolder.addFolder("Bloom");
                bloomFolder.open();
                bloomFolder.add(SceneFactory.DefaultPipeline, "bloomEnabled").name("Enable Bloom");
                bloomFolder.add(SceneFactory.DefaultPipeline, "bloomWeight").min(0).max(1).step(0.01).name("Bloom Weight").onChange(() => this.update());
                bloomFolder.add(SceneFactory.DefaultPipeline, "bloomKernel").min(0).step(1).name("Bloom Kernel");

                var imgProcessingFolder = defaultFolder.addFolder("Image Processing");
                imgProcessingFolder.open();
                imgProcessingFolder.add(SceneFactory.DefaultPipeline, "imageProcessingEnabled").name("Enable Image Processing");
                imgProcessingFolder.add(SceneFactory.DefaultPipeline.imageProcessing, "cameraToneMappingEnabled").name("Camera Tone Mapping");
                imgProcessingFolder.add(SceneFactory.DefaultPipeline.imageProcessing, "vignetteEnabled").name("Vignette");
                imgProcessingFolder.add(SceneFactory.DefaultPipeline.imageProcessing, "colorCurvesEnabled").name("Color Curves");
                imgProcessingFolder.add(SceneFactory.DefaultPipeline.imageProcessing, "cameraContrast").min(0).max(10).step(0.01).name("Camera Constrast");
                imgProcessingFolder.add(SceneFactory.DefaultPipeline.imageProcessing, "cameraExposure").min(0).max(10).step(0.01).name("Camera Exposure");
                
                this._defaultVignetteMultiply = SceneFactory.DefaultPipeline.imageProcessing.vignetteBlendMode === ImageProcessingPostProcess.VIGNETTEMODE_MULTIPLY;
                imgProcessingFolder.add(this, "_defaultVignetteMultiply").name("Vignette Multiply").onChange((result: boolean) => {
                    var blendMode = result ? ImageProcessingPostProcess.VIGNETTEMODE_MULTIPLY : ImageProcessingPostProcess.VIGNETTEMODE_OPAQUE;
                    SceneFactory.DefaultPipeline.imageProcessing.vignetteBlendMode = blendMode;
                });

                this.addColorFolder(SceneFactory.DefaultPipeline.imageProcessing.vignetteColor, "Vignette Color", true, imgProcessingFolder);
                imgProcessingFolder.add(SceneFactory.DefaultPipeline.imageProcessing, "vignetteWeight").min(0).max(10).step(0.01).name("Vignette Weight");

                var fxaaFolder = defaultFolder.addFolder("FXAA");
                fxaaFolder.open();
                fxaaFolder.add(SceneFactory.DefaultPipeline, "fxaaEnabled").name("Enable FXAA");
            }

            // Standard
            var standardFolder = this._element.addFolder("Standard Rendering Pipeline");
            standardFolder.add(SceneFactory.EnabledPostProcesses, "standard").name("Enabled Standard Rendering Pipeline").onChange((result: any) => {
                if (result === true)
                    SceneFactory.CreateStandardRenderingPipeline(this._editionTool.core, () => this.update());
                else {
                    SceneFactory.StandardPipeline.dispose();
                    SceneFactory.StandardPipeline = null;
                }

                this.update();
            });

            if (SceneFactory.StandardPipeline) {
                var animationsFolder = standardFolder.addFolder("Animations");
                animationsFolder.add(this, "_editAnimations").name("Edit Animations");

                var highLightFolder = standardFolder.addFolder("Highlighting");
                highLightFolder.add(SceneFactory.StandardPipeline, "exposure").min(0).max(10).step(0.01).name("Exposure");
                highLightFolder.add(SceneFactory.StandardPipeline, "brightThreshold").min(0).max(10).step(0.01).name("Bright Threshold");
                highLightFolder.add(SceneFactory.StandardPipeline, "gaussianCoefficient").min(0).max(10).step(0.01).name("Gaussian Coefficient");
                highLightFolder.add(SceneFactory.StandardPipeline, "gaussianMean").min(0).max(30).step(0.01).name("Gaussian Mean");
                highLightFolder.add(SceneFactory.StandardPipeline, "gaussianStandardDeviation").min(0).max(30).step(0.01).name("Gaussian Standard Deviation");
                highLightFolder.add(SceneFactory.StandardPipeline, "blurWidth").min(0).max(5).step(0.01).name("Blur Width");
                highLightFolder.add(SceneFactory.StandardPipeline, "horizontalBlur").name("Horizontal Blur");
                this.addTextureFolder(SceneFactory.StandardPipeline, "Lens Dirt Texture", "lensTexture", highLightFolder).open();
                highLightFolder.open();

                var lensFolder = standardFolder.addFolder("Lens Flare");
                lensFolder.add(SceneFactory.StandardPipeline, "LensFlareEnabled").name("Lens Flare Enabled");
                lensFolder.add(SceneFactory.StandardPipeline, "lensFlareStrength").min(0).max(100).step(0.01).name("Strength");
                lensFolder.add(SceneFactory.StandardPipeline, "lensFlareHaloWidth").min(0).max(2).step(0.01).name("Halo Width");
                lensFolder.add(SceneFactory.StandardPipeline, "lensFlareGhostDispersal").min(0).max(10).step(0.1).name("Ghost Dispersal");
                lensFolder.add(SceneFactory.StandardPipeline, "lensFlareDistortionStrength").min(0).max(500).step(0.1).name("Distortion Strength");
                this.addTextureFolder(SceneFactory.StandardPipeline, "Lens Flare Dirt Texture", "lensFlareDirtTexture", lensFolder).open();
                lensFolder.open();

                var hdrFolder = standardFolder.addFolder("HDR");
                hdrFolder.add(SceneFactory.StandardPipeline, "HDREnabled").name("HDR Enabled");
                hdrFolder.add(SceneFactory.StandardPipeline, "hdrMinimumLuminance").min(0).max(2).name("Minimum Luminance");
                hdrFolder.add(SceneFactory.StandardPipeline, "hdrDecreaseRate").min(0).max(2).name("Decrease Rate");
                hdrFolder.add(SceneFactory.StandardPipeline, "hdrIncreaseRate").min(0).max(2).name("Increase Rate");
                hdrFolder.open();

                var dofFolder = standardFolder.addFolder("Depth Of Field");
                dofFolder.add(SceneFactory.StandardPipeline, "DepthOfFieldEnabled").name("Enable Depth-Of-Field");
                dofFolder.add(SceneFactory.StandardPipeline, "depthOfFieldDistance").min(0).max(this._editionTool.core.currentScene.activeCamera.maxZ).name("DOF Distance");
                dofFolder.add(SceneFactory.StandardPipeline, "depthOfFieldBlurWidth").min(0).max(5).name("Blur Width");
                dofFolder.open();

                var motionBlurFolder = standardFolder.addFolder("Motion Blur");
                motionBlurFolder.add(SceneFactory.StandardPipeline, "MotionBlurEnabled").name("Enable Motion Blur");
                motionBlurFolder.add(SceneFactory.StandardPipeline, "motionBlurSamples").min(1).max(64).step(1).name("Samples Count");
                motionBlurFolder.add(SceneFactory.StandardPipeline, "motionStrength").min(0).step(0.01).name("Strength");
                motionBlurFolder.open();

                var debugFolder = standardFolder.addFolder("Debug");
                this._setupDebugPipeline(debugFolder, SceneFactory.StandardPipeline);
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
                ssaoFolder.add(SceneFactory.SSAOPipeline, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                ssaoFolder.add(SceneFactory.SSAOPipeline, "area").min(0).max(1).step(0.0001).name("Area");
                ssaoFolder.add(SceneFactory.SSAOPipeline, "radius").min(0).max(1).step(0.00001).name("Radius");
                ssaoFolder.add(SceneFactory.SSAOPipeline, "fallOff").min(0).step(0.000001).name("Fall Off");
                ssaoFolder.add(SceneFactory.SSAOPipeline, "base").min(0).max(10).step(0.001).name("Base");
                
                var debugFolder = ssaoFolder.addFolder("Debug");
                this._setupDebugPipeline(debugFolder, SceneFactory.SSAOPipeline);
            }

            // SSAO2
            var ssao2Folder = this._element.addFolder("SSAO 2");
            ssao2Folder.add(SceneFactory.EnabledPostProcesses, "ssao2").name("Enable SSAO 2").onChange((result: any) => {
                if (result === true)
                    SceneFactory.SSAOPipeline2 = SceneFactory.CreateSSAO2Pipeline(this._editionTool.core);
                else {
                    SceneFactory.SSAOPipeline2.dispose();
                    SceneFactory.SSAOPipeline2 = null;
                }
                this.update();
            });

            if (SceneFactory.SSAOPipeline2) {
                ssao2Folder.add(SceneFactory.SSAOPipeline2, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                ssao2Folder.add(SceneFactory.SSAOPipeline2, "radius").min(0).max(10).step(0.01).name("Radius");
                ssao2Folder.add(SceneFactory.SSAOPipeline2, "base").min(0).max(10).step(0.001).name("Base");
                ssao2Folder.add(SceneFactory.SSAOPipeline2, "samples").min(1).max(64).step(1).name("Samples");
                ssao2Folder.add(SceneFactory.SSAOPipeline2, "expensiveBlur").name("Expensive Blur");
                ssao2Folder.add(SceneFactory.SSAOPipeline2, "minZAspect").min(0).step(0.01).name("Min Z Aspect");
                ssao2Folder.add(SceneFactory.SSAOPipeline2, "maxZ").min(0).step(0.01).name("Max Z");
                
                var debugFolder = ssao2Folder.addFolder("Debug");
                this._setupDebugPipeline(debugFolder, SceneFactory.SSAOPipeline2);
            }
            
            // VLS
            var vlsFolder = this._element.addFolder("Volumetric Light Scattering");
            vlsFolder.add(SceneFactory.EnabledPostProcesses, "vls").name("Enable VLS").onChange((result: any) => {
                if (result === true) {
                    var picker = new ObjectPicker(this._editionTool.core);
                    picker.objectLists.push(this._editionTool.core.currentScene.meshes);
                    picker.minSelectCount = 0;
                    picker.closeButtonName = "Cancel";
                    picker.selectButtonName = "Add";
                    picker.windowName = "Select an emitter?";

                    picker.onObjectPicked = (names: string[]) => {
                        var mesh = <Mesh>this._editionTool.core.currentScene.getMeshByName(names[0]);
                        SceneFactory.VLSPostProcess = SceneFactory.CreateVLSPostProcess(this._editionTool.core, mesh);
                        this.update();
                    };

                    picker.open();
                }
                else {
                    SceneFactory.VLSPostProcess.dispose(this._editionTool.core.camera);
                    SceneFactory.VLSPostProcess = null;
                    this.update();
                }
            });

            if (SceneFactory.VLSPostProcess) {
                vlsFolder.add(SceneFactory.VLSPostProcess, "exposure").min(0).max(1).name("Exposure");
                vlsFolder.add(SceneFactory.VLSPostProcess, "decay").min(0).max(1).name("Decay");
                vlsFolder.add(SceneFactory.VLSPostProcess, "weight").min(0).max(1).name("Weight");
                vlsFolder.add(SceneFactory.VLSPostProcess, "density").min(0).max(1).name("Density");
                vlsFolder.add(SceneFactory.VLSPostProcess, "invert").name("Invert");
                vlsFolder.add(SceneFactory.VLSPostProcess, "useDiffuseColor").name("use Diffuse Color");

                vlsFolder.add(SceneFactory.VLSPostProcess, "useCustomMeshPosition").name("Use Custom Position");
                this.addVectorFolder(SceneFactory.VLSPostProcess.customMeshPosition, "Position", true, vlsFolder);
                vlsFolder.add(this, "_setVLSAttachedNode").name("Attach Node...");
            }

            return true;
        }

        // Set up attached node of VLS
        private _setVLSAttachedNode(): void {
            var picker = new ObjectPicker(this._editionTool.core);
            picker.objectLists.push(this._editionTool.core.currentScene.meshes);
            picker.objectLists.push(this._editionTool.core.currentScene.lights);
            picker.objectLists.push(this._editionTool.core.currentScene.cameras);
            picker.minSelectCount = 0;

            picker.onObjectPicked = (names: string[]) => {
                var node: any = null;
                if (names.length > 0)
                    node = this._editionTool.core.currentScene.getNodeByName(names[0]);

                SceneFactory.VLSPostProcess.attachedNode = node;
            };

            picker.open();
        }

        // Set up debug mode
        private _setupDebugPipeline(folder: dat.IFolderElement, pipeline: PostProcessRenderPipeline): void {
            var renderEffects = (<any>pipeline)._renderEffects;

            var configure = () => {
                for (var effectName in renderEffects) {
                    if (this._renderEffects[effectName] === true)
                        pipeline._enableEffect(effectName, this._getPipelineCameras());
                    else
                        pipeline._disableEffect(effectName, this._getPipelineCameras());
                }
            };
            
            for (var effectName in renderEffects) {
                var effect: PostProcessRenderEffect = renderEffects[effectName];

                if (!this._renderEffects[effectName])
                    this._renderEffects[effectName] = true;

                folder.add(this._renderEffects, effectName).onChange((result: any) => {
                    configure();
                });
            }
        }

        private _getPipelineCameras(): Camera[] {
            var cameras: Camera[] = [this._editionTool.core.camera];
            if (this._editionTool.core.playCamera)
                cameras.push(this._editionTool.core.playCamera);

            return cameras;
        }

        // Loads the animations tool
        private _editAnimations(): void {
            var animCreator = new GUIAnimationEditor(this._editionTool.core, SceneFactory.StandardPipeline);
        }
    }
}