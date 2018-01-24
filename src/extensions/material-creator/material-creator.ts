import { Scene, Effect, Tools, Texture, Vector3, Vector2 } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import CustomEditorMaterial, { CustomMaterialCode, CustomMaterialConfig } from './material';
import { IStringDictionary } from 'babylonjs-editor';

export interface MaterialCreatorUserConfig {
    textures?: { value: any; name: string }[];
    floats?: { value: number; name: string }[];
    vectors2?: { value: number[]; name: string }[];
    vectors3?: { value: number[]; name: string }[];
}

export interface MaterialCreatorMetadata {
    name: string;
    code: string;
    vertex: string;
    pixel: string;
    config: string;
    userConfig: MaterialCreatorUserConfig;
}

const template = `
EDITOR.MaterialCreator.Constructors['{{name}}'] = function (CustomMaterial) {
    {{code}}
}
`;

// Set EDITOR on Window
export module EDITOR {
    export class MaterialCreator {
        public static Constructors = { };
    }
}
window['EDITOR'] = window['EDITOR'] || { };
window['EDITOR'].MaterialCreator = EDITOR.MaterialCreator;

// Material Creator extension class
export default class MaterialCreatorExtension extends Extension<MaterialCreatorMetadata[]> {
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

    /**
     * Creates a new material
     * @param data: the data containing code, vertex, etc.
     */
    public createMaterial (data: MaterialCreatorMetadata): CustomEditorMaterial {
        const id = data.name + Tools.RandomId();

        Effect.ShadersStore[id + 'VertexShader'] = data.vertex;
        Effect.ShadersStore[id + 'PixelShader'] = data.pixel;

        let code: CustomMaterialCode = null;

        if (data.code) {
            // Add custom code
            let url = window.location.href;
            url = url.replace(Tools.GetFilename(url), '') + 'materials/' + data.name.replace(/ /g, '') + '.js';

            Extension.AddScript(template.replace('{{name}}', id).replace('{{code}}', data.code), url);

            code = <any> new Function();
            const instance = new EDITOR.MaterialCreator.Constructors[id](code);
        }

        // Custom config
        let config: CustomMaterialConfig = null;
        try {
            config = JSON.parse(data.config);
        } catch (e) { /* Silently */ }

        // Get or create material
        let material = <CustomEditorMaterial> this.scene.getMaterialByName(data.name);
        if (material) {
            material.config = config;
            material._shaderName = id;
            material.setCustomCode(code);
            return material;
        }
        else
            material = new CustomEditorMaterial(data.name, this.scene, id, code, config);

        // User config
        if (data.code) { 
            data.userConfig.textures.forEach(t => material.userConfig[t.name] = Texture.Parse(t.value, this.scene, 'file:')); // TODO: remove "file:"
            data.userConfig.floats.forEach(f =>   material.userConfig[f.name] = f.value);
            data.userConfig.vectors2.forEach(v => material.userConfig[v.name] = Vector2.FromArray(v.value));
            data.userConfig.vectors3.forEach(v => material.userConfig[v.name] = Vector3.FromArray(v.value));
        }
        
        return material;
    }

    /**
     * On apply the extension
     */
    public onApply (data: MaterialCreatorMetadata[]): void {
        this.datas = data;
        this.datas.forEach(d => this.createMaterial(d));
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): MaterialCreatorMetadata[] {
        if (this.scene.metadata && this.scene.metadata['MaterialCreator'])
            return this.scene.metadata['MaterialCreator'];

        return null;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: MaterialCreatorMetadata[]): void {
        this.datas = data;

        this.scene.metadata = this.scene.metadata || { };
        this.scene.metadata['MaterialCreator'] = [];

        // For each material
        this.datas.forEach(d => this.scene.metadata['MaterialCreator'].push(d));
    }
}

// Register
Extensions.Register('MaterialCreatorExtension', MaterialCreatorExtension);
