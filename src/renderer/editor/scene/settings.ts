import {
    Camera, ArcRotateCamera, Vector3, FreeCamera, SSAO2RenderingPipeline, DefaultRenderingPipeline,
    SerializationHelper, PostProcessRenderPipeline, MotionBlurPostProcess, ScreenSpaceReflectionPostProcess,
} from "babylonjs";

import { Nullable } from "../../../shared/types";

import { Editor } from "../editor";
import { Tools } from "../tools/tools";

export class SceneSettings {
    /**
     * Defines the camera being used by the editor.
     */
    public static Camera: Nullable<ArcRotateCamera> = null;
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
     * Returns the editor cameras as an ArcRotateCamera.
     * @param editor the editor reference.
     */
    public static GetArcRotateCamera(editor: Editor): ArcRotateCamera {
        if (this.Camera) { return this.Camera; }

        const camera = new ArcRotateCamera("Editor Camera", 0, 0, 10, Vector3.Zero(), editor.scene!);
        camera.attachControl(editor.scene!.getEngine().getRenderingCanvas()!, true, false);
        camera.id = Tools.RandomId();
        camera.doNotSerialize = true;

        this.Camera = camera;

        this.SetActiveCamera(editor, this.Camera);
        return this.Camera as ArcRotateCamera;
    }

    /**
     * Configures the editor from according to the given JSON representation of the saved camera.
     * @param json the JSON representation of the save camera.
     * @param editor the editor reference.
     */
    public static ConfigureFromJson(json: any, editor: Editor): void {
        if (this.Camera) { this.Camera.dispose(); }

        this.Camera = Camera.Parse(json, editor.scene!) as ArcRotateCamera;
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

        if (scene.activeCamera)  { scene.activeCamera.detachControl(); }

        scene.activeCamera = camera;

        this.AttachControl(editor, camera);
        this.ResetPipelines(editor);
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

        const ssao = new SSAO2RenderingPipeline("ssao", editor.scene!, { ssaoRatio: 0.5, blurRatio: 0.5 }, this._SSAOPipelineEnabled ? [editor.scene!.activeCamera!] : [], true);
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
     * Returns the default rendering pipeline.
     * @param editor the editor reference.
     */
    public static GetDefaultRenderingPipeline(editor: Editor): DefaultRenderingPipeline {
        if (this.DefaultPipeline) { return this.DefaultPipeline; }

        const pipeline = new DefaultRenderingPipeline("default", true, editor.scene!, this._DefaultPipelineEnabled ? [editor.scene!.activeCamera!] : []);
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

        this.MotionBlurPostProcess = new MotionBlurPostProcess("motionBlur", editor.scene!, 1.0, editor.scene!.activeCamera, undefined, undefined, undefined, undefined, undefined, true);
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

        this.ScreenSpaceReflectionsPostProcess = new ScreenSpaceReflectionPostProcess("ssr", editor.scene!, 1.0, editor.scene!.activeCamera!, undefined, undefined, undefined, undefined, undefined, true);
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
        editor.scene!.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("default", editor.scene!.cameras);

        const ssrSource = this.ScreenSpaceReflectionsPostProcess?.serialize();
        this.ScreenSpaceReflectionsPostProcess?.dispose(editor.scene!.activeCamera!);
        this.ScreenSpaceReflectionsPostProcess = null;

        const motionBlurSource = this.MotionBlurPostProcess?.serialize();
        this.MotionBlurPostProcess?.dispose(editor.scene!.activeCamera!);
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

        // Screen spsace reflections
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

        // Default
        if (this.DefaultPipeline) {
            const source = this.DefaultPipeline.serialize();
            this.DefaultPipeline.dispose();
            this.DefaultPipeline = null;

            try {
                this.GetDefaultRenderingPipeline(editor);
                SerializationHelper.Parse(() => this.DefaultPipeline, source, editor.scene!);
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