import { Scene, Effect, Tools } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import CustomMaterial from './material';

export interface MaterialCreatorMetadata {
    name: string;
    code: string;
    vertex: string;
    pixel: string;
}

const template = `
EDITOR.MaterialCreator.Constructors['{{name}}'] = function () {
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
    public createMaterial (data: MaterialCreatorMetadata): CustomMaterial {
        const name = data.name + Tools.RandomId();

        Effect.ShadersStore[name + 'VertexShader'] = data.vertex;
        Effect.ShadersStore[name + 'PixelShader'] = data.pixel;

        // Add custom code
        let url = window.location.href;
        url = url.replace(Tools.GetFilename(url), '') + 'materials/' + data.name.replace(/ /g, '') + '.js';

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.text = template
                        .replace('{{name}}', name)
                        .replace('{{code}}', data.code)
                        + '\n' + '//# sourceURL=' + url + '\n'
        document.head.appendChild(script);

        // Create material
        return new CustomMaterial(name, this.scene, new EDITOR.MaterialCreator.Constructors[name]());
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
