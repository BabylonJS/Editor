import { join, dirname } from "path/posix";

import { GetClass, Matrix, Node, Scene, SerializationHelper, serialize, Tools, TransformNode } from "babylonjs";

import { UniqueNumber } from "../../tools/tools";

import { projectConfiguration } from "../../project/configuration";
import { loadScene, SceneLoadResult } from "../../project/load/scene";

import { Editor } from "../main";

export class SceneLinkNode extends TransformNode {
    private _editor: Editor;

    @serialize()
    private _relativePath: string | null = null;

    public get relativePath(): string | null {
        return this._relativePath;
    }

    /**
     * Constructor.
     * @param name defines the name of the scene component.
     * @param scene defines the reference to the scene where to add the scene component.
     */
    public constructor(name: string, scene: Scene, editor: Editor) {
        super(name, scene);

        this._editor = editor;

        this.id = Tools.RandomId();
        this.uniqueId = UniqueNumber.Get();
    }

    public async setRelativePath(relativePath: string): Promise<SceneLoadResult | null> {
        if (relativePath === this._relativePath || !projectConfiguration.path) {
            return null;
        }

        this._relativePath = relativePath;

        const projectDir = dirname(projectConfiguration.path);
        const absolutePath = join(projectDir, relativePath);

        const result = await loadScene(this._editor, projectDir, absolutePath, {
            asLink: true,
        });

        return result;
    }

    /**
     * Releases resources associated with this scene link.
     */
    public dispose(): void {
        super.dispose(false, true);
    }

    /**
     * Gets the current object class name.
     * @return the class name
     */
    public getClassName(): string {
        return "SceneLinkNode";
    }

    public parse(data: any): void {
        SerializationHelper.Parse(() => this, data, this._scene, "");

        if (data.localMatrix) {
            this.setPreTransformMatrix(Matrix.FromArray(data.localMatrix));
        } else if (data.pivotMatrix) {
            this.setPivotMatrix(Matrix.FromArray(data.pivotMatrix));
        }

        this.setEnabled(data.isEnabled);

        this._waitingParsedUniqueId = data.uniqueId;

        // Parent
        if (data.parentId !== undefined) {
            this._waitingParentId = data.parentId;
        }

        if (data.parentInstanceIndex !== undefined) {
            this._waitingParentInstanceIndex = data.parentInstanceIndex;
        }

        // Animations
        if (data.animations) {
            for (let animationIndex = 0; animationIndex < data.animations.length; animationIndex++) {
                const parsedAnimation = data.animations[animationIndex];
                const internalClass = GetClass("BABYLON.Animation");
                if (internalClass) {
                    this.animations.push(internalClass.Parse(parsedAnimation));
                }
            }
            Node.ParseAnimationRanges(this, data, this._scene);
        }

        if (data.autoAnimate) {
            this._scene.beginAnimation(
                this,
                data.autoAnimateFrom,
                data.autoAnimateTo,
                data.autoAnimateLoop,
                data.autoAnimateSpeed || 1.0
            );
        }
    }
}
