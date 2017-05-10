declare module BABYLON.EDITOR.EXTENSIONS {
    interface ISoftBodyData {
        meshName: string;
        applied: boolean;
        width: number;
        height: number;
        subdivisions: number;
        onlySelectedJoints: boolean;
        firstJoints: number;
        constantForce: number;
        constantForceInterval: number;
        constantForceDirection: Vector3;
        freeFall: boolean;
        distanceFactor: number;
    }
    interface ISoftBodyConfiguration {
        meshName: string;
        spheres: Mesh[];
        beforeRenderFunction?: () => void;
    }
    class SoftBodyBuilderExtension implements IEditorExtension<ISoftBodyData[]> {
        extensionKey: string;
        applyEvenIfDataIsNull: boolean;
        configs: ISoftBodyConfiguration[];
        private _scene;
        /**
        * Constructor
        * @param scene: the babylon.js scene
        */
        constructor(scene: Scene);
        apply(data: ISoftBodyData[]): void;
        getConfiguration(meshName: string): ISoftBodyConfiguration;
        private _configureMesh(mesh, data);
        private _createJoint(impostor1, impostor2, distanceBetweenPoints);
    }
}
