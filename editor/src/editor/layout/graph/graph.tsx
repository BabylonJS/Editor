import { Mesh } from "babylonjs";

import { Component, PropsWithChildren, ReactNode } from "react";

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "../../../ui/shadcn/ui/context-menu";

import { Tween } from "../../../tools/animation/tween";
import { isMesh, isNode } from "../../../tools/guards/nodes";
import { waitNextAnimationFrame } from "../../../tools/tools";

import { Editor } from "../../main";

export interface IEditorGraphContextMenuProps extends PropsWithChildren {
    editor: Editor;
    object: any | null;
}

export class EditorGraphContextMenu extends Component<IEditorGraphContextMenuProps> {
    public render(): ReactNode {
        return (
            <ContextMenu
                onOpenChange={(o) => {
                    if (o && this.props.object) {
                        this.props.editor.layout.graph.setSelectedNode(this.props.object);
                        this.props.editor.layout.inspector.setEditedObject(this.props.object);
                        this.props.editor.layout.preview.gizmo.setAttachedNode(this.props.object);
                    }
                }}
            >
                <ContextMenuTrigger className="w-full h-full">
                    {this.props.children}
                </ContextMenuTrigger>

                <ContextMenuContent className="dark">
                    {this.props.object &&
                        <>
                            {isNode(this.props.object) && this._getMeshItems()}

                            <ContextMenuSeparator />

                            {this._getRemoveItems()}
                        </>
                    }
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    private _getRemoveItems(): ReactNode {
        return (
            <ContextMenuItem
                className="text-red-400"
                onClick={() => {
                    if (this.props.object) {
                        this.props.object.dispose?.();
                        this.props.editor.layout.graph.refresh();
                        this.props.editor.layout.preview.gizmo.setAttachedNode(null);
                        this.props.editor.layout.inspector.setEditedObject(this.props.editor.layout.preview.scene);
                    }
                }}
            >
                Remove
            </ContextMenuItem>
        );
    }

    private _getMeshItems(): ReactNode {
        return (
            <>
                <ContextMenuItem
                    onClick={() => {
                        const position = this.props.object.getAbsolutePosition?.();
                        const camera = this.props.editor.layout.preview.scene.activeCamera;
                        if (position && camera) {
                            Tween.Create(camera, 0.5, {
                                "target": position,
                            });
                        }
                    }}
                >
                    Focus
                </ContextMenuItem>

                {isMesh(this.props.object) &&
                    <ContextMenuItem
                        onClick={() => {
                            const instance = (this.props.object as Mesh).createInstance(`${this.props.object.name} (Mesh Instance)`);
                            instance.parent = this.props.object.parent;
                            instance.position.copyFrom(this.props.object.position);
                            instance.rotation.copyFrom(this.props.object.rotation);
                            instance.scaling.copyFrom(this.props.object.scaling);
                            instance.rotationQuaternion = this.props.object.rotationQuaternion?.clone() ?? null;
                            instance.isVisible = this.props.object.isVisible;
                            instance.setEnabled(this.props.object.isEnabled());

                            debugger;
                            const lights = this.props.editor.layout.preview.scene.lights;
                            const shadowMaps = lights.map((light) => light.getShadowGenerator()?.getShadowMap()).filter((s) => s);

                            shadowMaps.forEach((shadowMap) => {
                                if (shadowMap?.renderList?.includes(this.props.object)) {
                                    shadowMap.renderList.push(instance);
                                }
                            });

                            waitNextAnimationFrame().then(() => {
                                this.props.editor.layout.graph.refresh();
                                this.props.editor.layout.graph.setSelectedNode(instance);
                                this.props.editor.layout.inspector.setEditedObject(instance);
                                this.props.editor.layout.preview.gizmo.setAttachedNode(instance);
                            });
                        }}
                    >
                        Create Instance
                    </ContextMenuItem>
                }
            </>
        );
    }
}
