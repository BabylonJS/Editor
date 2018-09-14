import { InstancedMesh, SpotLight, PointLight, DirectionalLight, Mesh, ParticleSystem } from 'babylonjs';
import { IStringDictionary } from '../typings/typings';

export type PrefabNodeType = 
    SpotLight | PointLight | DirectionalLight |
    InstancedMesh |
    ParticleSystem;

export interface Prefab {
    isPrefab: boolean; // Used to edition tools to check isPrefab
    nodes: string[];
    nodeIds: string[];
    instances: IStringDictionary<any[]>;

    sourceNodes?: (Mesh | PrefabNodeType)[];
    sourceNode?: Mesh | PrefabNodeType;
    
    sourceInstances?: IStringDictionary<PrefabNodeType[]>;
}
