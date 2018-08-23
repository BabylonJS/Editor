import { Mesh, InstancedMesh } from 'babylonjs';
import { IStringDictionary } from '../typings/typings';

export interface Prefab {
    isPrefab: boolean; // Used to edition tools to check isPrefab
    nodes: string[];
    nodeIds: string[];
    instances: IStringDictionary<any[]>;

    sourceMeshes?: Mesh[];
    sourceMesh?: Mesh;
    sourceInstances?: IStringDictionary<InstancedMesh[]>;
}
