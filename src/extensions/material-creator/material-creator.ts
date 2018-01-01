import { Scene } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

export interface MaterialCreatorMetadata {
    name: string;
    code: string;
    vertex: string;
    pixel: string;
}

// Code extension class
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
     * On apply the extension
     */
    public onApply (data: MaterialCreatorMetadata[]): void {
        this.datas = data;
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
