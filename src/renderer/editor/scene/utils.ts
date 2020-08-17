import { join } from "path";

import { Scene, Node } from "babylonjs";

import { ProjectExporter } from "../project/project-exporter";
import { Project } from "../project/project";

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
        return this.getAllMeshes()
                    .concat(this.getAllLights())
                    .concat(this.getAllCameras());
    }

    /**
     * Returns the list of all meshes.
     */
    public getAllMeshes(): INodeResult[] {
        return this._getAsNodeResult(this.scene.meshes.filter((m) => !m._masterMesh));
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
     * Returns the final scene in its JSON representation.
     */
    public getSceneJson(): { rootUrl: string; scene: any; } {
        return {
            rootUrl: join(Project.DirPath!),
            scene: ProjectExporter.GetFinalSceneJson(this._editor),
        };
    }
}
