class Material {
    // Public members
    public time: number = 0;

    /**
     * Constructor
     */
    constructor () {

    }

    /**
     * On initializing the material
     */
    public init (): void {

    }

    /**
     * On set the uniforms and samplers of the shader
     * @param uniforms: the uniforms names in the shader
     * @param samplers: the samplers names in the shader
     */
    public setUniforms (uniforms: string[], samplers: string[]): void {
        // Push custom uniforms
        uniforms.push('time');
    }

    /**
     * Returns if the material is ready for the given submesh
     * @param mesh: the source mesh
     * @param subMesh: the current sub mesh being rendered
     * @param defines: defines related to the current shader
     */
    public isReadyForSubMesh (mesh: BABYLON.Mesh, subMesh: BABYLON.SubMesh, defines: { [index: string]: boolean }): boolean {
        return true;
    }

    /**
     * Bind uniforms for submesh
     * @param world: the world matrix of the mesh
     * @param mesh: the source mesh
     * @param subMesh: the sub mesh being rendered
     * @param effect: the effect which will send the uniforms and samplers to the shader
     */
    public bindForSubMesh (world: BABYLON.Matrix, mesh: BABYLON.Mesh, subMesh: BABYLON.SubMesh, effect: BABYLON.Effect): void {
        const scene = mesh.getScene();

        // Time
        this.time += scene.getEngine().getDeltaTime() * 0.01;
        effect.setFloat('time', this.time);
    };

    /**
     * On dispose the material
     */
    public dispose (): void {

    };
}

return Material;
