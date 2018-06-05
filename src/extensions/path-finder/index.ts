import { Scene, AbstractMesh } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import { IStringDictionary } from '../typings/typings';

import PathFinder from './path-finder';

// Metadatas
export interface PathFinderMetadata {
    name: string;
    size: number;
    rayHeight: number;
    rayLength: number;
    castMeshes: string[];
}

// Code extension class
export default class PathFinderExtension extends Extension<PathFinderMetadata[]> {
    // Public members
    public instances: IStringDictionary<PathFinder> = { };

    /**
     * Constructor
     * @param scene the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

    /**
     * On apply the extension
     */
    public onApply (data: PathFinderMetadata[]): void {
        this.datas = data;
        data.forEach(d => this._buildPathFinder(d));
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): PathFinderMetadata[] {
        if (!this.scene.metadata || !this.scene.metadata['PathFinderExtension'])
            return null;
        
        // Get data
        const data = <PathFinderMetadata[]> this.scene.metadata['PathFinderExtension'];

        return data;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: PathFinderMetadata[]): void {
        this.datas = data;

        this.scene.metadata = this.scene.metadata || { };
        this.scene.metadata['PathFinderExtension'] = [];

        // For each path finder config
        this.datas.forEach(d => this.scene.metadata['PathFinderExtension'].push(d));
    }

    // Builds the path finder
    private _buildPathFinder (data: PathFinderMetadata): void {
        const p = new PathFinder(data.size);
        const meshes: AbstractMesh[] = [];

        data.castMeshes.forEach(cm => {
            const m = this.scene.getMeshByName(cm);
            if (m)
                meshes.push(m);
        });

        p.fill(meshes, data.rayHeight, data.rayLength);

        // Save instance
        this.instances[data.name] = p;
    }
}

// Register
Extensions.Register('PathFinderExtension', PathFinderExtension);
