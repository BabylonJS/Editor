import { Nullable } from "../../../shared/types";

import { Scene, DepthOfFieldEffectBlurLevel } from "babylonjs";
import { GUI } from "dat.gui";

import { SceneSettings } from "../scene/settings";

import { Inspector } from "../components/inspector";
import { AbstractInspectorLegacy } from "./abstract-inspector-legacy";

export class RenderingInspector extends AbstractInspectorLegacy<Scene> {
    private _ssrEnabled: boolean = false;
    private _ssaoEnabled: boolean = false;
    private _defaultEnabled: boolean = false;
    private _motionBlurEnabled: boolean = false;

    private _ssaoFolder: Nullable<GUI> = null;
    private _defaultFolder: Nullable<GUI> = null;
    private _motionBlurFolder: Nullable<GUI> = null;
    private _screenSpaceReflectionsFolder: Nullable<GUI> = null;

    private _dofBlurLevel: string = "";

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addSSAO();
        this.addMotionBlur();
        this.addScreenSpaceReflections();
        this.addDefault();
    }

    /**
     * Adds the SSAO editable properties.
     */
    protected addSSAO(): void {
        if (!SceneSettings.SSAOPipeline) { return; }

        this._ssaoFolder = this._ssaoFolder ?? this.tool!.addFolder("SSAO");
        this._ssaoFolder.open();

        this._ssaoEnabled = SceneSettings.IsSSAOEnabled();
        this._ssaoFolder.add(this, "_ssaoEnabled").name("Enabled").onChange(() => {
            SceneSettings.SetSSAOEnabled(this.editor, this._ssaoEnabled);
            this.clearFolder(this._ssaoFolder!);
            this.addSSAO();
        });

        if (!this._ssaoEnabled) { return; }

        this._ssaoFolder.add(SceneSettings.SSAOPipeline, "radius").step(0.01).name("Radius");
        this._ssaoFolder.add(SceneSettings.SSAOPipeline, "totalStrength").step(0.01).name("Strength");
        this._ssaoFolder.add(SceneSettings.SSAOPipeline, "expensiveBlur").name("Use Expansive Blur");
        this._ssaoFolder.add(SceneSettings.SSAOPipeline, "samples").min(1).step(1).max(32).name("Samples");
        this._ssaoFolder.add(SceneSettings.SSAOPipeline, "maxZ").min(0).step(0.1).name("Max Z");
    }

    /**
     * Adds the standard editable properties.
     */
    protected addMotionBlur(): void {
        this._motionBlurFolder = this._motionBlurFolder ?? this.tool!.addFolder("Motion Blur");
        this._motionBlurFolder.open();

        this._motionBlurEnabled = SceneSettings.IsMotionBlurEnabled();
        this._motionBlurFolder.add(this, "_motionBlurEnabled").name("Enabled").onChange(() => {
            SceneSettings.SetMotionBlurEnabled(this.editor, this._motionBlurEnabled);
            this.clearFolder(this._motionBlurFolder!);
            this.addMotionBlur();
        });

        if (!this._motionBlurEnabled || !SceneSettings.MotionBlurPostProcess) { return; }

        this._motionBlurFolder.add(SceneSettings.MotionBlurPostProcess!, "motionBlurSamples").min(1).max(64).step(1).name("Samples Count");
        this._motionBlurFolder.add(SceneSettings.MotionBlurPostProcess!, "motionStrength").min(0).step(0.01).name("Strength");
        this._motionBlurFolder.add(SceneSettings.MotionBlurPostProcess!, "isObjectBased").name("Is Object Based");
    }

    /**
     * Adds the screen space reflections editable properties.
     */
    protected addScreenSpaceReflections(): void {
        this._screenSpaceReflectionsFolder = this._screenSpaceReflectionsFolder ?? this.tool!.addFolder("Screen Space Reflections");
        this._screenSpaceReflectionsFolder.open();

        this._ssrEnabled = SceneSettings.IsScreenSpaceReflectionsEnabled();
        this._screenSpaceReflectionsFolder.add(this, "_ssrEnabled").name("Enabled").onChange(() => {
            SceneSettings.SetScreenSpaceReflectionsEnabled(this.editor, this._ssrEnabled);
            this.clearFolder(this._screenSpaceReflectionsFolder!);
            this.addScreenSpaceReflections();
        });

        if (!this._ssrEnabled || !SceneSettings.ScreenSpaceReflectionsPostProcess) { return; }

        this._screenSpaceReflectionsFolder.add(SceneSettings.ScreenSpaceReflectionsPostProcess, "strength").name("Reflection Strength");
        this._screenSpaceReflectionsFolder.add(SceneSettings.ScreenSpaceReflectionsPostProcess, "threshold").name("Reflection Threshold");
        this._screenSpaceReflectionsFolder.add(SceneSettings.ScreenSpaceReflectionsPostProcess, "step").step(0.001).name("Step");
        this._screenSpaceReflectionsFolder.add(SceneSettings.ScreenSpaceReflectionsPostProcess, "reflectionSpecularFalloffExponent").name("Specular Fall Off Exponent");
        this._screenSpaceReflectionsFolder.add(SceneSettings.ScreenSpaceReflectionsPostProcess, "reflectionSamples").min(1).max(512).step(1).name("Reflection Samples");
        this._screenSpaceReflectionsFolder.add(SceneSettings.ScreenSpaceReflectionsPostProcess, "enableSmoothReflections").name("Enable Smoothing Reflections");
        this._screenSpaceReflectionsFolder.add(SceneSettings.ScreenSpaceReflectionsPostProcess, "smoothSteps").min(1).max(32).name("Smooth steps");
        this._screenSpaceReflectionsFolder.add(SceneSettings.ScreenSpaceReflectionsPostProcess, "roughnessFactor").min(0).max(10).name("Roughness Factor");
    }

    /**
     * Adds the default editable properties.
     */
    protected addDefault(): void {
        if (!SceneSettings.DefaultPipeline) { return; }

        this._defaultFolder = this._defaultFolder ?? this.tool!.addFolder("Default");
        this._defaultFolder.open();

        this._defaultEnabled = SceneSettings.IsDefaultPipelineEnabled();
        this._defaultFolder.add(this, "_defaultEnabled").name("Enabled").onChange(() => {
            SceneSettings.SetDefaultPipelineEnabled(this.editor, this._defaultEnabled);
            this.clearFolder(this._defaultFolder!);
            this.addDefault();
        });

        if (!this._defaultEnabled) { return; }

        const antialias = this._defaultFolder.addFolder("Anti Aliasing");
        antialias.open();
        antialias.add(SceneSettings.DefaultPipeline, "samples").min(1).max(32).step(1).name("Multisample Anti-Aliasing");
        antialias.add(SceneSettings.DefaultPipeline, "fxaaEnabled").name("FXAA");
        
        const imageProcessing = this._defaultFolder.addFolder("Image Processing");
        imageProcessing.open();
        imageProcessing.add(SceneSettings.DefaultPipeline, "imageProcessingEnabled").name("Image Processing Enabled").onChange(() => {
            this.clearFolder(this._defaultFolder!);
            this.addDefault();
        });

        if (SceneSettings.DefaultPipeline.imageProcessing) {
            imageProcessing.add(SceneSettings.DefaultPipeline.imageProcessing, "toneMappingEnabled").name("Tone Mapping");
            imageProcessing.add(SceneSettings.DefaultPipeline.imageProcessing, "exposure").min(0).step(0.01).name("Exposure");
            imageProcessing.add(SceneSettings.DefaultPipeline.imageProcessing, "contrast").min(0).step(0.01).name("Contrast");
            imageProcessing.add(SceneSettings.DefaultPipeline.imageProcessing, "fromLinearSpace").name("From Linear Space");
            // imageProcessing.add(SceneSettings.DefaultPipeline.imageProcessing, "colorGradingEnabled").name("Color Grading Enabled");
        }
        
        const bloom = this._defaultFolder.addFolder("Bloom");
        bloom.open();
        bloom.add(SceneSettings.DefaultPipeline, "bloomEnabled").name("Bloom Enabled");
        bloom.add(SceneSettings.DefaultPipeline, "bloomKernel").min(1).max(512).name("Kernel");
        bloom.add(SceneSettings.DefaultPipeline, "bloomWeight").min(0).max(1).name("Weight");
        bloom.add(SceneSettings.DefaultPipeline, "bloomThreshold").min(0).max(1).name("Threshold");
        bloom.add(SceneSettings.DefaultPipeline, "bloomScale").min(0).max(1).name("Scale");

        const sharpen = this._defaultFolder.addFolder("Sharpen");
        sharpen.open();
        sharpen.add(SceneSettings.DefaultPipeline, "sharpenEnabled").name("Sharpen Enabled");
        sharpen.add(SceneSettings.DefaultPipeline.sharpen, "edgeAmount").step(0.01).min(0).max(2).name("Edge Amount");
        sharpen.add(SceneSettings.DefaultPipeline.sharpen, "colorAmount").step(0.01).min(0).max(1).name("Color Amount");

        const dof = this._defaultFolder.addFolder("Depth Of Field");
        dof.open();
        dof.add(SceneSettings.DefaultPipeline, "depthOfFieldEnabled").name("Depth Of Field Enabled").onChange(() => {
            this.clearFolder(this._defaultFolder!);
            this.addDefault();
        });
        dof.add(SceneSettings.DefaultPipeline.depthOfField, "focusDistance").min(0).step(1).max(this.editor.scene!.activeCamera!.maxZ * 5).name("Focus Distance");
        dof.add(SceneSettings.DefaultPipeline.depthOfField, "fStop").min(1).max(10).name("F-Stop");
        dof.add(SceneSettings.DefaultPipeline.depthOfField, "focalLength").min(1).max(300).name("Focal Length");

        const blurLevels: string[] = ["Low", "Medium", "High"];
        this._dofBlurLevel = blurLevels.find((l) => SceneSettings.DefaultPipeline!.depthOfFieldBlurLevel === DepthOfFieldEffectBlurLevel[l]) ?? "Low";
        dof.add(this, "_dofBlurLevel", blurLevels).name("Blur Level").onChange(() => {
            SceneSettings.DefaultPipeline!.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel[this._dofBlurLevel];
            this.clearFolder(this._defaultFolder!);
            this.addDefault();
        });

        const ca = this._defaultFolder.addFolder("Chromatic Aberration");
        ca.open();
        ca.add(SceneSettings.DefaultPipeline, "chromaticAberrationEnabled").name("Chromatic Aberration Enabled");
        ca.add(SceneSettings.DefaultPipeline.chromaticAberration, "aberrationAmount").step(0.01).name("Aberration Amount");
        ca.add(SceneSettings.DefaultPipeline.chromaticAberration, "radialIntensity").step(0.01).name("Radial Intensity");
        ca.addVector("Direction", SceneSettings.DefaultPipeline.chromaticAberration.direction);
        ca.addVector("Center Position", SceneSettings.DefaultPipeline.chromaticAberration.centerPosition);
    }
}

Inspector.RegisterObjectInspector({
    ctor: RenderingInspector,
    ctorNames: ["Scene"],
    title: "Rendering",
});
