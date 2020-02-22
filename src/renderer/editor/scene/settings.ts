import {
    Camera, ArcRotateCamera, Vector3, FreeCamera, SSAO2RenderingPipeline, DefaultRenderingPipeline,
    SerializationHelper, PostProcessRenderPipeline, StandardRenderingPipeline,
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
     * Defines the reference to the standard rendering pipeline.
     */
    public static StandardPipeline: Nullable<StandardRenderingPipeline> = null;
    /**
     * Defines the reference to the default rendering pipeline.
     */
    public static DefaultPipeline: Nullable<DefaultRenderingPipeline> = null;

    private static _SSAOPipelineEnabled: boolean = true;
    private static _StandardPipelineEnabled: boolean = true;
    private static _DefaultPipelineEnabled: boolean = true;

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
        this._BindEvents(editor, camera);

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

        this._BindEvents(editor, this.Camera);
        this.SetActiveCamera(editor, this.Camera);
        this.ResetPipelines(editor);
    }

    /**
     * Sets the new camera as active.
     * @param camera the camera to set as active camera.
     */
    public static SetActiveCamera(editor: Editor, camera: Camera): void {
        const scene = camera.getScene();
        if (camera === scene.activeCamera) { return; }

        const canvas = scene.getEngine().getRenderingCanvas();
        if (!canvas) { return; }

        if (scene.activeCamera)  { scene.activeCamera.detachControl(canvas); }

        scene.activeCamera = camera;

        if (camera instanceof ArcRotateCamera) {
            camera.attachControl(canvas, true, false);
        } else if (camera instanceof FreeCamera) {
            camera.attachControl(canvas, true);
        } else {
            debugger;
        }

        this.ResetPipelines(editor);
    }

    /**
     * Binds the events on the camera.
     */
    private static _BindEvents(editor: Editor, camera: Camera): void {
        camera.onViewMatrixChangedObservable.add(() => editor.preview.setDirty());
        camera.onProjectionMatrixChangedObservable.add(() => editor.preview.setDirty());
    }

    /**
     * Returns the SSAO rendering pipeline.
     * @param editor the editor reference.
     */
    public static GetSSAORenderingPipeline(editor: Editor): SSAO2RenderingPipeline {
        if (this.SSAOPipeline) { return this.SSAOPipeline; }

        const ssao = new SSAO2RenderingPipeline("ssao", editor.scene!, { ssaoRatio: 0.5, blurRatio: 0.5 }, this._SSAOPipelineEnabled ? [editor.scene!.activeCamera!] : []);
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
    public static SetSSAOEnabled(editor: Editor, enabled: boolean) {
        if (this._SSAOPipelineEnabled === enabled) { return; }
        this._SSAOPipelineEnabled = enabled;
        this.ResetPipelines(editor);
    }

    /**
     * Returns the standard rendering pipeline.
     * @param editor the editor reference.
     */
    public static GetStandardRenderingPipeline(editor: Editor): StandardRenderingPipeline {
        if (this.StandardPipeline) { return this.StandardPipeline; }

        const standard = new StandardRenderingPipeline("standard", editor.scene!, 1.0, null, [editor.scene!.activeCamera!]);
        standard.MotionBlurEnabled = true;
        standard.motionStrength = 0.2;
        this.StandardPipeline = standard;

        return standard;
    }

    /**
     * Returns wether or not default pipeline is enabled.
     */
    public static IsStandardPipelineEnabled(): boolean {
        return this._StandardPipelineEnabled;
    }

    /**
     * Sets wether or not default pipeline is enabled
     * @param editor the editor reference.
     * @param enabled wether or not the SSAO is enabled.
     */
    public static SetStandardPipelineEnabled(editor: Editor, enabled: boolean) {
        if (this._StandardPipelineEnabled === enabled) { return; }
        this._StandardPipelineEnabled = enabled;
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
     * Resets the rendering pipelines.
     * @param editor the editor reference.
     */
    public static ResetPipelines(editor: Editor): void {
        editor.scene!.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssao", editor.scene!.cameras);
        editor.scene!.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("standard", editor.scene!.cameras);
        editor.scene!.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("default", editor.scene!.cameras);

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
            }
        }

        // Standard
        if (this.StandardPipeline) {
            const source = this.StandardPipeline.serialize();
            this.StandardPipeline.dispose();
            this.StandardPipeline = null;
            try {
                this.GetStandardRenderingPipeline(editor);
                SerializationHelper.Parse(() => this.StandardPipeline, source, editor.scene!);
                editor.scene!.render();
            } catch (e) {
                this._DisposePipeline(editor, this.StandardPipeline);
                editor.console.logError("Failed to attach Standard rendering pipeline to cameras");
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