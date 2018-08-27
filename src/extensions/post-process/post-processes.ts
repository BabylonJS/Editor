import { Scene, PostProcessRenderPipeline, StandardRenderingPipeline, SSAO2RenderingPipeline, DefaultRenderingPipeline } from 'babylonjs';

import Extension from '../extension';
import Extensions from '../extensions';

import { IStringDictionary } from '../typings/typings';

export interface PostProcessMetadata {
    standard?: any;
    default?: any;
    ssao2?: any;
}

export default class PostProcessesExtension extends Extension<PostProcessMetadata> {
    // Public members
    public standard: StandardRenderingPipeline = null;
    public default: DefaultRenderingPipeline = null;
    public ssao2: SSAO2RenderingPipeline = null;

    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);

        // Extension
        this.datas = { };
    }

    /**
     * On apply the extension
     */
    public onApply (data: PostProcessMetadata, rootUrl?: string): void {
        this._applyPostProcesses(data, rootUrl)
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): PostProcessMetadata {
        const pipelines: IStringDictionary<PostProcessRenderPipeline> = this.scene.postProcessRenderPipelineManager['_renderPipelines'];
        const data: PostProcessMetadata = { };
        
        if (pipelines.Standard)
            data.standard = pipelines.Standard['serialize']();

        if (pipelines.SSAO2)
            data.ssao2 = pipelines.SSAO2['serialize']();

        if (pipelines.Default)
            data.default = pipelines.Default['serialize']();

        return data;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: PostProcessMetadata): void {
        // this._applyPostProcesses(data, 'file:');
    }

    // Applies the post-processes on the scene
    private _applyPostProcesses (data: PostProcessMetadata, rootUrl?: string): void {
        if (data.ssao2) {
            // TODO: PR to babylonjs to serialize / parse SSAO2 rendering pipleine
            this.ssao2 = SSAO2RenderingPipeline['Parse'](data.ssao2, this.scene, rootUrl);
            this.ssao2._attachCameras(this.scene.cameras, true);
        }

        if (data.standard) {
            this.standard = StandardRenderingPipeline.Parse(data.standard, this.scene, rootUrl);
            this.standard._attachCameras(this.scene.cameras, true);
        }

        if (data.default) {
            this.default = DefaultRenderingPipeline.Parse(data.default, this.scene, rootUrl);
            this.default._attachCameras(this.scene.cameras, true);
        }
    }
}

Extensions.Register('PostProcess', PostProcessesExtension);
