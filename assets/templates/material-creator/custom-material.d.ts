declare class CustomMaterial {
    init(): void;
    setUniforms(uniforms: string[], samplers: string[]): void;
    isReadyForSubMesh(mesh: BABYLON.Mesh, subMesh: BABYLON.SubMesh, defines: any): boolean;
    bindForSubMesh(world: BABYLON.Matrix, mesh: BABYLON.Mesh, subMesh: BABYLON.SubMesh, effect: BABYLON.Effect): void;
    dispose(): void;
}
