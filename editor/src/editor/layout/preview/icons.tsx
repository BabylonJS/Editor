import { Component, ReactNode } from "react";

import { CiLight } from "react-icons/ci";

import { Node, Vector2 } from "babylonjs";

import { Editor } from "../../main";

import { projectVectorOnScreen } from "../../../tools/maths/projection";

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
                            this.props.editor.layout.graph.setSelectedNode(button.node);
                            this.props.editor.layout.inspector.setEditedObject(button.node);
                            this.props.editor.layout.preview.gizmo.setAttachedNode(button.node);
                        }}
                        className="absolute w-16 h-16 pointer-events-auto rounded-lg -translate-x-1/2 hover:bg-black/20 transition-colors duration-300"
                    >
                        <CiLight color="white" stroke="black" strokeWidth={0.35} className="w-full h-full" />
                    </div>
                ))}
            </div>
        );
    }

    public componentWillUnmount(): void {
        this.stop();
    }

    public run(): void {
        if (this._renderFunction) {
            return;
        }

        const buttons: _IButtonData[] = [];
        const scene = this.props.editor.layout.preview.scene;

        scene.getEngine().runRenderLoop(this._renderFunction = () => {
            buttons.splice(0, buttons.length);

            scene.lights.forEach((light) => {
                buttons.push({
                    node: light,
                    position: projectVectorOnScreen(light.getAbsolutePosition(), scene),
                });
            });

            this.setState({ buttons });
        });
    }

    public stop(): void {
        if (this._renderFunction) {
            this.props.editor.layout.preview.engine.stopRenderLoop(this._renderFunction);
        }
    }
};
