import { Component, ReactNode } from "react";
import { Tree, TreeNodeInfo } from "@blueprintjs/core";

import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";
import { IoSparklesSharp } from "react-icons/io5";
import { HiOutlineFolder } from "react-icons/hi2";

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubTrigger,
	ContextMenuSubContent,
} from "../../../ui/shadcn/ui/context-menu";
import { IFXEditor } from ".";
import { VFXEffect, type VFXEffectNode } from "./VFX";

export interface IFXEditorGraphProps {
	filePath: string | null;
	onNodeSelected?: (nodeId: string | number | null) => void;
	editor: IFXEditor;
}

export interface IFXEditorGraphState {
	nodes: TreeNodeInfo<VFXEffectNode>[];
	selectedNodeId: string | number | null;
}

export class FXEditorGraph extends Component<IFXEditorGraphProps, IFXEditorGraphState> {
	public constructor(props: IFXEditorGraphProps) {
		super(props);

		this.state = {
			nodes: [],
			selectedNodeId: null,
		};
	}

	/**
	 * Finds a node in the tree by ID
	 */
	private _findNodeById(nodes: TreeNodeInfo<VFXEffectNode>[], nodeId: string | number): TreeNodeInfo<VFXEffectNode> | null {
		for (const node of nodes) {
			if (node.id === nodeId) {
				return node;
			}
			if (node.childNodes) {
				const found = this._findNodeById(node.childNodes, nodeId);
				if (found) {
					return found;
				}
			}
		}
		return null;
	}

	/**
	 * Gets node data by ID from tree
	 */
	public getNodeData(nodeId: string | number): VFXEffectNode | null {
		const node = this._findNodeById(this.state.nodes, nodeId);
		return node?.nodeData || null;
	}

	public componentDidMount(): void {}

	public componentDidUpdate(_prevProps: IFXEditorGraphProps): void {}

	/**
	 * Loads nodes from converted Three.js JSON data using VFXEffect
	 */
	public async loadFromFile(filePath: string): Promise<void> {
		try {
			if (!this.props.editor.preview?.scene) {
				console.error("Scene is not available");
				return;
			}

			// Load VFX effect
			const dirname = require("path").dirname(filePath);
			const vfxEffect = await VFXEffect.LoadAsync(filePath, this.props.editor.preview!.scene, dirname + "/");

			// Build tree from VFXEffect hierarchy
			const nodes = vfxEffect.root ? [this._convertVFXNodeToTreeNode(vfxEffect.root)] : [];

			this.setState({ nodes, selectedNodeId: null });

			// Start systems
			vfxEffect.start();
		} catch (error) {
			console.error("Failed to load FX file:", error);
		}
	}

	/**
	 * Converts VFXEffectNode to TreeNodeInfo recursively
	 */
	private _convertVFXNodeToTreeNode(vfxNode: VFXEffectNode): TreeNodeInfo<VFXEffectNode> {
		const nodeId = vfxNode.uuid || vfxNode.name;
		const childNodes = vfxNode.children.length > 0 ? vfxNode.children.map((child) => this._convertVFXNodeToTreeNode(child)) : undefined;

		return {
			id: nodeId,
			label: this._getNodeLabelComponent({ id: nodeId, nodeData: vfxNode } as any, vfxNode.name),
			icon: vfxNode.type === "particle" ? <IoSparklesSharp className="w-4 h-4" /> : <HiOutlineFolder className="w-4 h-4" />,
			isExpanded: vfxNode.type === "group",
			childNodes,
			isSelected: false,
			hasCaret: vfxNode.type === "group" || (childNodes && childNodes.length > 0),
			nodeData: vfxNode,
		};
	}

	/**
	 * Updates node names in the graph (called when name changes in properties)
	 */
	public updateNodeNames(): void {
		const nodes = this._updateAllNodeNames(this.state.nodes);
		this.setState({ nodes });
	}

	/**
	 * Updates all node names in the tree from actual data
	 */
	private _updateAllNodeNames(nodes: TreeNodeInfo<VFXEffectNode>[]): TreeNodeInfo<VFXEffectNode>[] {
		return nodes.map((n) => {
			const nodeName = n.nodeData?.name || "Unknown";
			const childNodes = n.childNodes ? this._updateAllNodeNames(n.childNodes) : undefined;
			return {
				...n,
				label: this._getNodeLabelComponent(n, nodeName),
				childNodes,
			};
		});
	}

	public render(): ReactNode {
		return (
			<div className="flex flex-col w-full h-full text-foreground">
				{this.state.nodes.length > 0 && (
					<div className="overflow-auto">
						<Tree
							contents={this.state.nodes}
							onNodeExpand={(n) => this._handleNodeExpanded(n)}
							onNodeCollapse={(n) => this._handleNodeCollapsed(n)}
							onNodeClick={(n) => this._handleNodeClicked(n)}
						/>
					</div>
				)}

				<div className="flex-1" style={{ minHeight: "80px" }} onDragOver={(ev) => ev.preventDefault()}>
					<ContextMenu>
						<ContextMenuTrigger className="w-full h-full">
							<div className="w-full h-full flex items-center justify-center">
								{this.state.nodes.length === 0 && <div className="p-4 text-muted-foreground">No particles. Right-click to add.</div>}
							</div>
						</ContextMenuTrigger>
						<ContextMenuContent>
							<ContextMenuSub>
								<ContextMenuSubTrigger className="flex items-center gap-2">
									<AiOutlinePlus className="w-5 h-5" /> Add
								</ContextMenuSubTrigger>
								<ContextMenuSubContent>
									<ContextMenuItem onClick={() => this._handleAddParticles()}>
										<IoSparklesSharp className="w-4 h-4" /> Particle
									</ContextMenuItem>
									<ContextMenuItem onClick={() => this._handleAddGroup()}>
										<HiOutlineFolder className="w-4 h-4" /> Group
									</ContextMenuItem>
								</ContextMenuSubContent>
							</ContextMenuSub>
						</ContextMenuContent>
					</ContextMenu>
				</div>
			</div>
		);
	}

	private _handleNodeExpanded(node: TreeNodeInfo<VFXEffectNode>): void {
		const nodeId = node.id;
		const nodes = this._updateNodeExpanded(this.state.nodes, nodeId as string | number, true);
		this.setState({ nodes });
	}

	private _handleNodeCollapsed(node: TreeNodeInfo<VFXEffectNode>): void {
		const nodeId = node.id;
		const nodes = this._updateNodeExpanded(this.state.nodes, nodeId as string | number, false);
		this.setState({ nodes });
	}

	private _updateNodeExpanded(nodes: TreeNodeInfo<VFXEffectNode>[], nodeId: string | number, isExpanded: boolean): TreeNodeInfo<VFXEffectNode>[] {
		return nodes.map((n) => {
			const nodeName = n.nodeData?.name || "Unknown";
			if (n.id === nodeId) {
				return {
					...n,
					label: this._getNodeLabelComponent(n, nodeName),
					isExpanded,
					childNodes: n.childNodes ? this._updateNodeExpanded(n.childNodes, nodeId, isExpanded) : undefined,
				};
			}
			const childNodes = n.childNodes ? this._updateNodeExpanded(n.childNodes, nodeId, isExpanded) : undefined;
			return {
				...n,
				label: this._getNodeLabelComponent(n, nodeName),
				childNodes,
			};
		});
	}

	private _getNodeType(node: TreeNodeInfo<VFXEffectNode>): "particle" | "group" {
		return node.nodeData?.type || "particle";
	}

	private _handleNodeClicked(node: TreeNodeInfo<VFXEffectNode>): void {
		const selectedId = node.id as string | number;
		const nodes = this._updateNodeSelection(this.state.nodes, selectedId);
		this.setState({ nodes, selectedNodeId: selectedId });
		this.props.onNodeSelected?.(selectedId);
	}

	private _updateNodeSelection(nodes: TreeNodeInfo<VFXEffectNode>[], selectedId: string | number): TreeNodeInfo<VFXEffectNode>[] {
		return nodes.map((n) => {
			const nodeName = n.nodeData?.name || "Unknown";
			const isSelected = n.id === selectedId;
			const childNodes = n.childNodes ? this._updateNodeSelection(n.childNodes, selectedId) : undefined;
			return {
				...n,
				label: this._getNodeLabelComponent(n, nodeName),
				isSelected,
				childNodes,
			};
		});
	}

	private _getNodeLabelComponent(node: TreeNodeInfo<VFXEffectNode>, name: string): JSX.Element {
		const label = <div className="ml-2 p-1 w-full">{name}</div>;

		return (
			<ContextMenu>
				<ContextMenuTrigger className="w-full h-full">{label}</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuSub>
						<ContextMenuSubTrigger className="flex items-center gap-2">
							<AiOutlinePlus className="w-5 h-5" /> Add
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							<ContextMenuItem onClick={() => this._handleAddParticlesToNode(node)}>
								<IoSparklesSharp className="w-4 h-4" /> Particle
							</ContextMenuItem>
							{this._getNodeType(node) === "group" && (
								<ContextMenuItem onClick={() => this._handleAddGroupToNode(node)}>
									<HiOutlineFolder className="w-4 h-4" /> Group
								</ContextMenuItem>
							)}
						</ContextMenuSubContent>
					</ContextMenuSub>
					<ContextMenuSeparator />
					<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => this._handleDeleteNode(node)}>
						<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Delete
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		);
	}

	private _handleAddParticles(_parentId?: string | number): void {
		// const _nodeId = `particle-${Date.now()}`;
		// const particleData = this.getOrCreateParticleData(nodeId);
		// const newNode: TreeNodeInfo = {
		// 	id: nodeId,
		// 	label: this._getNodeLabelComponent({ id: nodeId, nodeData: particleData } as any, particleData.name),
		// 	icon: <IoSparklesSharp className="w-4 h-4" />,
		// 	isExpanded: false,
		// 	childNodes: undefined,
		// 	isSelected: false,
		// 	hasCaret: false,
		// 	nodeData: particleData,
		// };
	}

	private _handleAddGroup(_parentId?: string | number): void {
		// const _nodeId = `group-${Date.now()}`;
		// const groupData = this.getOrCreateGroupData(nodeId);
		// const newNode: TreeNodeInfo = {
		// 	id: nodeId,
		// 	label: this._getNodeLabelComponent({ id: nodeId, nodeData: groupData } as any, groupData.name),
		// 	icon: <HiOutlineFolder className="w-4 h-4" />,
		// 	isExpanded: true,
		// 	childNodes: [],
		// 	isSelected: false,
		// 	hasCaret: true,
		// 	nodeData: groupData,
		// };
	}

	private _handleAddParticlesToNode(node: TreeNodeInfo<VFXEffectNode>): void {
		const nodeId = node.id as string | number;
		this._handleAddParticles(nodeId);
	}

	private _handleAddGroupToNode(node: TreeNodeInfo<VFXEffectNode>): void {
		const nodeId = node.id as string | number;
		this._handleAddGroup(nodeId);
	}

	private _addNodeToParent(nodes: TreeNodeInfo<VFXEffectNode>[], parentId: string | number, newNode: TreeNodeInfo<VFXEffectNode>): TreeNodeInfo<VFXEffectNode>[] {
		return nodes.map((n) => {
			if (n.id === parentId) {
				const childNodes = n.childNodes || [];
				return {
					...n,
					childNodes: [...childNodes, newNode],
					hasCaret: true,
					isExpanded: true,
				};
			}
			if (n.childNodes) {
				return {
					...n,
					childNodes: this._addNodeToParent(n.childNodes, parentId, newNode),
				};
			}
			return n;
		});
	}

	private _handleDeleteNode(node: TreeNodeInfo<VFXEffectNode>): void {
		const deleteNodeById = (nodes: TreeNodeInfo<VFXEffectNode>[], id: string | number): TreeNodeInfo<VFXEffectNode>[] => {
			return nodes
				.filter((n) => n.id !== id)
				.map((n) => {
					if (n.childNodes) {
						return {
							...n,
							childNodes: deleteNodeById(n.childNodes, id),
						};
					}
					return n;
				});
		};

		const deletedId = node.id!;

		// Dispose particle system or mesh
		// const particleSystem = createdParticleSystemsMap.get(deletedId);
		// if (particleSystem) {
		// 	if (particleSystem.dispose) {
		// 		particleSystem.dispose();
		// 	}
		// 	createdParticleSystemsMap.delete(deletedId);
		// }

		// const mesh = createdMeshesMap.get(deletedId);
		// if (mesh) {
		// 	mesh.dispose();
		// 	createdMeshesMap.delete(deletedId);
		// }

		// Node data is removed automatically when node is deleted from tree

		// const newNodes = deleteNodeById(this.state.nodes, deletedId);
		// const newSelectedNodeId = this.state.selectedNodeId === deletedId ? null : this.state.selectedNodeId;

		if (this.state.selectedNodeId === deletedId) {
			this.props.onNodeSelected?.(null);
		}
	}
}
