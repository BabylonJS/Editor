import { Scene, Effect, Tools } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import PostProcessEditor, { CustomPostProcessConfig } from './post-process';

export interface PostProcessCreatorMetadata {
    name: string;
    code: string;
    pixel: string;
    config: string;
}

const template = `
EDITOR.PostProcessCreator.Constructors['{{name}}'] = function (CustomPostProcess) {
    {{code}}
}
`;

// Set EDITOR on Window
export module EDITOR {
    export class PostProcessCreator {
        public static Constructors = { };
    }
}
window['EDITOR'] = window['EDITOR'] || { };
window['EDITOR'].PostProcessCreator = EDITOR.PostProcessCreator;

export default class PostProcessCreatorExtension extends Extension<PostProcessCreatorMetadata[]> {
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

    /**
     * Creates a new post-process
     * @param data: the data containing code, pixel, etc.
     */
    public createPostProcess (data: PostProcessCreatorMetadata): PostProcessEditor {
        const id = data.name + Tools.RandomId();

        // Add custom code
        Effect.ShadersStore[id + 'PixelShader'] = data.pixel;

        let url = window.location.href;
        url = url.replace(Tools.GetFilename(url), '') + 'post-processes/' + data.name.replace(/ /g, '') + '.js';

        Extension.AddScript(template.replace('{{name}}', id).replace('{{code}}', data.code), url);

        const code = <any> { };
        const instance = new EDITOR.PostProcessCreator.Constructors[id](code);

        // Custom config
        let config: CustomPostProcessConfig = null;
        try {
            config = JSON.parse(data.config);
        } catch (e) { /* Silently */ }

        // Create post-process
        return new PostProcessEditor(data.name, id, this.scene, config.ratio, code);
    }

    /**
     * On apply the extension
     */
    public onApply (data: PostProcessCreatorMetadata[]): void {
        this.datas = data;
        this.datas.forEach(d => this.createPostProcess(d));
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): PostProcessCreatorMetadata[] {
        if (this.scene.metadata && this.scene.metadata['PostProcessCreator'])
            return this.scene.metadata['PostProcessCreator'];

        return null;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: PostProcessCreatorMetadata[]): void {
        this.datas = data;

        this.scene.metadata = this.scene.metadata || { };
        this.scene.metadata['PostProcessCreator'] = [];

        // For each material
        this.datas.forEach(d => this.scene.metadata['PostProcessCreator'].push(d));
    }
}

// Register
Extensions.Register('PostProcessCreatorExtension', PostProcessCreatorExtension);
