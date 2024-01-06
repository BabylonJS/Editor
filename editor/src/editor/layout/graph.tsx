import { Component, ReactNode } from "react";
import { Divider, Tree, TreeNodeInfo } from "@blueprintjs/core";

import { IoMdCube } from "react-icons/io";
import { FaCamera } from "react-icons/fa";
import { FaLightbulb } from "react-icons/fa";
import { HiOutlineCubeTransparent } from "react-icons/hi";
import { MdOutlineQuestionMark } from "react-icons/md";

import { Node, Tools } from "babylonjs";

import { Editor } from "../main";

import { onNodeModifiedObservable, onNodesAddedObservable } from "../../tools/observables";
import { isAbstractMesh, isCamera, isLight, isNode, isTransformNode } from "../../tools/guards/nodes";

import { onProjectConfigurationChangedObservable } from "../../project/configuration";

import { EditorGraphContextMenu } from "./graph/graph";

export interface IEditorGraphProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IEditorGraphState {
    /**
     * The nodes of the graph.
     */
    nodes: TreeNodeInfo[];
}

export class EditorGraph extends Component<IEditorGraphProps, IEditorGraphState> {
    public constructor(props: IEditorGraphProps) {
        super(props);

        this.state = {
            nodes: [],
        };

        onNodesAddedObservable.add(() => this.refresh());
        onNodeModifiedObservable.add((node) => this._handleNodeModified(node));
    }

    public render(): ReactNode {
        return (
            <div className="flex flex-col w-full h-full">
                <div className="flex flex-col w-full p-2">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="px-5 py-2 rounded-lg bg-black/50 text-white/75 outline-none"
                    />

                </div>

                <Divider />

                <Tree
                    contents={this.state.nodes}
                    onNodeExpand={(n) => this._handleNodeExpanded(n)}
                    onNodeCollapse={(n) => this._handleNodeCollapsed(n)}
                    onNodeClick={(n, _, ev) => this._handleNodeClicked(n, ev)}
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
            .filter((n) => !isCamera(n))
            .map((n) => this._parseNode(n));

        this.setState({ nodes });
    }

    /**
     * Sets the selected node.
     * @param node the node to select.
     */
    public setSelectedNode(node: Node): void {
        this._forEachNode(this.state.nodes, (n) => n.isSelected = n.nodeData === node);
        this.setState({ nodes: this.state.nodes });
    }

    private _handleNodeClicked(node: TreeNodeInfo, ev: React.MouseEvent<HTMLElement>): void {
        this.props.editor.layout.inspector.setEditedObject(node.nodeData);

        if (isNode(node.nodeData)) {
            this.props.editor.layout.preview.gizmo.setAttachedNode(node.nodeData);
        }

        if (ev.ctrlKey || ev.metaKey) {
            this._forEachNode(this.state.nodes, (n) => n.id === node.id && (n.isSelected = !n.isSelected));
        } else {
            this._forEachNode(this.state.nodes, (n) => n.isSelected = n.id === node.id);
        }

        this.setState({ nodes: this.state.nodes });
    }

    private _handleNodeExpanded(node: TreeNodeInfo): void {
        this._forEachNode(this.state.nodes, (n) => n.id === node.id && (n.isExpanded = true));
        this.setState({ nodes: this.state.nodes });
    }

    private _handleNodeCollapsed(node: TreeNodeInfo): void {
        this._forEachNode(this.state.nodes, (n) => n.id === node.id && (n.isExpanded = false));
        this.setState({ nodes: this.state.nodes });
    }

    private _forEachNode(nodes: TreeNodeInfo[] | undefined, callback: (node: TreeNodeInfo, index: number) => void) {
        if (nodes === undefined) {
            return;
        }

        for (let i = 0, len = nodes.length; i < len; ++i) {
            const node = nodes[i];

            callback(node, i);
            this._forEachNode(node.childNodes, callback);
        }
    }

    private _parseNode(node: Node): TreeNodeInfo {
        node.id ??= Tools.RandomId();

        const info = {
            id: node.id,
            nodeData: node,
            isSelected: false,
            icon: this._getIcon(node),
            label: this._getNodeLabel(node, node.name),
        } as TreeNodeInfo;

        const children = node.getDescendants(true);
        if (children.length) {
            info.childNodes = children.map((c) => this._parseNode(c));
        }

        return info;
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

        return <MdOutlineQuestionMark className="w-4 h-4" />;
    }

    private _getNodeLabel(object: any, name?: string | null): JSX.Element {
        return (
            <EditorGraphContextMenu editor={this.props.editor} object={object}>
                <div className="ml-2 p-1 w-full">
                    {name ?? "Unnamed Node"}
                </div>
            </EditorGraphContextMenu>
        );
    }

    private _handleNodeModified(node: Node): void {
        this._forEachNode(this.state.nodes, (n) => {
            if (n.nodeData === node) {
                n.label = this._getNodeLabel(node, node.name);
            }
        });

        this.setState({ nodes: this.state.nodes });
    }
}
