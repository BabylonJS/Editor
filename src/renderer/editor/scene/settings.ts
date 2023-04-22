import {
    Camera, ArcRotateCamera, Vector3, SSAO2RenderingPipeline, DefaultRenderingPipeline,
    SerializationHelper, PostProcessRenderPipeline, MotionBlurPostProcess, ScreenSpaceReflectionPostProcess,
    FreeCamera, Color4, Vector2, ColorCurves, ColorGradingTexture, SSRRenderingPipeline,
} from "babylonjs";
import { join } from "path";

import { Nullable } from "../../../shared/types";

import { Editor } from "../editor";

import { Tools } from "../tools/tools";

import { WorkSpace } from "../project/workspace";

import { EditorCamera } from "./editor-camera";

export class SceneSettings {
    /**
     * Defines the camera being used by the editor.
     */
    public static Camera: Nullable<ArcRotateCamera | EditorCamera> = null;
    /**
     * Defines the reference to the last used camera.
     */
    public static LastUsedCamera: Nullable<Camera> = null;

    /**
     * Defines the reference to the Screen Space Reflections rendering pipeline.
     */
    public static SSRPipeline: Nullable<SSRRenderingPipeline> = null;
    /**
     * Defines the reference to the SSAO rendering pipeline.
     */
    public static SSAOPipeline: Nullable<SSAO2RenderingPipeline> = null;
    /**
     * Defines the reference to the screen space reflections post-process.
     */
    public static ScreenSpaceReflectionsPostProcess: Nullable<ScreenSpaceReflectionPostProcess> = null;
    /**
     * Defines the reference to the default rendering pipeline.
     */
    public static DefaultPipeline: Nullable<DefaultRenderingPipeline> = null;
    /**
     * Defines the reference to the motion blur post-process.
     */
    public static MotionBlurPostProcess: Nullable<MotionBlurPostProcess> = null;

    private static _SSRPipelineEnabled: boolean = false;
    private static _SSAOPipelineEnabled: boolean = true;
    private static _ScreenSpaceReflectionsEnabled: boolean = false;
    private static _DefaultPipelineEnabled: boolean = true;
    private static _MotionBlurEnabled: boolean = false;

    /**
     * Returns wehter or not the camera is locked.
     */
    public static get IsCameraLocked(): boolean {
        return this.Camera?.metadata.detached ?? false;
    }

    /**
     * Returns the editor camera as an ArcRotateCamera.
     * @param editor the editor reference.
     */
    public static GetArcRotateCamera(editor: Editor): ArcRotateCamera {
        if (this.Camera && this.Camera instanceof ArcRotateCamera) {
            return this.Camera;
        }

        this.Camera?.dispose();

        const camera = new ArcRotateCamera("Editor Camera", 0, 0, 10, Vector3.Zero(), editor.scene!);
        camera.setTarget(this.Camera?.target ?? Vector3.Zero());
        camera.attachControl(editor.scene!.getEngine().getRenderingCanvas()!, true, false);
        camera.panningInertia = camera.inertia = 0;
        camera.angularSensibilityX = camera.angularSensibilityY = 200;
        camera.id = Tools.RandomId();
        camera.doNotSerialize = true;
        camera.metadata = {};

        this.Camera = camera;

        this.SetActiveCamera(editor, this.Camera);
        return this.Camera as ArcRotateCamera;
    }

    /**
     * Returns the editor camera as a FreeCamera.
     * @param editor defines the reference to the editor.
     */
    public static GetFreeCamera(editor: Editor): EditorCamera {
        if (this.Camera && this.Camera instanceof EditorCamera) {
            return this.Camera;
        }

        this.Camera?.dispose();

        const camera = new EditorCamera("Editor Camera", this.Camera?.position ?? Vector3.Zero(), editor.scene!);
        camera.setTarget(this.Camera?.target ?? Vector3.Zero());
        camera.attachControl(editor.scene!.getEngine().getRenderingCanvas()!, true);
        camera.inertia = 0.5;
        camera.angularSensibility = 500;
        camera.speed = 2;
        camera.id = Tools.RandomId();
        camera.doNotSerialize = true;
        camera.metadata = {};

        this.Camera = camera;

        this.SetActiveCamera(editor, this.Camera);
        return this.Camera as EditorCamera;
    }

    /**
     * Updates the panning sensibility according to the current radius.
     */
    public static UpdateArcRotateCameraPanning(): void {
        if (this.Camera && this.Camera instanceof ArcRotateCamera) {
            this.Camera.panningSensibility = 1000 / this.Camera.radius;
        }
    }

    /**
     * Configures the editor from according to the given JSON representation of the saved camera.
     * @param json the JSON representation of the save camera.
     * @param editor the editor reference.
     */
    public static ConfigureFromJson(json: any, editor: Editor): void {
        if (this.Camera) { this.Camera.dispose(); }

        this.Camera = Camera.Parse(json, editor.scene!) as (ArcRotateCamera | EditorCamera);
        this.Camera.attachControl(editor.scene!.getEngine().getRenderingCanvas()!, true, false);
        this.Camera.doNotSerialize = true;

        this.SetActiveCamera(editor, this.Camera);
        this.ResetPipelines(editor);
    }

    /**
     * Sets the new camera as active.
     * @param editor defines the reference to the editor.
     * @param camera defines the reference to the camera to set as active camera.
     */
    public static SetActiveCamera(editor: Editor, camera: Camera): void {
        const scene = camera.getScene();
        if (camera === scene.activeCamera) { return; }

        this.LastUsedCamera = scene.activeCamera;

        if (scene.activeCamera) {
            scene.activeCamera.detachControl();
        }

        scene.activeCamera = camera;

        this.AttachControl(editor, camera);
        this.ResetPipelines(editor);

        editor.notifyMessage(`Switched to camera "${camera.name}"`, 2000);
    }

    /**
     * Attachs the controls of the given camera to the editor's scene.
     * @param editor defines the reference to the editor.
     * @param camera defines the reference to the camera to attach control.
     */
    public static AttachControl(editor: Editor, camera: Camera): void {
        const canvas = editor.scene!.getEngine().getRenderingCanvas();
        if (!canvas) { return; }

        if (camera instanceof ArcRotateCamera) {
            camera.attachControl(canvas, true, false);
        } else if (camera instanceof FreeCamera) {
            camera.attachControl(canvas, true);
        } else {
            debugger;
        }
    }

    /**
     * Returns the SSAO rendering pipeline.
     * @param editor the editor reference.
     */
    public static GetSSAORenderingPipeline(editor: Editor): SSAO2RenderingPipeline {
        if (this.SSAOPipeline) { return this.SSAOPipeline; }

        const ssao = new SSAO2RenderingPipeline("ssao", editor.scene!, { ssaoRatio: 0.5, blurRatio: 0.5 }, this._SSAOPipelineEnabled ? editor.scene?.cameras : [], false);
        ssao.radius = 3.5;
        ssao.totalStrength = 1.3;
        ssao.expensiveBlur = true;
        ssao.samples = 16;
        ssao.maxZ = 250;
        this.SSAOPipeline = ssao;

        return ssao;
    }

    /**
     * Returns wether or not SSAO pipeline is enabled.
     */
    public static IsSSAOEnabled(): boolean {
        return this._SSAOPipelineEnabled;
    }

    /**
     * Sets wether or not SSAO is enabled
     * @param editor the editor reference.
     * @param enabled wether or not the SSAO pipeline is enabled.
     */
    public static SetSSAOEnabled(editor: Editor, enabled: boolean): void {
        if (this._SSAOPipelineEnabled === enabled) { return; }
        this._SSAOPipelineEnabled = enabled;
        this.ResetPipelines(editor);
    }

    /**
     * Returns the SSR rendering pipeline.
     * @param editor the editor reference.
     */
    public static GetSSRRenderingPipeline(editor: Editor): SSRRenderingPipeline {
        if (this.SSRPipeline) {
            return this.SSRPipeline;
        }

        const ssr = new SSRRenderingPipeline("ssr", editor.scene!, this._SSRPipelineEnabled ? editor.scene?.cameras : [], false);
        this.SSRPipeline = ssr;

        return ssr;
    }

    /**
     * Returns wether or not SSR pipeline is enabled.
     */
    public static IsSSRPipelineEnabled(): boolean {
        return this._SSRPipelineEnabled;
    }

    /**
     * Sets wether or not SSR is enabled
     * @param editor the editor reference.
     * @param enabled wether or not the SSR pipeline is enabled.
     */
    public static SetSSREnabled(editor: Editor, enabled: boolean): void {
        if (this._SSRPipelineEnabled === enabled) {
            return;
        }

        this._SSRPipelineEnabled = enabled;
        this.ResetPipelines(editor);
    }

    /**
     * Returns the default rendering pipeline.
     * @param editor the editor reference.
     */
    public static GetDefaultRenderingPipeline(editor: Editor): DefaultRenderingPipeline {
        if (this.DefaultPipeline) { return this.DefaultPipeline; }

        const pipeline = new DefaultRenderingPipeline("default", true, editor.scene!, this._DefaultPipelineEnabled ? editor.scene?.cameras : [], true);
        // const curve = new ColorCurves();
        // curve.globalHue = 200;
        // curve.globalDensity = 80;
        // curve.globalSaturation = 80;
        // curve.highlightsHue = 20;
        // curve.highlightsDensity = 80;
        // curve.highlightsSaturation = -80;
        // curve.shadowsHue = 2;
        // curve.shadowsDensity = 80;
        // curve.shadowsSaturation = 40;
        // pipeline.imageProcessing.colorCurves = curve;
        pipeline.depthOfField.focalLength = 150;
        pipeline.bloomEnabled = true;
        this.DefaultPipeline = pipeline;

        return pipeline;
    }

    /**
     * Returns wether or not default pipeline is enabled.
     */
    public static IsDefaultPipelineEnabled(): boolean {
        return this._DefaultPipelineEnabled;
    }

    /**
     * Serializes the default rendering pipeline and returns its JSON representation.
     */
    public static SerializeDefaultPipeline(): any {
        if (!this.DefaultPipeline) {
            return null;
        }

        return {
            serializedFromEditor: true,
            imageProcessing: {
                enabled: this.DefaultPipeline.imageProcessingEnabled,
                exposure: this.DefaultPipeline.imageProcessing.exposure,
                contrast: this.DefaultPipeline.imageProcessing.contrast,
                fromLinearSpace: this.DefaultPipeline.imageProcessing.fromLinearSpace,
                toneMappingEnabled: this.DefaultPipeline.imageProcessing.toneMappingEnabled,
                toneMappingType: this.DefaultPipeline.imageProcessing.toneMappingType,
                colorCurvesEnabled: this.DefaultPipeline.imageProcessing.colorCurvesEnabled,
                colorCurves: this.DefaultPipeline.imageProcessing.colorCurves?.serialize(),
                colorGradingEnabled: this.DefaultPipeline.imageProcessing.colorGradingEnabled,
                colorGradingTexture: this.DefaultPipeline.imageProcessing.colorGradingTexture?.serialize(),
            },
            bloom: {
                enabled: this.DefaultPipeline.bloomEnabled,
                bloomScale: this.DefaultPipeline.bloomScale,
                bloomWeight: this.DefaultPipeline.bloomWeight,
                bloomKernel: this.DefaultPipeline.bloomKernel,
                bloomThreshold: this.DefaultPipeline.bloomThreshold,
            },
            sharpen: {
                enabled: this.DefaultPipeline.sharpenEnabled,
                edgeAmount: this.DefaultPipeline.sharpen.edgeAmount,
                colorAmount: this.DefaultPipeline.sharpen.colorAmount,
            },
            depthOfField: {
                enabled: this.DefaultPipeline.depthOfFieldEnabled,
                fStop: this.DefaultPipeline.depthOfField.fStop,
                focalLength: this.DefaultPipeline.depthOfField.focalLength,
                focusDistance: this.DefaultPipeline.depthOfField.focusDistance,
                depthOfFieldBlurLevel: this.DefaultPipeline.depthOfFieldBlurLevel,
            },
            chromaticAberration: {
                enabled: this.DefaultPipeline.chromaticAberrationEnabled,
                aberrationAmount: this.DefaultPipeline.chromaticAberration.aberrationAmount,
                radialIntensity: this.DefaultPipeline.chromaticAberration.radialIntensity,
                direction: this.DefaultPipeline.chromaticAberration.direction.asArray(),
                centerPosition: this.DefaultPipeline.chromaticAberration.centerPosition.asArray(),
            },
            grain: {
                enabled: this.DefaultPipeline.grainEnabled,
                animated: this.DefaultPipeline.grain.animated,
                intensity: this.DefaultPipeline.grain.intensity,
            },
            glowLayer: {
                enabled: this.DefaultPipeline.glowLayerEnabled,
                intensity: this.DefaultPipeline.glowLayer?.intensity,
                blurKernelSize: this.DefaultPipeline.glowLayer?.blurKernelSize,
            },
            vignette: {
                enabled: this.DefaultPipeline.imageProcessing.vignetteEnabled,
                vignetteWeight: this.DefaultPipeline.imageProcessing.vignetteWeight,
                vignetteBlendMode: this.DefaultPipeline.imageProcessing.vignetteBlendMode,
                vignetteColor: this.DefaultPipeline.imageProcessing.vignetteColor.asArray(),
            },
            fxaa: {
                enabled: this.DefaultPipeline.fxaaEnabled,
            },
        };
    }

    /**
     * Parses the current default rendering pipeline according to the given JSON representation.
     * @param editor defines the reference to the editor.
     * @param data defines the JSON representation of the default rendering pipeline.
     */
    public static ParseDefaultPipeline(editor: Editor, data: any): void {
        if (!this.DefaultPipeline) {
            return;
        }

        this.DefaultPipeline.fxaaEnabled = data.fxaa.enabled;

        // Image processing
        this.DefaultPipeline.imageProcessingEnabled = data.imageProcessing.enabled;
        this.DefaultPipeline.imageProcessing.exposure = data.imageProcessing.exposure;
        this.DefaultPipeline.imageProcessing.contrast = data.imageProcessing.contrast;
        this.DefaultPipeline.imageProcessing.fromLinearSpace = data.imageProcessing.fromLinearSpace;
        this.DefaultPipeline.imageProcessing.toneMappingEnabled = data.imageProcessing.toneMappingEnabled;
        this.DefaultPipeline.imageProcessing.toneMappingType = data.imageProcessing.toneMappingType;

        this.DefaultPipeline.imageProcessing.colorCurvesEnabled = data.imageProcessing.colorCurvesEnabled ?? this.DefaultPipeline.imageProcessing.colorCurvesEnabled;
        this.DefaultPipeline.imageProcessing.colorGradingEnabled = data.imageProcessing.colorGradingEnabled ?? this.DefaultPipeline.imageProcessing.colorGradingEnabled;

        if (data.imageProcessing.colorCurves) {
            this.DefaultPipeline.imageProcessing.colorCurves = ColorCurves.Parse(data.imageProcessing.colorCurves);
        }

        if (data.imageProcessing.colorGradingTexture && !this.DefaultPipeline.imageProcessing.colorGradingTexture && WorkSpace.DirPath) {
            const sourceName = data.imageProcessing.colorGradingTexture.name;

            data.imageProcessing.colorGradingTexture.name = join(WorkSpace.DirPath, "assets", data.imageProcessing.colorGradingTexture.name);
            this.DefaultPipeline.imageProcessing.colorGradingTexture = ColorGradingTexture.Parse(data.imageProcessing.colorGradingTexture, editor.scene!);

            if (this.DefaultPipeline.imageProcessing.colorGradingTexture) {
                this.DefaultPipeline.imageProcessing.colorGradingTexture.name = sourceName;
            }
        }

        // Vignette
        this.DefaultPipeline.imageProcessing.vignetteEnabled = data.vignette.enabled;
        this.DefaultPipeline.imageProcessing.vignetteWeight = data.vignette.vignetteWeight;
        this.DefaultPipeline.imageProcessing.vignetteBlendMode = data.vignette.vignetteBlendMode;
        this.DefaultPipeline.imageProcessing.vignetteColor = Color4.FromArray(data.vignette.vignetteColor);

        // Sharpen
        this.DefaultPipeline.sharpenEnabled = data.sharpen.enabled;
        this.DefaultPipeline.sharpen.edgeAmount = data.sharpen.edgeAmount;
        this.DefaultPipeline.sharpen.colorAmount = data.sharpen.colorAmount;

        // Bloom
        this.DefaultPipeline.bloomEnabled = data.bloom.enabled;
        this.DefaultPipeline.bloomScale = data.bloom.bloomScale;
        this.DefaultPipeline.bloomWeight = data.bloom.bloomWeight;
        this.DefaultPipeline.bloomKernel = data.bloom.bloomKernel;
        this.DefaultPipeline.bloomThreshold = data.bloom.bloomThreshold;

        // Depth of field
        this.DefaultPipeline.depthOfFieldEnabled = data.depthOfField.enabled;
        this.DefaultPipeline.depthOfField.fStop = data.depthOfField.fStop;
        this.DefaultPipeline.depthOfField.focalLength = data.depthOfField.focalLength;
        this.DefaultPipeline.depthOfField.focusDistance = data.depthOfField.focusDistance;
        this.DefaultPipeline.depthOfFieldBlurLevel = data.depthOfField.depthOfFieldBlurLevel;

        // Chromatic aberration
        this.DefaultPipeline.chromaticAberrationEnabled = data.chromaticAberration.enabled;
        this.DefaultPipeline.chromaticAberration.aberrationAmount = data.chromaticAberration.aberrationAmount;
        this.DefaultPipeline.chromaticAberration.radialIntensity = data.chromaticAberration.radialIntensity;
        this.DefaultPipeline.chromaticAberration.direction = Vector2.FromArray(data.chromaticAberration.direction);
        this.DefaultPipeline.chromaticAberration.centerPosition = Vector2.FromArray(data.chromaticAberration.centerPosition);

        // Grain
        this.DefaultPipeline.grainEnabled = data.grain.enabled;
        this.DefaultPipeline.grain.animated = data.grain.animated;
        this.DefaultPipeline.grain.intensity = data.grain.intensity;

        // Glow
        this.DefaultPipeline.glowLayerEnabled = data.glowLayer.enabled;
        if (this.DefaultPipeline.glowLayer) {
            this.DefaultPipeline.glowLayer.intensity = data.glowLayer.intensity;
            this.DefaultPipeline.glowLayer.blurKernelSize = data.glowLayer.blurKernelSize;
        }
    }

    /**
     * Sets wether or not default pipeline is enabled
     * @param editor the editor reference.
     * @param enabled wether or not the default pipeline is enabled.
     */
    public static SetDefaultPipelineEnabled(editor: Editor, enabled: boolean) {
        if (this._DefaultPipelineEnabled === enabled) { return; }
        this._DefaultPipelineEnabled = enabled;
        this.ResetPipelines(editor);
    }

    /**
     * Returns the reference to the motion blur post-process.
     * @param editor defines the refenrece to the editor.
     */
    public static GetMotionBlurPostProcess(editor: Editor): MotionBlurPostProcess {
        if (this.MotionBlurPostProcess) { return this.MotionBlurPostProcess; }

        this.MotionBlurPostProcess = new MotionBlurPostProcess("motionBlur", editor.scene!, 1.0, editor.scene!.activeCamera, undefined, undefined, undefined, undefined, undefined, false);

        editor.scene?.cameras.forEach((c) => !c._postProcesses.includes(this.MotionBlurPostProcess!) && c.attachPostProcess(this.MotionBlurPostProcess!));

        return this.MotionBlurPostProcess;
    }

    /**
     * Returns wether or not Motion Blur is enabled.
     */
    public static IsMotionBlurEnabled(): boolean {
        return this._MotionBlurEnabled;
    }

    /**
     * Sets wether or not motion blur post-process is enabled.
     * @param editor defines the reference to the editor.
     * @param enabled defines wether or not motion blur post-process is enabled.
     */
    public static SetMotionBlurEnabled(editor: Editor, enabled: boolean): void {
        if (this._MotionBlurEnabled === enabled) { return; }
        this._MotionBlurEnabled = enabled;
        this.ResetPipelines(editor);
    }

    /**
     * Returns the reference to the screen space reflections post-process.
     * @param editor defines the reference to the editor.
     */
    public static GetScreenSpaceReflectionsPostProcess(editor: Editor): ScreenSpaceReflectionPostProcess {
        if (this.ScreenSpaceReflectionsPostProcess) { return this.ScreenSpaceReflectionsPostProcess; }

        this.ScreenSpaceReflectionsPostProcess = new ScreenSpaceReflectionPostProcess("ssr", editor.scene!, 1.0, editor.scene!.activeCamera, undefined, editor.engine!, undefined, undefined, undefined, false);

        editor.scene?.cameras.forEach((c) => !c._postProcesses.includes(this.ScreenSpaceReflectionsPostProcess!) && c.attachPostProcess(this.ScreenSpaceReflectionsPostProcess!));

        return this.ScreenSpaceReflectionsPostProcess;
    }

    /**
     * Returns wether or not screen space reflections is enabled.
     */
    public static IsScreenSpaceReflectionsEnabled(): boolean {
        return this._ScreenSpaceReflectionsEnabled;
    }

    /**
     * Sets wether or not screen space reflection post-process is enabled.
     * @param editor defines the reference to the editor.
     * @param enabled defines wether or not screen space reflections post-process is enabled.
     */
    public static SetScreenSpaceReflectionsEnabled(editor: Editor, enabled: boolean): void {
        if (this._ScreenSpaceReflectionsEnabled === enabled) { return; }
        this._ScreenSpaceReflectionsEnabled = enabled;
        this.ResetPipelines(editor);
    }

    /**
     * Resets the rendering pipelines.
     * @param editor the editor reference.
     */
    public static ResetPipelines(editor: Editor): void {
        editor.scene!.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssao", editor.scene!.cameras);
        editor.scene!.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssr", editor.scene!.cameras);
        editor.scene!.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("default", editor.scene!.cameras);

        const ssrSource = this.ScreenSpaceReflectionsPostProcess?.serialize();
        if (this.ScreenSpaceReflectionsPostProcess) {
            editor.scene!.cameras.forEach((c) => c.detachPostProcess(this.ScreenSpaceReflectionsPostProcess!));
        }
        this.ScreenSpaceReflectionsPostProcess?.dispose(editor.scene!.activeCamera!);
        this.ScreenSpaceReflectionsPostProcess = null;

        const motionBlurSource = this.MotionBlurPostProcess?.serialize();
        if (this.MotionBlurPostProcess) {
            editor.scene!.cameras.forEach((c) => c.detachPostProcess(this.MotionBlurPostProcess!));
        }
        this.MotionBlurPostProcess?.dispose();
        this.MotionBlurPostProcess = null;

        // SSAO
        if (this.SSAOPipeline) {
            const source = this.SSAOPipeline.serialize();
            this.SSAOPipeline.dispose(false);
            this.SSAOPipeline = null;

            try {
                this.GetSSAORenderingPipeline(editor);
                SerializationHelper.Parse(() => this.SSAOPipeline, source, editor.scene!);
                editor.scene!.render();
            } catch (e) {
                this._DisposePipeline(editor, this.SSAOPipeline);
                editor.console.logError("Failed to attach SSAO rendering pipeline to camera.");
                editor.console.logError(e.message);
            }
        }

        // Screen spsace reflections @deprecated
        if (this._ScreenSpaceReflectionsEnabled) {
            try {
                this.GetScreenSpaceReflectionsPostProcess(editor);
                if (ssrSource) {
                    SerializationHelper.Parse(() => this.ScreenSpaceReflectionsPostProcess, ssrSource, editor.scene!, "");
                }
                editor.scene!.render();
            } catch (e) {
                this.ScreenSpaceReflectionsPostProcess!.dispose(editor.scene!.activeCamera!);
            }
        }

        // SSR
        if (this.SSRPipeline) {
            const source = this.SSRPipeline.serialize();
            this.SSRPipeline.dispose(false);
            this.SSRPipeline = null;

            try {
                this.GetSSRRenderingPipeline(editor);
                SerializationHelper.Parse(() => this.SSRPipeline, source, editor.scene!);
                editor.scene!.render();
            } catch (e) {
                this._DisposePipeline(editor, this.SSRPipeline);
                editor.console.logError("Failed to attach SSR rendering pipeline to camera.");
                editor.console.logError(e.message);
            }
        }

        // Default
        if (this.DefaultPipeline) {
            const source = this.SerializeDefaultPipeline();
            this.DefaultPipeline.dispose();
            this.DefaultPipeline = null;

            try {
                this.GetDefaultRenderingPipeline(editor);
                this.ParseDefaultPipeline(editor, source);
                editor.scene!.render();
            } catch (e) {
                this._DisposePipeline(editor, this.DefaultPipeline);
                editor.console.logError("Failed to attach default rendering pipeline to camera.");
                editor.console.logError(e.message);
            }
        }

        // Motion Blur
        if (this._MotionBlurEnabled) {
            try {
                this.GetMotionBlurPostProcess(editor);
                if (motionBlurSource) {
                    SerializationHelper.Parse(() => this.MotionBlurPostProcess, motionBlurSource, editor.scene!, "");
                }
                editor.scene!.render();
            } catch (e) {
                this.MotionBlurPostProcess!.dispose(editor.scene!.activeCamera!);
            }
        }
    }

    /**
     * Detaches the given rendering pipeline.
     */
    private static _DisposePipeline(editor: Editor, pipeline: Nullable<PostProcessRenderPipeline>): void {
        if (!pipeline) { return; }
        editor.scene!.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(pipeline._name, editor.scene!.cameras);
    }
}
