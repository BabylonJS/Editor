import { Component, DragEvent, ReactNode } from "react";
import { Button, Tree, TreeNodeInfo } from "@blueprintjs/core";

import { FaLink } from "react-icons/fa6";
import { IoMdCube } from "react-icons/io";
import { FaCamera } from "react-icons/fa";
import { FaLightbulb } from "react-icons/fa";
import { IoCheckmark } from "react-icons/io5";
import { SiBabylondotjs } from "react-icons/si";
import { MdOutlineQuestionMark } from "react-icons/md";
import { HiOutlineCubeTransparent } from "react-icons/hi";

import { Node, Tools } from "babylonjs";

import { Editor } from "../main";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../ui/shadcn/ui/dropdown-menu";

import { isSceneLinkNode } from "../../tools/guards/scene";
import { getCollisionMeshFor } from "../../tools/mesh/collision";
import { UniqueNumber, waitNextAnimationFrame } from "../../tools/tools";
import { onNodeModifiedObservable, onNodesAddedObservable } from "../../tools/observables";
import { isAbstractMesh, isCamera, isCollisionInstancedMesh, isCollisionMesh, isEditorCamera, isInstancedMesh, isLight, isMesh, isNode, isTransformNode } from "../../tools/guards/nodes";

import { onProjectConfigurationChangedObservable } from "../../project/configuration";

import { EditorGraphLabel } from "./graph/label";
import { EditorGraphContextMenu } from "./graph/graph";

export interface IEditorGraphProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IEditorGraphState {
    /**
     * Defines the current value of the search in the graph.
     */
    search: string;
    /**
     * The nodes of the graph.
     */
    nodes: TreeNodeInfo[];

    /**
     * Defines wether or not the preview is focused.
     */
    isFocused: boolean;

    /**
     * Defines wether or not instanced meshes should be hidden from the graph.
     */
    hideInstancedMeshes: boolean;
}

export class EditorGraph extends Component<IEditorGraphProps, IEditorGraphState> {
    private _objectsToCopy: TreeNodeInfo<unknown>[] = [];

    public constructor(props: IEditorGraphProps) {
        super(props);

        this.state = {
            nodes: [],
            search: "",
            isFocused: false,

            hideInstancedMeshes: false,
        };

        onNodesAddedObservable.add(() => this.refresh());
        onNodeModifiedObservable.add((node) => this._handleNodeModified(node));

        document.addEventListener("copy", () => this.state.isFocused && this.copySelectedNodes());
        document.addEventListener("paste", () => this.state.isFocused && this.pasteSelectedNodes());
    }

    public render(): ReactNode {
        return (
            <div
                className="flex flex-col w-full h-full text-foreground"
                onClick={() => this.setState({ isFocused: true })}
                onMouseLeave={() => this.setState({ isFocused: false })}
            >
                <div className="flex justify-between w-full p-2">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={this.state.search}
                        onChange={(ev) => this._handleSearch(ev.currentTarget.value)}
                        className="px-5 py-2 w-full rounded-lg bg-primary-foreground outline-none"
                    />

                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button minimal icon="settings" className="transition-all duration-300" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem className="flex gap-1 items-center" onClick={() => {
                                this.setState({ hideInstancedMeshes: !this.state.hideInstancedMeshes }, () => this.refresh());
                            }}>
                                {this.state.hideInstancedMeshes ? <IoCheckmark /> : ""} Hide Instanced Meshes
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <Tree
                    contents={this.state.nodes}
                    onNodeExpand={(n) => this._handleNodeExpanded(n)}
                    onNodeCollapse={(n) => this._handleNodeCollapsed(n)}
                    onNodeClick={(n, _, ev) => this._handleNodeClicked(n, ev)}
                    onNodeContextMenu={(n, _, ev) => this._handleNodeContextMenu(n, ev)}
                    onNodeDoubleClick={(n, _, ev) => this._handleNodeDoubleClicked(n, ev)}
                />

                <div
                    className="w-full h-full"
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={(ev) => this._handleDropEmpty(ev)}
                />
            </div>
        );
    }

    public componentDidMount(): void {
        onProjectConfigurationChangedObservable.add(() => {
            this.refresh();
        });
    }

    /**
     * Refreshes the graph.
     */
    public refresh(): void {
        const scene = this.props.editor.layout.preview.scene;
        const nodes = scene.rootNodes
            .filter((n) => !isEditorCamera(n))
            .map((n) => this._parseNode(n));

        nodes.splice(0, 0, {
            id: "__editor__scene__",
            nodeData: scene,
            icon: <SiBabylondotjs className="w-4 h-4" />,
            label: this._getNodeLabelComponent(scene, "Scene", false),
        });

        this.setState({
            nodes: nodes.filter((n) => n !== null) as TreeNodeInfo[],
        });
    }

    /**
     * Sets the given node selected in the graph. All other selected nodes
     * become unselected to have only the given node selected. All parents are expanded.
     * @param node defines the reference tot the node to select in the graph.
     */
    public setSelectedNode(node: Node): void {
        this._forEachNode(this.state.nodes, (n) => {
            if (isNode(n.nodeData)) {
                const descendants = n.nodeData.getDescendants(false);
                if (descendants.includes(node)) {
                    n.isExpanded = true;
                }
            }

            n.isSelected = n.nodeData === node;
        });

        this.setState({ nodes: this.state.nodes });
    }

    /**
     * Sets the given node selected in the graph. All other selected nodes remain selected.
     * @param node defines the reference to the node to select in the graph.
     */
    public addToSelectedNodes(node: Node): void {
        this._forEachNode(this.state.nodes, (n) => {
            if (n.nodeData === node) {
                n.isSelected = true;
            }
        });

        this.setState({ nodes: this.state.nodes });
    }

    /**
     * Returns the list of all selected nodes
     */
    public getSelectedNodes(): TreeNodeInfo<unknown>[] {
        const result: any[] = [];
        this._forEachNode(this.state.nodes, (n) => n.isSelected && result.push(n));
        return result;
    }

    /**
     * Copies the selected nodes from the graph.
     */
    public copySelectedNodes(): void {
        this._objectsToCopy = this.props.editor.layout.graph.getSelectedNodes();
    }

    /**
     * Pastes the previously copied nodes.
     */
    public pasteSelectedNodes(parent?: Node): void {
        if (!this._objectsToCopy.length) {
            return;
        }

        const newNodes: Node[] = [];

        this._objectsToCopy.forEach((treeNode) => {
            const object = treeNode.nodeData;

            let node: Node | null = null;

            if (isAbstractMesh(object)) {
                const suffix = "(Instanced Mesh)";
                const name = isInstancedMesh(object)
                    ? object.name
                    : `${object.name.replace(` ${suffix}`, "")} ${suffix}`;

                const instance = node = object.createInstance(name);
                instance.position.copyFrom(object.position);
                instance.rotation.copyFrom(object.rotation);
                instance.scaling.copyFrom(object.scaling);
                instance.rotationQuaternion = object.rotationQuaternion?.clone() ?? null;
                instance.parent = object.parent;

                const collisionMesh = getCollisionMeshFor(instance.sourceMesh);
                collisionMesh?.updateInstances(instance.sourceMesh);
            }

            if (isLight(object)) {
                const suffix = "(Clone)";
                const name = `${object.name.replace(` ${suffix}`, "")} ${suffix}`;

                node = object.clone(name);
                if (node) {
                    node.parent = object.parent;
                }
            }

            if (isCamera(object)) {
                const suffix = "(Clone)";
                const name = `${object.name.replace(` ${suffix}`, "")} ${suffix}`;

                node = object.clone(name);
                node.parent = object.parent;
            }

            if (isTransformNode(object)) {
                const suffix = "(Clone)";
                const name = `${object.name.replace(` ${suffix}`, "")} ${suffix}`;

                node = object.clone(name, null, true);
                if (node) {
                    node.parent = object.parent;
                }
            }

            if (node) {
                node.id = Tools.RandomId();
                node.uniqueId = UniqueNumber.Get();

                if (parent) {
                    node.parent = parent;
                }

                if (isAbstractMesh(node)) {
                    this.props.editor.layout.preview.scene.lights
                        .map((light) => light.getShadowGenerator())
                        .forEach((generator) => generator?.getShadowMap()?.renderList?.push(node));
                }

                newNodes.push(node);
            }
        });

        this.refresh();

        waitNextAnimationFrame().then(() => {
            const firstNode = newNodes[0];

            if (isNode(firstNode)) {
                this.props.editor.layout.graph.setSelectedNode(firstNode);
                this.props.editor.layout.inspector.setEditedObject(firstNode);
                this.props.editor.layout.preview.gizmo.setAttachedNode(firstNode);
            }
        });
    }

    private _handleSearch(search: string) {
        this.setState({ search }, () => {
            this.refresh();
        });
    }

    private _handleNodeClicked(node: TreeNodeInfo, ev: React.MouseEvent<HTMLElement>): void {
        this.props.editor.layout.inspector.setEditedObject(node.nodeData);

        if (isNode(node.nodeData)) {
            this.props.editor.layout.preview.gizmo.setAttachedNode(node.nodeData);
        }

        if (ev.ctrlKey || ev.metaKey) {
            this._forEachNode(this.state.nodes, (n) => n.id === node.id && (n.isSelected = !n.isSelected));
        } else {
            if (ev.shiftKey) {
                this._handleShiftSelect(node);
            } else {
                this._forEachNode(this.state.nodes, (n) => n.isSelected = n.id === node.id);
            }
        }

        this.setState({ nodes: this.state.nodes });
    }

    private _handleShiftSelect(node: TreeNodeInfo): void {
        let lastSelected!: TreeNodeInfo;
        let firstSelected!: TreeNodeInfo;

        this._forEachNode(this.state.nodes, (n) => {
            if (n.id === node.id) {
                if (!firstSelected) {
                    firstSelected = n;
                } else {
                    lastSelected = n;
                }
            } else if (n.isSelected) {
                if (!firstSelected) {
                    firstSelected = n;
                } else {
                    lastSelected = n;
                }
            }
        });

        if (!lastSelected || !firstSelected) {
            return;
        }

        let select = false;
        this._forEachNode(this.state.nodes, (n) => {
            if (n.id === firstSelected.id) {
                select = true;
            }

            if (select) {
                n.isSelected = true;
            }

            if (n.id === lastSelected.id) {
                select = false;
            }
        });
    }

    private _handleNodeContextMenu(node: TreeNodeInfo, ev: React.MouseEvent<HTMLElement>): void {
        if (!node.isSelected) {
            this._handleNodeClicked(node, ev);
        }
    }

    private _handleNodeExpanded(node: TreeNodeInfo): void {
        this._forEachNode(this.state.nodes, (n) => n.id === node.id && (n.isExpanded = true));
        this.setState({ nodes: this.state.nodes });
    }

    private _handleNodeCollapsed(node: TreeNodeInfo): void {
        this._forEachNode(this.state.nodes, (n) => n.id === node.id && (n.isExpanded = false));
        this.setState({ nodes: this.state.nodes });
    }

    private _handleNodeDoubleClicked(node: TreeNodeInfo, ev: React.MouseEvent<HTMLElement>): void {
        this._forEachNode(this.state.nodes, (n) => n.id === node.id && (n.isExpanded = !n.isExpanded));

        this._handleNodeClicked(node, ev);
        this.setState({ nodes: this.state.nodes });
    }

    public _forEachNode(nodes: TreeNodeInfo[] | undefined, callback: (node: TreeNodeInfo, index: number) => void) {
        if (nodes === undefined) {
            return;
        }

        for (let i = 0, len = nodes.length; i < len; ++i) {
            const node = nodes[i];

            callback(node, i);
            this._forEachNode(node.childNodes, callback);
        }
    }

    private _parseNode(node: Node): TreeNodeInfo | null {
        if (isMesh(node) && node._masterMesh || isCollisionMesh(node) || isCollisionInstancedMesh(node)) {
            return null;
        }

        // Check is in graph
        if (isInstancedMesh(node) && this.state.hideInstancedMeshes) {
            return null;
        }

        if (isTransformNode(node)) {
            if (!node._scene.transformNodes.includes(node)) {
                return null;
            }
        }

        if (isAbstractMesh(node)) {
            if (!node._scene.meshes.includes(node)) {
                return null;
            }
        }

        if (isLight(node)) {
            if (!node._scene.lights.includes(node)) {
                return null;
            }
        }

        if (isCamera(node)) {
            if (!node._scene.cameras.includes(node)) {
                return null;
            }
        }

        node.id ??= Tools.RandomId();

        const info = {
            id: node.id,
            nodeData: node,
            isSelected: false,
            icon: this._getNodeIconComponent(node),
            label: this._getNodeLabelComponent(node, node.name),
        } as TreeNodeInfo;

        if (!isSceneLinkNode(node)) {
            const children = node.getDescendants(true);
            if (children.length) {
                info.childNodes = children.map((c) => this._parseNode(c)).filter((c) => c !== null) as TreeNodeInfo[];
            }

            info.hasCaret = (info.childNodes?.length ?? 0) > 0;
        }

        if (!node.name.toLowerCase().includes(this.state.search.toLowerCase()) && !info.childNodes?.length) {
            return null;
        }

        this._forEachNode(this.state.nodes, (n) => {
            if (n.id === info.id) {
                info.isSelected = n.isSelected;
                info.isExpanded = n.isExpanded;
            }
        });

        return info;
    }

    private _getNodeIconComponent(node: Node): ReactNode {
        return (
            <div
                onClick={(ev) => {
                    node.setEnabled(!node.isEnabled());
                    this.refresh();
                    ev.stopPropagation();
                }}
                className={`cursor-pointer ${node.isEnabled() ? "opacity-100" : "opacity-20"} transition-all duration-100 ease-in-out`}
            >
                {this._getIcon(node)}
            </div>
        );
    }

    private _getIcon(object: any): ReactNode {
        if (isTransformNode(object)) {
            return <HiOutlineCubeTransparent className="w-4 h-4" />;
        }

        if (isAbstractMesh(object)) {
            return <IoMdCube className="w-4 h-4" />;
        }

        if (isLight(object)) {
            return <FaLightbulb className="w-4 h-4" />;
        }

        if (isCamera(object)) {
            return <FaCamera className="w-4 h-4" />;
        }

        if (isSceneLinkNode(object)) {
            return <FaLink className="w-4 h-4" />;
        }

        return <MdOutlineQuestionMark className="w-4 h-4" />;
    }

    private _getNodeLabelComponent(object: any, name?: string | null, noContextMenu?: boolean): JSX.Element {
        const label = (
            <EditorGraphLabel
                object={object}
                editor={this.props.editor}
                name={name ?? "Unnamed Node"}
            />
        );

        if (noContextMenu) {
            return label;
        }

        return (
            <EditorGraphContextMenu editor={this.props.editor} object={object}>
                {label}
            </EditorGraphContextMenu>
        );
    }

    private _handleNodeModified(node: Node): void {
        this._forEachNode(this.state.nodes, (n) => {
            if (n.nodeData === node) {
                n.label = this._getNodeLabelComponent(node, node.name);
            }
        });

        this.setState({ nodes: this.state.nodes });
    }

    private _handleDropEmpty(ev: DragEvent<HTMLDivElement>): void {
        const node = ev.dataTransfer.getData("graph/node");
        if (!node) {
            return;
        }

        const nodesToMove: TreeNodeInfo[] = [];
        this._forEachNode(this.state.nodes, (n) => n.isSelected && nodesToMove.push(n));

        nodesToMove.forEach((n) => {
            if (n.nodeData && isNode(n.nodeData)) {
                n.nodeData.parent = null;
            }
        });

        this.refresh();
    }
}
