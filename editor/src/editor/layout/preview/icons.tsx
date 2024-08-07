import { Component, ReactNode } from "react";

import { FaCamera, FaLightbulb } from "react-icons/fa";

import { Mesh, Node, Scene, Vector2 } from "babylonjs";

import { Editor } from "../../main";

import { projectVectorOnScreen } from "../../../tools/maths/projection";
import { isCamera, isEditorCamera, isLight } from "../../../tools/guards/nodes";

export interface IEditorPreviewIconsProps {
    editor: Editor;
}

export interface IEditorPreviewIconsState {
    buttons: _IButtonData[];
}

interface _IButtonData {
    node: Node;
    position: Vector2;
}

export class EditorPreviewIcons extends Component<IEditorPreviewIconsProps, IEditorPreviewIconsState> {
    private _tempMesh: Mesh | null = null;
    private _renderFunction: (() => void) | null = null;

    public constructor(props: IEditorPreviewIconsProps) {
        super(props);

        this.state = {
            buttons: [],
        };
    }

    public render(): ReactNode {
        return (
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                {this.state.buttons.map((button) => (
                    <div
                        key={button.node.id}
                        style={{
                            top: `${button.position.y}px`,
                            left: `${button.position.x}px`,
                        }}
                        onClick={() => {
                            // if (isCamera(button.node)) {
                            //     this.props.editor.layout.preview.setCameraPreviewActive(button.node);
                            // }

                            this.props.editor.layout.graph.setSelectedNode(button.node);
                            this.props.editor.layout.inspector.setEditedObject(button.node);
                            this.props.editor.layout.preview.gizmo.setAttachedNode(button.node);
                        }}
                        className="absolute w-16 h-16 pointer-events-auto rounded-lg -translate-x-1/2 hover:bg-black/20 transition-colors duration-300"
                    >
                        {this._getIcon(button.node)}
                    </div>
                ))}
            </div>
        );
    }

    public componentWillUnmount(): void {
        this.stop();
    }

    public run(): void {
        const scene = this.props.editor.layout.preview.scene;

        if (this._renderFunction || !scene) {
            return;
        }

        this._tempMesh?.dispose(true, true);

        this._tempMesh = new Mesh("editor-preview-icons-temp-node", this.props.editor.layout.preview.scene);
        this._tempMesh._removeFromSceneRootNodes();
        this.props.editor.layout.preview.scene.meshes.pop();

        const buttons: _IButtonData[] = [];

        scene.getEngine().runRenderLoop(this._renderFunction = () => {
            buttons.splice(0, buttons.length);

            scene.lights.forEach((light) => {
                if (this._tempMesh && scene.activeCamera) {
                    this._tempMesh.setAbsolutePosition(light.getAbsolutePosition());

                    if (!this._isInFrustrum(scene)) {
                        return;
                    }
                }

                buttons.push({
                    node: light,
                    position: projectVectorOnScreen(light.getAbsolutePosition(), scene),
                });
            });

            scene.cameras.forEach((camera) => {
                if (isEditorCamera(camera) || camera === scene.activeCamera) {
                    return;
                }

                if (this._tempMesh) {
                    this._tempMesh.setAbsolutePosition(camera.computeWorldMatrix().getTranslation());
                    if (!this._isInFrustrum(scene)) {
                        return;
                    }
                }

                buttons.push({
                    node: camera,
                    position: projectVectorOnScreen(camera.computeWorldMatrix().getTranslation(), scene),
                });
            });

            this.setState({ buttons });
        });
    }

    private _isInFrustrum(scene: Scene): boolean {
        this._tempMesh!.computeWorldMatrix(true);
        return scene.activeCamera!.isInFrustum(this._tempMesh!);
    }

    public stop(): void {
        if (this._renderFunction) {
            this.props.editor.layout.preview.engine.stopRenderLoop(this._renderFunction);
        }

        this._renderFunction = null;
    }

    private _getIcon(node: Node): ReactNode {
        if (isLight(node)) {
            return <FaLightbulb color="white" stroke="black" strokeWidth={0.35} className="w-full h-full" />;
        }

        if (isCamera(node)) {
            return <FaCamera color="white" stroke="black" strokeWidth={0.1} className="w-full h-full" />;
        }
    }
};
