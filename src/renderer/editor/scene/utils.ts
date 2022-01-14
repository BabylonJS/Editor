import { join } from "path";

import { Scene, Node } from "babylonjs";

import { WorkSpace } from "../project/workspace";
import { SceneExporter } from "../project/scene-exporter";

import { TextureAssets } from "../assets/textures";
import { MaterialAssets } from "../assets/materials";

import { IExportedInspectorValue, SandboxMain } from "../../sandbox/main";

import { Editor } from "../editor";
import { Tools } from "../tools/tools";

export interface INodeResult {
    /**
     * Defines the Id of the node.
     */
    id: string;
    /**
     * Defines the name of the node.
     */
    name: string;
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
     * Defines the JSON representation of the scenE.
     */
    scene: any;
    /**
     * Defines the Root Url of the scene.
     */
    rootUrl: string;
    /**
     * Defines the name of the scene (project).
     */
    sceneName: string;
    /**
     * Defines the absolute path to the workspace.
     */
    workspacePath: string;
}

export interface ISerializablePropertyResult {
    /**
     * Defines the type of the property.
     */
    type: string;
    /**
     * Defines the name of the property.
     */
    propertyKey: string;
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
            .concat(this.getAllCameras())
            .concat(this.getAllTransformNodes());
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
     * Returns the list of all serializable properties from attached script(s) of the node idenfified
     * by the given Id.
     * @param id defines the id of the node to gets its serializable properties from attached script(s).
     */
    public async getNodeScriptSerializableProperties(id: string): Promise<IExportedInspectorValue[]> {
        const node = this._editor.scene!.getNodeByID(id);
        if (!node?.metadata?.script?.name) {
            return [];
        }

        const jsPath = Tools.GetSourcePath(WorkSpace.DirPath!, node.metadata.script.name);
        const properties = await SandboxMain.GetInspectorValues(jsPath);

        return properties ?? [];
    }

    /**
     * Returns the final scene in its JSON representation.
     */
    public getSceneJson(): ISceneJsonResult {
        return {
            workspacePath: WorkSpace.DirPath!,
            sceneName: WorkSpace.GetProjectName(),
            scene: SceneExporter.GetFinalSceneJson(this._editor),
            rootUrl: join(this._editor.assetsBrowser.assetsDirectory, "/"),
        };
    }
}
