interface CustomMaterialInterface {
    constructor: () => void;
    isReadyForSubMesh: (mesh: BABYLON.Mesh, subMesh: BABYLON.SubMesh, defines: any, uniforms: string[], samplers: string[]) => boolean;
    bindForSubMesh: (world: BABYLON.Matrix, mesh: BABYLON.Mesh, subMesh: BABYLON.SubMesh, effect: BABYLON.Effect) => void;
    dispose: () => void;
}
