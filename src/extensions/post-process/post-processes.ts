import { Scene, PostProcessRenderPipeline, StandardRenderingPipeline } from 'babylonjs';

import Extension from '../extension';
import Extensions from '../extensions';
import { IStringDictionary } from '../../editor/typings/typings';

export interface PostProcessMetadata {
    standard?: any;
}

export default class PostProcessesExtension extends Extension<PostProcessMetadata> {
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
    public onApply (data: PostProcessMetadata): void {
        if (data.standard) {
            const std = StandardRenderingPipeline.Parse(data.standard, this.scene, '');
            std._attachCameras(this.scene.cameras, true);
        }
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
    public onLoad (): void
    { }
}

Extensions.Register('PostProcess', PostProcessesExtension);
