import { join, dirname } from "path";
import { Nullable } from "../../../shared/types";

import * as React from "react";

import { Mesh, SceneLoader, PhysicsImpostor, SubMesh } from "babylonjs";
import { GUI } from "dat.gui";

import { MeshesAssets } from "../assets/meshes";
import { Tools } from "../tools/tools";

import { Inspector } from "../components/inspector";
import { NodeInspector } from "./node-inspector";

export class MeshInspector extends NodeInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: Mesh;

    private _physicsImpostor: string = "";
    private _numBoneInfluencers: number = 0;

    private _physicsFolder: Nullable<GUI> = null;
    private _lodFolder: Nullable<GUI> = null;

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        if (this.selectedObject instanceof SubMesh) {
            this.selectedObject = this.selectedObject.getMesh() as Mesh;
        }

        this.addCommon();
        this.addScript();
        this.addRendering();
        this.addTransforms();
        this.addCollisions();
        this.addPhysics();
        this.addSkeleton();
        this.addLods();
    }

    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();
        common.add(this.selectedObject, "isVisible").name("Is Visible");
        common.add(this.selectedObject.metadata, "isPickable").name("Is Pickable");

        return common;
    }

    /**
     * Adds the rendering editable properties
     */
    protected addRendering(): GUI {
        const rendering = this.tool!.addFolder("Rendering");
        rendering.open();
        rendering.add(this.selectedObject, "receiveShadows").name("Receive Shadows");
        rendering.add(this.selectedObject, "applyFog").name("Apply Fog");

        return rendering;
    }

    /**
     * Adds the collisions properties.
     */
    protected addCollisions(): void {
        const collisions = this.tool!.addFolder("Collisions");
        collisions.open();

        collisions.add(this.selectedObject, "checkCollisions").name("Check Collisions");
        collisions.add(this.selectedObject, "collisionMask").name("Collision Mask");

        this.addVector(collisions, "Ellipsoid", this.selectedObject, "ellipsoid");
        this.addVector(collisions, "Ellipsoid Offset", this.selectedObject, "ellipsoidOffset");
    }

    /**
     * Adds the transforms editable properties.
     */
    protected addTransforms(): GUI {
        const transforms = this.tool!.addFolder("Transforms");
        transforms.open();

        const position = transforms.addFolder("Position");
        position.open();
        position.add(this.selectedObject.position, "x").step(0.1);
        position.add(this.selectedObject.position, "y").step(0.1);
        position.add(this.selectedObject.position, "z").step(0.1);

        const rotation = transforms.addFolder("Rotation");
        rotation.open();
        rotation.add(this.selectedObject.rotation, "x").step(0.1);
        rotation.add(this.selectedObject.rotation, "y").step(0.1);
        rotation.add(this.selectedObject.rotation, "z").step(0.1);

        const scaling = transforms.addFolder("Scaling");
        scaling.open();
        scaling.add(this.selectedObject.scaling, "x").step(0.1);
        scaling.add(this.selectedObject.scaling, "y").step(0.1);
        scaling.add(this.selectedObject.scaling, "z").step(0.1);

        return transforms;
    }

    /**
     * Adds the physics editable properties.
     */
    protected addPhysics(): void {
        this._physicsFolder = this._physicsFolder ?? this.tool!.addFolder("Physics");
        this._physicsFolder.open();

        // Get impostor type
        const impostors: string[] = ["NoImpostor", "SphereImpostor", "BoxImpostor", "CylinderImpostor"];
        if (this.selectedObject.physicsImpostor) {
            this._physicsImpostor = impostors.find((i) => this.selectedObject.physicsImpostor!.type === PhysicsImpostor[i]) ?? impostors[0];
        } else {
            this._physicsImpostor = impostors[0];
        }

        // Impostor
        this._physicsFolder.add(this, "_physicsImpostor", impostors).name("Impostor").onChange(() => {
            if (this.selectedObject.physicsImpostor && this.selectedObject.physicsImpostor.type === PhysicsImpostor[this._physicsImpostor]) {
                return;
            }

            this.selectedObject.physicsImpostor = new PhysicsImpostor(this.selectedObject, PhysicsImpostor[this._physicsImpostor], {
                mass: 1,
            });
            this.selectedObject.physicsImpostor.sleep();

            while (this._physicsFolder!.__controllers.length) {
                this._physicsFolder!.remove(this._physicsFolder!.__controllers[0]);
            }
            this.addPhysics();
        });

        // Impostor properties
        if (this.selectedObject.physicsImpostor && this.selectedObject.physicsImpostor.type !== PhysicsImpostor.NoImpostor) {
            this._physicsFolder.add(this.selectedObject.physicsImpostor, "mass").min(0).step(0.1).name("Mass").onChange(() => this.selectedObject.physicsImpostor!["_bodyUpdateRequired"] = false);
            this._physicsFolder.add(this.selectedObject.physicsImpostor, "restitution").min(0).step(0.1).name("Restitution").onChange(() => this.selectedObject.physicsImpostor!["_bodyUpdateRequired"] = false);
            this._physicsFolder.add(this.selectedObject.physicsImpostor, "friction").min(0).step(0.1).name("Friction").onChange(() => this.selectedObject.physicsImpostor!["_bodyUpdateRequired"] = false);
        }
    }

    /**
     * Adds all skeleton editable properties.
     */
    protected addSkeleton(): void {
        if (!this.selectedObject.skeleton) { return; }

        // Skeleton
        const skeleton = this.tool!.addFolder("Skeleton");
        skeleton.open();

        skeleton.add(this.selectedObject.skeleton, "needInitialSkinMatrix").name("Need Initial Skin Matrix");
        skeleton.add(this.selectedObject.skeleton, "useTextureToStoreBoneMatrices").name("Use Texture To Store Bone Matrices");

        this._numBoneInfluencers = this.selectedObject.numBoneInfluencers;
        skeleton.add(this, "_numBoneInfluencers").min(0).max(8).step(1).name("Num Bone Influencers").onChange(() => {
            this._numBoneInfluencers = this._numBoneInfluencers >> 0;
            this.selectedObject.numBoneInfluencers = this._numBoneInfluencers;
        });

        // Animation ranges
        const ranges = this.selectedObject.skeleton.getAnimationRanges();
        if (ranges && ranges.length > 0) {
            const animationRanges = skeleton.addFolder("Animation Ranges");
            animationRanges.open();

            ranges.forEach((r) => {
                if (!r) { return; }

                animationRanges.addButton(r.name).onClick(() => {
                    this.selectedObject._scene.stopAnimation(this.selectedObject.skeleton);
                    this.selectedObject.skeleton?.beginAnimation(r.name, true, 1.0);
                });
            });
        }
    }

    /**
     * Adds the lod editable properties.
     */
    protected addLods(): void {
        if (this.selectedObject._masterMesh || this.selectedObject.isAnInstance) { return; }

        this._lodFolder = this.tool!.addFolder("Level Of Details");
        this._lodFolder.open();

        // Add new lod
        this._lodFolder.add(this, "_addLod").name("Add LOD");

        // List available lods.
        const lods = this.selectedObject.getLODLevels();
        if (!lods.length) {
            this._lodFolder.addTextBox("No Level Of Details available.");
            return;
        }

        lods.forEach((lod) => {
            const folder = this._lodFolder!.addFolder(lod.mesh?.name ?? "None");
            folder.open();
            folder.add(lod, "distance").min(0).name("Distance");
            
            const assets = this.editor.assets.getAssetsOf(MeshesAssets);
            
            const o = {
                assetId: lod.mesh?.name ?? "None",
                remove: () => this._removeLod(folder, lod.mesh),
            };

            folder.addSuggest(o, "assetId", ["None"].concat(assets!.map((a) => a.id)), {
                onShowIcon: (i) => {
                    const asset = assets?.find((a) => a.id === i);
                    if (!asset) { return undefined; }
                    
                    return <img src={asset.base64} style={{ width: 20, height: 20 }}></img>;
                },
                onShowTooltip: (i) => {
                    const asset = assets?.find((a) => a.id === i);
                    if (!asset) { return undefined; }
                    
                    return <img src={asset.base64} style={{ maxWidth: "100%", width: 100, maxHeight: "100%", height: 100 }}></img>;
                },
            }).onChange(async () => {
                const asset = assets?.find((a) => a.id === o.assetId);
                if (!asset) { return; }
                
                const rootUrl = join(dirname(asset.key), "/");
                
                const result = await SceneLoader.ImportMeshAsync("", rootUrl, asset.id, this.editor.scene!);
                result.meshes.forEach((m) => m.material && m.material.dispose(true, true));
                result.particleSystems.forEach((ps) => ps.dispose(true));
                result.skeletons.forEach((s) => s.dispose());
                
                const mesh = result.meshes[0];
                if (!mesh || !(mesh instanceof Mesh)) { return; }
                
                mesh.id = Tools.RandomId();
                mesh.name = o.assetId;
                mesh.material = this.selectedObject.material;
                mesh.skeleton = this.selectedObject.skeleton;
                mesh.position.set(0, 0, 0);
                
                this.selectedObject.removeLODLevel(lod.mesh!);
                if (lod.mesh) { lod.mesh.dispose(true, false); }
                
                this.selectedObject.addLODLevel(lod.distance, mesh);

                this._lodFolder!.parent.removeFolder(this._lodFolder!);
                this.addLods();
            });

            folder.add(o, "remove").name("Remove");
        });
    }

    /**
     * Adds a new lod to the mesh.
     */
    // @ts-ignore
    private async _addLod(): Promise<void> {
        const hasNullLod = this.selectedObject.getLODLevels().find((lod) => !lod.mesh);
        if (hasNullLod) { return; }
        this.selectedObject.addLODLevel(100, null);

        this._lodFolder!.parent.removeFolder(this._lodFolder!);
        this.addLods();
    }

    /**
     * Removes the given mesh from LOD levels.
     */
    private _removeLod(folder: GUI, mesh: Nullable<Mesh>): void {
        this.selectedObject.removeLODLevel(mesh!);
        if (mesh) { mesh.dispose(true, false); }

        folder.parent.removeFolder(folder);
    }
}

Inspector.registerObjectInspector({
    ctor: MeshInspector,
    ctorNames: ["Mesh", "SubMesh"],
    title: "Mesh",
});
