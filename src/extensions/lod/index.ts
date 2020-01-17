import { Scene, Mesh, SceneSerializer, SceneLoader } from 'babylonjs';

import Extension from '../extension';
import Extensions from '../extensions';

export interface LODLevelMetadata {
    distance: number;
    meshSerializationObject: any;
}

export interface LODMetadata {
    meshId: string;
    levels: LODLevelMetadata[];
}

export default class LODExtension extends Extension<LODMetadata[]> {
    /**
     * Constructor.
     * @param scene: the babylonjs scene reference.
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

    /**
     * On apply the extension.
     */
    public async onApply (datas: LODMetadata[], rootUrl?: string): Promise<void> {
        this.datas = datas;
        this._applyLODs();
    }

    /**
     * Called by the editor when serializing the project.
     */
    public onSerialize (): LODMetadata[] {
        return this.datas;
    }

    /**
     * On load the extension (called by the editor when loading a scene).
     * @param datas the data of the extension previously saved.
     */
    public onLoad (datas: LODMetadata[]): void {
        this.datas = datas;
        this._applyLODs();
    }

    /**
     * Returns the LOD metadatas associated to the given source mesh.
     * @param id the id of the source mesh.
     */
    public getMetadataFromMeshId (id: string): LODMetadata {
        for (const d of this.datas) {
            if (d.meshId === id)
                return d;
        }

        return null;
    }

    /**
     * Serializes the given mesh to a JSON representation.
     * @param mesh the mesh to serialize.
     */
    public serializeMesh (mesh: Mesh): any {
        const lod = SceneSerializer.SerializeMesh(mesh, false, false);
        return lod;
    }

    // Applies all the lods
    private async _applyLODs (): Promise<void> {
        for (const data of this.datas) {
            const sourceMesh = <Mesh> this.scene.getMeshByID(data.meshId);
            if (!sourceMesh)
                continue;
            
            for (const level of data.levels) {
                const blob = new Blob([JSON.stringify(level.meshSerializationObject)]);
                blob['name'] = data.meshId + '.babylon';

                const result = await SceneLoader.ImportMeshAsync('', 'file:', <File> blob, this.scene);
                const mesh = <Mesh> result.meshes[0];
                mesh.material = sourceMesh.material;
                mesh.skeleton = sourceMesh.skeleton;
                mesh.doNotSerialize = true;
                sourceMesh.addLODLevel(level.distance, mesh);
            };
        }
    }
}

Extensions.Register('LODExtension', LODExtension);
