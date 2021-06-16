import { join } from "path";

import { Scene, Node } from "babylonjs";

import { Project } from "../project/project";
import { WorkSpace } from "../project/workspace";
import { SceneExporter } from "../project/scene-exporter";

import { TextureAssets } from "../assets/textures";
import { MaterialAssets } from "../assets/materials";

import { Editor } from "../editor";

export interface INodeResult {
    /**
     * Defines the name of the node.
     */
    name: string;
    /**
     * Defines the Id of the node.
     */
    id: string;
}

export interface IMeshResult extends INodeResult {
    /**
     * Defines the type of the mesh.
     */
    type: string;
}

export interface IAssetResult {
    /**
     * Defines the name drawn in the editor.
     */
    name: string;
    /**
     * Defines the base64 value of the texture.
     */
    base64: string;
}

export interface IMaterialResult extends IAssetResult {
    /**
     * Defines the type of material.
     */
    type: string;
}

export interface ISceneJsonResult {
    /**
     * Defines the Root Url of the scene.
     */
    rootUrl: string;
    /**
     * Defines the absolute path to the workspace.
     */
    workspacePath: string;
    /**
     * Defines the name of the scene (project).
     */
    sceneName: string;
    /**
     * Defines the JSON representation of the scenE.
     */
    scene: any;
}

export class SceneUtils {
    /**
     * Defines the current scene.
     */
    public readonly scene: Scene;
    
    private readonly _editor: Editor;

    /**
     * Constructor.
     * @param scene defines the scene reference.
     */
    public constructor(editor: Editor) {
        this._editor = editor;
        this.scene = editor.scene!;
    }

    /**
     * Returns the list of all available nodes in the scene.
     */
    public getAllNodes(): INodeResult[] {
        return (this.getAllMeshes() as INodeResult[])
                    .concat(this.getAllLights())
                    .concat(this.getAllCameras());
    }

    /**
     * Returns the list of all meshes.
     */
    public getAllMeshes(): IMeshResult[] {
        return this.scene.meshes.filter((m) => !m._masterMesh).map((m) => ({ id: m.id, name: m.name, type: m.getClassName() }));
    }

    /**
     * Returns the list of all lights.
     */
    public getAllLights(): INodeResult[] {
        return this._getAsNodeResult(this.scene.lights);
    }

    /**
     * Returns the list of all cameras.
     */
    public getAllCameras(): INodeResult[] {
        return this._getAsNodeResult(this.scene.cameras.filter((c) => !c.doNotSerialize));
    }

    /**
     * Returns the list of all transform nodes.
     */
    public getAllTransformNodes(): INodeResult[] {
        return this._getAsNodeResult(this.scene.transformNodes);
    }

    /**
     * Returns the list of all particle systems.
     */
    public getAllParticleSystems(): INodeResult[] {
        return this.scene.particleSystems.map((ps) => ({ name: ps.name, id: ps.id }));
    }

    /**
     * Returns the given nodes as INodeResult.
     */
    private _getAsNodeResult(nodes: Node[]): INodeResult[] {
        return nodes.map((n) => ({ name: n.name, id: n.id }));
    }

    /**
     * Returns the list of all sounds in the scene.
     */
    public getAllSounds(): string[] {
        return this.scene.mainSoundTrack.soundCollection.map((s) => s.name);
    }

    /**
     * Returns the list of all animation groups in the scene.
     */
    public getAllAnimationGroups(): string[] {
        return this.scene.animationGroups.map((a) => a.name);
    }

    /**
     * Returns the list of all skeletons.
     */
    public getAllSkeletons(): INodeResult[] {
        return this.scene.skeletons.map((s) => ({ name: s.name, id: s.id }));
    }

    /**
     * Returns the list of all textures in the scene.
     */
    public getAllTextures(): IAssetResult[] {
        return this._editor.assets.getAssetsOf(TextureAssets)?.map((i) => ({ name: i.id, base64: i.base64 })) ?? [];
    }

    /**
     * Returns the list of all textures in the scene.
     */
    public getAllMaterials(): IMaterialResult[] {
        return this._editor.assets.getAssetsOf(MaterialAssets)?.map((i) => ({ name: i.id, base64: i.base64, type: this.scene.getMaterialByName(i.id)?.getClassName() ?? "Material" })) ?? [];
    }

    /**
     * Returns the final scene in its JSON representation.
     */
    public getSceneJson(): ISceneJsonResult {
        return {
            rootUrl: join(Project.DirPath!),
            workspacePath: WorkSpace.DirPath!,
            sceneName: WorkSpace.GetProjectName(),
            scene: SceneExporter.GetFinalSceneJson(this._editor),
        };
    }
}
