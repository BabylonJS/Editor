import {
    AbstractMesh, BoundingInfo, CreateBoxVertexData, CreateCapsuleVertexData, CreateSphereVertexData, Geometry, Mesh, MeshDebugPluginMaterial,
    Node, PBRMaterial, QuadraticErrorSimplification, Scene, serialize, Tools, Vector3,
} from "babylonjs";

import { UniqueNumber } from "../../tools/tools";
import { isMesh } from "../../tools/guards/nodes";

export type CollisionMeshType = "none" | "cube" | "sphere" | "capsule" | "lod";

export class CollisionMesh extends Mesh {
    @serialize()
    public type: CollisionMeshType = "none";

    /**
     * Constructor
     * @param name The value used by scene.getMeshByName() to do a lookup.
     * @param scene The scene to add this mesh to.
     * @param parent The parent of this mesh, if it has one
     * @param source An optional Mesh from which geometry is shared, cloned.
     * @param doNotCloneChildren When cloning, skip cloning child meshes of source, default False.
     *                  When false, achieved by calling a clone(), also passing False.
     *                  This will make creation of children, recursive.
     * @param clonePhysicsImpostor When cloning, include cloning mesh physics impostor, default True.
     */
    public constructor(
        name: string,
        scene: Scene,
        parent?: Node | null,
        source?: Mesh | null,
        doNotCloneChildren?: boolean,
        clonePhysicsImpostor?: boolean,
    ) {
        super(name, scene, parent, source, doNotCloneChildren, clonePhysicsImpostor);
    }

    public async setType(type: CollisionMeshType, sourceMesh: AbstractMesh): Promise<void> {
        sourceMesh.refreshBoundingInfo({
            applyMorph: true,
            applySkeleton: true,
        });

        const bb = sourceMesh.getBoundingInfo();

        switch (type) {
            case "cube":
                this._createCubeCollisionMesh(sourceMesh, bb);
                break;

            case "sphere":
                this._createSphereCollisionMesh(sourceMesh, bb);
                break;

            case "capsule":
                this._createCapsuleCollisionMesh(sourceMesh, bb);
                break;

            case "lod":
                if (isMesh(sourceMesh)) {
                    await this._createLodCollisionMesh(sourceMesh);
                }
                break;
        }

        this.type = type;

        if (this.geometry) {
            this.material?.dispose();
            this.material = this._createMaterial();

            // Manage instances
            while (this.instances.length) {
                this.instances[0].dispose(false, false);
            }

            if (isMesh(sourceMesh)) {
                sourceMesh.instances.forEach((instance) => {
                    const collisionInstance = this.createInstance(this.name);
                    collisionInstance.parent = instance;
                    collisionInstance.id = Tools.RandomId();
                    collisionInstance.uniqueId = UniqueNumber.Get();

                    switch (type) {
                        case "cube":
                            collisionInstance.position.copyFrom(bb.boundingBox.center);
                            collisionInstance.scaling.copyFrom(bb.boundingBox.maximum.subtract(bb.boundingBox.minimum));
                            break;

                        case "sphere":
                            collisionInstance.position.copyFrom(bb.boundingSphere.center);
                            collisionInstance.scaling.copyFrom(bb.boundingSphere.maximum.subtract(bb.boundingSphere.minimum));
                            break;

                        case "capsule":
                            collisionInstance.position.copyFrom(bb.boundingSphere.center);
                            break;
                    }
                });
            }
        }
    }

    private _createMaterial(): PBRMaterial {
        const material = new PBRMaterial(this.name, this._scene);
        material.unlit = true;

        MeshDebugPluginMaterial.PrepareMeshForTrianglesAndVerticesMode(this);
        new MeshDebugPluginMaterial(material, {
            mode: BABYLON.MeshDebugMode.TRIANGLES,
            wireframeTrianglesColor: new BABYLON.Color3(0, 0, 0),
            wireframeThickness: 0.7
        });

        return material;
    }

    private _createCubeCollisionMesh(sourceMesh: AbstractMesh, boundingInfo: BoundingInfo): void {
        const geometry = new Geometry(Tools.RandomId(), sourceMesh.getScene(), CreateBoxVertexData({
            size: 1,
        }));

        geometry.uniqueId = UniqueNumber.Get();
        geometry.applyToMesh(this);
        this.position.copyFrom(boundingInfo.boundingBox.center);
        this.scaling.copyFrom(boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum));
    }

    private _createSphereCollisionMesh(sourceMesh: AbstractMesh, boundingInfo: BoundingInfo): void {
        const geometry = new Geometry(Tools.RandomId(), sourceMesh.getScene(), CreateSphereVertexData({
            diameter: 1,
            segments: 16,
        }));

        geometry.uniqueId = UniqueNumber.Get();
        geometry.applyToMesh(this);
        this.position.copyFrom(boundingInfo.boundingSphere.center);
        this.scaling.copyFrom(boundingInfo.boundingSphere.maximum.subtract(boundingInfo.boundingSphere.minimum));
    }

    private _createCapsuleCollisionMesh(sourceMesh: AbstractMesh, boundingInfo: BoundingInfo): void {
        const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingSphere.minimum);

        const geometry = new Geometry(Tools.RandomId(), sourceMesh.getScene(), CreateCapsuleVertexData({
            height: Math.abs(size.y),
            radius: boundingInfo.boundingSphere.radius,

            subdivisions: 16,
            tessellation: 16,
            capSubdivisions: 12,
            topCapSubdivisions: 12,
            orientation: Vector3.Up(),
        }));

        geometry.uniqueId = UniqueNumber.Get();
        geometry.applyToMesh(this);
        this.position.copyFrom(boundingInfo.boundingSphere.center);
    }

    private _createLodCollisionMesh(sourceMesh: Mesh): Promise<void> {
        return new Promise<void>((resolve) => {
            const decimator = new QuadraticErrorSimplification(sourceMesh);

            decimator.simplify({ distance: 100, quality: 0.01, optimizeMesh: true }, (sm) => {
                const geometry = sm.geometry;
                if (geometry) {
                    geometry.id = Tools.RandomId();
                    geometry.uniqueId = UniqueNumber.Get();
                    geometry.applyToMesh(this);
                }

                sm.dispose(false, false);

                resolve();
            });
        });
    }

    /**
      * Gets the current object class name.
      * @return the class name
      */
    public getClassName(): string {
        return "CollisionMesh";
    }

    /**
     * Creates a new collision mesh based on the given source mesh parameters.
     * @param sourceMesh defines the source mesh to copy in order to transform as collision mesh.
     * @param type defines the collision type for the mesh.
     */
    public static CreateFromSourceMesh(sourceMesh: Mesh, type: CollisionMeshType): CollisionMesh {
        const collisionMesh = new CollisionMesh(sourceMesh.name, sourceMesh.getScene(), sourceMesh.parent, sourceMesh, true, false);
        collisionMesh.id = sourceMesh.id;
        collisionMesh.uniqueId = sourceMesh.uniqueId;
        collisionMesh.type = type;
        collisionMesh.isVisible = false;

        sourceMesh.instances.forEach((instance) => {
            const collisionInstance = collisionMesh.createInstance(collisionMesh.name);
            collisionInstance.id = instance.id;
            collisionInstance.uniqueId = instance.uniqueId;
            collisionInstance.metadata = instance.metadata;

            collisionInstance.position = instance.position;
            collisionInstance.rotation = instance.rotation;
            collisionInstance.rotationQuaternion = instance.rotationQuaternion;
            collisionInstance.scaling = instance.scaling;
            collisionInstance.isVisible = false;
        });

        return collisionMesh;
    }
}

Node.AddNodeConstructor("CollisionMesh", (name, scene) => {
    return () => new CollisionMesh(name, scene);
});
