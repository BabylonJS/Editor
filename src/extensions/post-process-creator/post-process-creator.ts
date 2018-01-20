import { Scene, Effect, Tools, Vector2, Vector3 } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import PostProcessEditor, { CustomPostProcessConfig } from './post-process';

export interface PostProcessCreatorUserConfig {
    floats?: { value: number; name: string }[];
    vectors2?: { value: number[]; name: string }[];
    vectors3?: { value: number[]; name: string }[];
}

export interface PostProcessCreatorMetadata {
    cameraName: string;
    name: string;
    code: string;
    pixel: string;
    config: string;
    userConfig: PostProcessCreatorUserConfig;
}

const template = `
EDITOR.PostProcessCreator.Constructors['{{name}}'] = function (CustomPostProcess, camera) {
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

        const code = <any> new Function();
        const camera = this.scene.getCameraByName(data.cameraName) || this.scene.activeCamera;
        const instance = new EDITOR.PostProcessCreator.Constructors[id](code, camera);

        // Custom config
        let config: CustomPostProcessConfig = null;
        try {
            config = JSON.parse(data.config);
        } catch (e) { /* Silently */ }

        // Create post-process
        const postprocess = new PostProcessEditor(data.name, id, camera, config, code);

        // User config
        data.userConfig.floats.forEach(f =>   postprocess.userConfig[f.name] = f.value);
        data.userConfig.vectors2.forEach(v => postprocess.userConfig[v.name] = Vector2.FromArray(v.value));
        data.userConfig.vectors3.forEach(v => postprocess.userConfig[v.name] = Vector3.FromArray(v.value));

        // Return post-process
        return postprocess;
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
        if (!this.scene.metadata || !this.scene.metadata['PostProcessCreator'])
            return null;

        // Get data
        const data = <PostProcessCreatorMetadata[]> this.scene.metadata['PostProcessCreator'];

        // Apply user config
        data.forEach(d => {
            this.scene.postProcesses.forEach(p => {
                if (!(p instanceof PostProcessEditor) || !p.config || p.name !== d.name)
                    return;

                d.userConfig.floats = [];
                p.config.floats.forEach(f => d.userConfig.floats.push({ value: <number> p.userConfig[f], name: f }));

                d.userConfig.vectors2 = [];
                p.config.vectors2.forEach(v => d.userConfig.vectors2.push({ value: (<Vector2> p.userConfig[v]).asArray(), name: v }));

                d.userConfig.vectors3 = [];
                p.config.vectors3.forEach(v => d.userConfig.vectors3.push({ value: (<Vector3> p.userConfig[v]).asArray(), name: v }));
            });
        });

        return data;
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
