import { Scene, Effect, Tools, Vector2, Vector3, Texture } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import { EDITOR, template } from './export';

import { IStringDictionary } from '../typings/typings';
import { IAssetFile, IAssetComponent, AssetElement, IAssetExportConfiguration } from '../typings/asset';

import AbstractPostProcessEditor, { CustomPostProcessConfig } from './post-process';

export interface PostProcessCreatorUserConfig {
    textures?: { value: any; name: string }[];
    floats?: { value: number; name: string }[];
    vectors2?: { value: number[]; name: string }[];
    vectors3?: { value: number[]; name: string }[];
}

export interface PostProcessCreatorMetadata {
    cameraName: string;
    preview: boolean;
    name: string;
    code: string;
    compiledCode?: string;
    pixel: string;
    config: string;
    userConfig: PostProcessCreatorUserConfig;
    id: string;
}

export default class PostProcessEditorExtension extends Extension<PostProcessCreatorMetadata[]> implements IAssetComponent {
    /**
     * Defines all available post-processes instances available.
     */
    public instances: IStringDictionary<any> = { };

    /**
     * The id of the extension.
     */
    public id: string = 'post-processes-editor';
    /**
     * Caption to draw in assets panel.
     */
    public assetsCaption: string = 'Post-Processes';

    /**
     * Defines the instance of the post-process editor extension.
     */
    public static Instance: PostProcessEditorExtension = null;

    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];

        // Instance
        PostProcessEditorExtension.Instance = this;
    }

    /**
     * On get all the assets to be drawn in the assets component
     */
    public onGetAssets (): AssetElement<any>[] {
        const data = this.onSerialize();
        const result: AssetElement<PostProcessCreatorMetadata>[] = [];

        data.forEach(s => result.push({ name: s.name, data: s }));

        return result;
    }

    /**
     * Creates a new post-process
     * @param data: the data containing code, pixel, etc.
     */
    public createPostProcess (data: PostProcessCreatorMetadata, rootUrl?: string): AbstractPostProcessEditor {
        const id = data.name + Tools.RandomId();

        // Add custom code
        Effect.ShadersStore[id + 'PixelShader'] = data.pixel;

        // Get constructor.
        const camera = this.scene.getCameraByName(data.cameraName) || this.scene.activeCamera;
        const ctor = this._getConstructor(id, data);
        const code = new (ctor.ctor || ctor)(camera, this.scene);

        // Custom config
        let config: CustomPostProcessConfig = null;
        try {
            config = JSON.parse(data.config);
        } catch (e) { /* Silently */ }

        // Create post-process
        let postprocess = new AbstractPostProcessEditor(data.name, id, data.preview ? camera : null, this.scene.getEngine(), config, code);

        // User config
        data.userConfig.textures.forEach(t => postprocess.userConfig[t.name] = Texture.Parse(t.value, this.scene, rootUrl || 'file:'));
        data.userConfig.floats.forEach(f =>   postprocess.userConfig[f.name] = f.value);
        data.userConfig.vectors2.forEach(v => postprocess.userConfig[v.name] = Vector2.FromArray(v.value));
        data.userConfig.vectors3.forEach(v => postprocess.userConfig[v.name] = Vector3.FromArray(v.value));

        // Save instance
        this.instances[data.name] = {
            code: code,
            postprocess: postprocess
        };

        // Return post-process
        return postprocess;
    }

    private _getConstructor (id: string, data: PostProcessCreatorMetadata): any {
        if (window['GeneratedPostProcesses']) {
            return window['GeneratedPostProcesses'].Scripts.find(s => s.id === data.id);
        }

        let url = window.location.href;
        url = url.replace(Tools.GetFilename(url), '') + 'post-processes/' + data.name.replace(/ /g, '') + '.js';

        Extension.AddScript(template.replace('{{name}}', id).replace('{{code}}', data.compiledCode || data.code), url);

        const camera = this.scene.getCameraByName(data.cameraName) || this.scene.activeCamera;
        return new EDITOR.PostProcessCreator.Constructors[id](camera, Extensions.Tools, Extensions.Mobile);
    }

    /**
     * On apply the extension
     */
    public onApply (data: PostProcessCreatorMetadata[], rootUrl?: string): void {
        this.datas = data;
        this.datas.forEach(d => this.createPostProcess(d, rootUrl));
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
                if (!(p instanceof AbstractPostProcessEditor) || !p.config || p.name !== d.name)
                    return;

                d.userConfig.textures = [];
                p.config.textures.forEach(t => p.userConfig[t] && d.userConfig.textures.push({ value: (<Texture> p.userConfig[t]).serialize(), name: t }));

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
        this.datas.forEach(d => {
            d.id = d.id || Tools.RandomId();
            this.scene.metadata['PostProcessCreator'].push(d);
        });
    }

    /**
     * Called by the editor when serializing the scene.
     */
    public async onSerializeFinalFiles (configuration: IAssetExportConfiguration): Promise<IAssetFile[]> {
        if (!configuration.es6)
            return [];
        
        const exportScript = await new Promise<string>((resolve) => {
            Tools.LoadFile('assets/templates/post-process-creator/export.ts', (data) => resolve(<string> data));
        });

        let root = await new Promise<string>((resolve) => {
            Tools.LoadFile('assets/templates/post-process-creator/embed.ts', (data) => resolve(<string> data));
        }) + '\n';

        const data = this.onSerialize();
        const files = data.map(s => {
            const id = 'script' + s.id.replace(/-/g, '');
            const name = s.name.toLowerCase();

            root += `import ${id} from "./${name}";\n`;
            root += `GeneratedPostProcesses.Scripts.push({ ctor: ${id}, id: '${s.id}' });\n\n`;

            return {
                name: name + '.ts',
                content: `import { IScript, exportScript, tools } from './export';\n${s.code}\n`
            };
        }).concat([
            { name: 'all.ts', content: root },
            { name: 'export.ts', content: exportScript }
        ]);

        files.forEach(f => {
            f.content = (<string> f.content)
                .replace(/'babylonjs'/g, "'@babylonjs/core'")
                .replace(/"babylonjs"/g, "'@babylonjs/core'")
                .replace(/'babylonjs-gui'/g, "'@babylonjs/gui'")
                .replace(/"babylonjs-gui"/g, "'@babylonjs/gui'")
                .replace(/'babylonjs-loaders'/g, "'@babylonjs/loaders'")
                .replace(/"babylonjs-loaders"/g, "'@babylonjs/loaders'")
                .replace(/'babylonjs-materials'/g, "'@babylonjs/materials'")
                .replace(/"babylonjs-materials"/g, "'@babylonjs/materials'")
                .replace(/'babylonjs-post-process'/g, "'@babylonjs/post-processes'")
                .replace(/"babylonjs-post-process"/g, "'@babylonjs/post-processes'")
                .replace(/'babylonjs-procedural-textures'/g, "'@babylonjs/procedural-textures'")
                .replace(/"babylonjs-procedural-textures"/g, "'@babylonjs/procedural-textures'");
        });

        return files;
    }
}

// Register
Extensions.Register('PostProcessCreatorExtension', PostProcessEditorExtension);
