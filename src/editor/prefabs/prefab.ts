import { Mesh, InstancedMesh } from 'babylonjs';

export interface Prefab {
    node: string;
    nodeId: string;
    instances: any[];

    sourceMesh?: Mesh;
    sourceInstances?: InstancedMesh[];
}
