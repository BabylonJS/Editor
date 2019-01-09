import { Scene, Effect, Tools, Texture, Vector3, Vector2, Material } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import { exportScriptString } from '../tools/tools';

import { IStringDictionary } from '../typings/typings';

import CustomEditorMaterial, { CustomMaterialCode, CustomMaterialConfig } from './material';

export interface MaterialCreatorUserConfig {
    textures?: { value: any; name: string }[];
    floats?: { value: number; name: string }[];
    vectors2?: { value: number[]; name: string }[];
    vectors3?: { value: number[]; name: string }[];
}

export interface MaterialCreatorMetadata {
    name: string;
    code: string;
    compiledCode?: string;
    vertex: string;
    pixel: string;
    config: string;
    userConfig: MaterialCreatorUserConfig;
    isComplete?: boolean;
}

const template = `
EDITOR.MaterialCreator.Constructors['{{name}}'] = function () {
var returnValue = null;
var exports = { };

{{code}}
${exportScriptString}
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
export default class MaterialEditorExtension extends Extension<MaterialCreatorMetadata[]> {
    // Public members
    public instances: IStringDictionary<any> = { };

    // Static members
    public static Instance: MaterialEditorExtension = null;

    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];

        // Instance
        MaterialEditorExtension.Instance = this;
    }

    /**
     * Creates a new material
     * @param data: the data containing code, vertex, etc.
     */
    public createMaterial (data: MaterialCreatorMetadata, rootUrl?: string): CustomEditorMaterial {
        const id = data.name + Tools.RandomId();

        Effect.ShadersStore[id + 'VertexShader'] = data.vertex;
        Effect.ShadersStore[id + 'PixelShader'] = data.pixel;

        let code: CustomMaterialCode = null;
        let material: Material = null;

        if (data.code) {
            // Add custom code
            let url = window.location.href;
            url = url.replace(Tools.GetFilename(url), '') + 'materials/' + data.name.replace(/ /g, '') + '.js';

            Extension.AddScript(template.replace('{{name}}', id).replace('{{code}}', data.compiledCode || data.code), url);

            const ctor = EDITOR.MaterialCreator.Constructors[id]();
            if (ctor.prototype instanceof Material)
                code = material = new ctor(data.name, this.scene);
            else
                code = new ctor();
        }

        if (!(code instanceof Material)) {
            // Custom config
            let config: CustomMaterialConfig = null;
            try {
                config = JSON.parse(data.config);
            } catch (e) { /* Silently */ }

            // Get or create material
            let customMaterial = material = <CustomEditorMaterial> this.scene.getMaterialByName(data.name);
            if (customMaterial) {
                customMaterial.config = config;
                customMaterial._shaderName = id;
                customMaterial.setCustomCode(code);
            }
            else
                customMaterial = material = new CustomEditorMaterial(data.name, this.scene, id, code, config);

            // User config
            if (data.code) {
                data.userConfig.textures.forEach(t => customMaterial.userConfig[t.name] = Texture.Parse(t.value, this.scene, rootUrl || 'file:'));
                data.userConfig.floats.forEach(f =>   customMaterial.userConfig[f.name] = f.value);
                data.userConfig.vectors2.forEach(v => customMaterial.userConfig[v.name] = Vector2.FromArray(v.value));
                data.userConfig.vectors3.forEach(v => customMaterial.userConfig[v.name] = Vector3.FromArray(v.value));
            }
        }

        // Save instances
        this.instances[data.name] = {
            code: code,
            material: material
        };
        
        return <CustomEditorMaterial> material;
    }

    /**
     * On apply the extension
     */
    public onApply (data: MaterialCreatorMetadata[], rootUrl?: string): void {
        this.datas = data;
        this.datas.forEach(d => this.createMaterial(d, rootUrl));
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): MaterialCreatorMetadata[] {
        if (!this.scene.metadata || !this.scene.metadata['MaterialCreator'])
            return null;

        // Get data
        const data = <MaterialCreatorMetadata[]> this.scene.metadata['MaterialCreator'];

        // Apply user config
        data.forEach(d => {
            this.scene.materials.forEach(m => {
                if (!(m instanceof CustomEditorMaterial) || !m.config || m.name !== d.name)
                    return;

                d.userConfig.textures = [];
                m.config.textures.forEach(t => m.userConfig[t.name] && d.userConfig.textures.push({ value: (<Texture> m.userConfig[t.name]).serialize(), name: t.name }));

                d.userConfig.floats = [];
                m.config.floats.forEach(f => d.userConfig.floats.push({ value: <number> m.userConfig[f], name: f }));

                d.userConfig.vectors2 = [];
                m.config.vectors2.forEach(v => d.userConfig.vectors2.push({ value: (<Vector2> m.userConfig[v]).asArray(), name: v }));

                d.userConfig.vectors3 = [];
                m.config.vectors3.forEach(v => d.userConfig.vectors3.push({ value: (<Vector3> m.userConfig[v]).asArray(), name: v }));
            });
        });

        return data;
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
Extensions.Register('MaterialCreatorExtension', MaterialEditorExtension);
