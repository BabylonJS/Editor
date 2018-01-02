import { Scene, Effect, Tools } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import CustomEditorMaterial, { CustomMaterialCode } from './material';
import { IStringDictionary } from 'babylonjs-editor';

export interface MaterialCreatorMetadata {
    name: string;
    code: string;
    vertex: string;
    pixel: string;
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
        Effect.ShadersStore[data.name + 'VertexShader'] = data.vertex;
        Effect.ShadersStore[data.name + 'PixelShader'] = data.pixel;

        let code: CustomMaterialCode = null;

        if (data.code) {
            const name = data.name + Tools.RandomId();
            
            // Add custom code
            let url = window.location.href;
            url = url.replace(Tools.GetFilename(url), '') + 'materials/' + data.name.replace(/ /g, '') + '.js';

            Extension.AddScript(template.replace('{{name}}', name).replace('{{code}}', data.code), url);

            code = <any> { };
            const instance = new EDITOR.MaterialCreator.Constructors[name](code);
        }

        // Get or create material
        const material = <CustomEditorMaterial> this.scene.getMaterialByName(data.name);
        if (material) {
            material.setCustomCode(code);
            return material;
        }
        
        return new CustomEditorMaterial(data.name, this.scene, code);
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
