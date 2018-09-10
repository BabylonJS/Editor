import { Light, InstancedMesh, SpotLight, PointLight, HemisphericLight, DirectionalLight, Mesh } from 'babylonjs';
import { IStringDictionary } from '../typings/typings';

export type PrefabNodeType = 
    SpotLight | PointLight | DirectionalLight |
    Mesh | InstancedMesh;

export interface Prefab {
    isPrefab: boolean; // Used to edition tools to check isPrefab
    nodes: string[];
    nodeIds: string[];
    instances: IStringDictionary<any[]>;

    sourceMeshes?: PrefabNodeType[];
    sourceMesh?: PrefabNodeType;
    sourceInstances?: IStringDictionary<PrefabNodeType[]>;
}
