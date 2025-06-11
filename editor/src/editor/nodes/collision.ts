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

        this.id = Tools.RandomId();
        this.uniqueId = UniqueNumber.Get();
    }

    public async setType(type: CollisionMeshType, sourceMesh: AbstractMesh): Promise<void> {
        sourceMesh.refreshBoundingInfo({
            applyMorph: true,
            applySkeleton: true,
        });

        this.type = type;

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

        if (this.geometry) {
            this.material = this._createMaterial();

            // Manage instances
            if (isMesh(sourceMesh)) {
                this.updateInstances(sourceMesh, bb);
            }
        }
    }

    public updateInstances(sourceMesh: Mesh, boundingInfo?: BoundingInfo): void {
        if (!boundingInfo) {
            sourceMesh.refreshBoundingInfo({
                applyMorph: true,
                applySkeleton: true,
            });

            boundingInfo = sourceMesh.getBoundingInfo();
        }

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
                collisionInstance.isVisible = false;

                switch (this.type) {
                    case "cube":
                        collisionInstance.position.copyFrom(boundingInfo.boundingBox.center);
                        collisionInstance.scaling.copyFrom(boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum));
                        break;

                    case "sphere":
                        collisionInstance.position.copyFrom(boundingInfo.boundingSphere.center);
                        collisionInstance.scaling.copyFrom(boundingInfo.boundingSphere.maximum.subtract(boundingInfo.boundingSphere.minimum));
                        break;

                    case "capsule":
                        collisionInstance.position.copyFrom(boundingInfo.boundingSphere.center);
                        break;
                }
            });
        }
    }

    private static _DebugMaterial: PBRMaterial | null = null;

    private _createMaterial(): PBRMaterial {
        if (CollisionMesh._DebugMaterial) {
            return CollisionMesh._DebugMaterial;
        }

        const material = new PBRMaterial(this.name, this._scene);
        material.unlit = true;
        material.id = Tools.RandomId();
        material.uniqueId = UniqueNumber.Get();

        MeshDebugPluginMaterial.PrepareMeshForTrianglesAndVerticesMode(this);
        new MeshDebugPluginMaterial(material, {
            wireframeThickness: 1,
            mode: BABYLON.MeshDebugMode.TRIANGLES,
            wireframeTrianglesColor: new BABYLON.Color3(0, 0, 0),
        });

        CollisionMesh._DebugMaterial = material;

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
        const geometry = sourceMesh.geometry;
        geometry?.releaseForMesh(sourceMesh);

        const collisionMesh = new CollisionMesh(sourceMesh.name, sourceMesh.getScene(), sourceMesh.parent, sourceMesh, true, false);
        collisionMesh.type = type;
        collisionMesh.id = sourceMesh.id;
        collisionMesh.uniqueId = sourceMesh.uniqueId;
        collisionMesh.metadata = sourceMesh.metadata;

        collisionMesh.position = sourceMesh.position;
        collisionMesh.rotation = sourceMesh.rotation;
        collisionMesh.rotationQuaternion = sourceMesh.rotationQuaternion;
        collisionMesh.scaling = sourceMesh.scaling;
        collisionMesh.isVisible = false;

        collisionMesh.metadata ??= {};
        collisionMesh.metadata.isCollisionMesh = true;

        setTimeout(() => {
            geometry?.applyToMesh(collisionMesh);
        }, 0);

        collisionMesh.material = collisionMesh._createMaterial();

        sourceMesh.instances.forEach((instance) => {
            const collisionInstance = collisionMesh.createInstance(instance.name);
            collisionInstance.id = instance.id;
            collisionInstance.uniqueId = instance.uniqueId;
            collisionInstance.metadata = instance.metadata;

            collisionInstance.position = instance.position;
            collisionInstance.rotation = instance.rotation;
            collisionInstance.rotationQuaternion = instance.rotationQuaternion;
            collisionInstance.scaling = instance.scaling;
            collisionInstance.isVisible = false;

            collisionInstance.metadata ??= {};
            collisionInstance.metadata.isCollisionMesh = true;
        });

        return collisionMesh;
    }
}

Node.AddNodeConstructor("CollisionMesh", (name, scene) => {
    return () => new CollisionMesh(name, scene);
});
