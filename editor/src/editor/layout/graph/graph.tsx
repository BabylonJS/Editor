import { platform } from "os";

import { Mesh, Tools } from "babylonjs";

import { Component, PropsWithChildren, ReactNode } from "react";

import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";

import {
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuSub, ContextMenuSubTrigger,
    ContextMenuSubContent, ContextMenuShortcut,
} from "../../../ui/shadcn/ui/context-menu";

import { isScene } from "../../../tools/guards/scene";
import { isMesh, isNode } from "../../../tools/guards/nodes";
import { UniqueNumber, waitNextAnimationFrame } from "../../../tools/tools";

import { addTransformNode } from "../../../project/add/mesh";
import { addDirectionalLight, addHemisphericLight, addPointLight, addSpotLight } from "../../../project/add/light";

import { Editor } from "../../main";

export interface IEditorGraphContextMenuProps extends PropsWithChildren {
    editor: Editor;
    object: any | null;
}

export class EditorGraphContextMenu extends Component<IEditorGraphContextMenuProps> {
    public render(): ReactNode {
        return (
            <ContextMenu>
                <ContextMenuTrigger className="w-full h-full">
                    {this.props.children}
                </ContextMenuTrigger>

                <ContextMenuContent className="w-48">
                    {this.props.object &&
                        <>
                            {isNode(this.props.object) &&
                                <>
                                    {this._getMeshItems()}
                                    <ContextMenuSeparator />
                                </>
                            }

                            {!isScene(this.props.object) &&
                                <>
                                    <ContextMenuItem onClick={() => this.props.editor.layout.graph.copySelectedNodes()}>
                                        Copy  <ContextMenuShortcut>{platform() === "darwin" ? "⌘+C" : "CTRL+C"}</ContextMenuShortcut>
                                    </ContextMenuItem>

                                    {isNode(this.props.object) &&
                                        <ContextMenuItem onClick={() => this.props.editor.layout.graph.pasteSelectedNodes(this.props.object)}>
                                            Paste <ContextMenuShortcut>{platform() === "darwin" ? "⌘+V" : "CTRL+V"}</ContextMenuShortcut>
                                        </ContextMenuItem>
                                    }

                                    <ContextMenuSeparator />
                                </>
                            }

                            {(isNode(this.props.object) || isScene(this.props.object)) &&
                                <ContextMenuSub>
                                    <ContextMenuSubTrigger className="flex items-center gap-2">
                                        <AiOutlinePlus className="w-5 h-5" /> Add
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent>
                                        <ContextMenuItem onClick={() => addTransformNode(this.props.editor, isScene(this.props.object) ? null : this.props.object)}>Transform Node</ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem onClick={() => addPointLight(this.props.editor, isScene(this.props.object) ? null : this.props.object)}>Point Light</ContextMenuItem>
                                        <ContextMenuItem onClick={() => addDirectionalLight(this.props.editor, isScene(this.props.object) ? null : this.props.object)}>Directional Light</ContextMenuItem>
                                        <ContextMenuItem onClick={() => addSpotLight(this.props.editor, isScene(this.props.object) ? null : this.props.object)}>Spot Light</ContextMenuItem>
                                        <ContextMenuItem onClick={() => addHemisphericLight(this.props.editor, isScene(this.props.object) ? null : this.props.object)}>Hemispheric Light</ContextMenuItem>
                                    </ContextMenuSubContent>
                                </ContextMenuSub>
                            }

                            {!isScene(this.props.object) &&
                                <>
                                    <ContextMenuSeparator />

                                    {this._getRemoveItems()}
                                </>
                            }
                        </>
                    }
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    private _getRemoveItems(): ReactNode {
        return (
            <ContextMenuItem
                className="flex items-center gap-2 !text-red-400"
                onClick={() => {
                    const nodes = this.props.editor.layout.graph.getSelectedNodes();
                    nodes.forEach((n) => {
                        if (isNode(n.nodeData)) {
                            n.nodeData.dispose();
                        }
                    });

                    this.props.editor.layout.graph.refresh();
                    this.props.editor.layout.preview.gizmo.setAttachedNode(null);
                    this.props.editor.layout.inspector.setEditedObject(this.props.editor.layout.preview.scene);
                }}
            >
                <AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
            </ContextMenuItem>
        );
    }

    private _getMeshItems(): ReactNode {
        return (
            <>
                <ContextMenuItem onClick={() => this.props.editor.layout.preview.focusObject(this.props.object)}>
                    Focus in Preview
                    <ContextMenuShortcut>{platform() === "darwin" ? "⌘+F" : "CTRL+F"}</ContextMenuShortcut>
                </ContextMenuItem>

                {isMesh(this.props.object) &&
                    <ContextMenuItem
                        onClick={() => {
                            const instance = (this.props.object as Mesh).createInstance(`${this.props.object.name} (Mesh Instance)`);
                            instance.id = Tools.RandomId();
                            instance.uniqueId = UniqueNumber.Get();
                            instance.parent = this.props.object.parent;
                            instance.position.copyFrom(this.props.object.position);
                            instance.rotation.copyFrom(this.props.object.rotation);
                            instance.scaling.copyFrom(this.props.object.scaling);
                            instance.rotationQuaternion = this.props.object.rotationQuaternion?.clone() ?? null;
                            instance.isVisible = this.props.object.isVisible;
                            instance.setEnabled(this.props.object.isEnabled());

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