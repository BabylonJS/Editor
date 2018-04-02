import { Scene, PostProcessRenderPipeline, StandardRenderingPipeline } from 'babylonjs';

import Extension from '../extension';
import Extensions from '../extensions';
import Editor, { IStringDictionary } from 'babylonjs-editor';

export interface PostProcessMetadata {
    standard?: any;
}

export default class PostProcessesExtension extends Extension<PostProcessMetadata> {
    // Public members
    public standard: StandardRenderingPipeline = null;

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

        return data;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: PostProcessMetadata, editor: Editor): void {
        this._applyPostProcesses(data, 'file:');
    }

    // Applies the post-processes on the scene
    private _applyPostProcesses (data: PostProcessMetadata, rootUrl?: string, editor?: Editor): void {
        if (data.standard) {
            this.standard = StandardRenderingPipeline.Parse(data.standard, this.scene, rootUrl);
            this.standard._attachCameras(this.scene.cameras, true);
        }
    }
}

Extensions.Register('PostProcess', PostProcessesExtension);
