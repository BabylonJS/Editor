import { Mesh, InstancedMesh } from 'babylonjs';
import { IStringDictionary } from '../typings/typings';

export class Prefab {
    nodes: string[];
    nodeIds: string[];
    instances: IStringDictionary<any[]>;

    sourceMeshes?: Mesh[];
    sourceMesh?: Mesh;
    sourceInstances?: IStringDictionary<InstancedMesh[]>;
}
