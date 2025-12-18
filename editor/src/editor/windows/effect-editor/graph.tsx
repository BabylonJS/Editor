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
import { IEffectEditor } from ".";
import { saveSingleFileDialog } from "../../../tools/dialog";
import { writeJSON } from "fs-extra";
import { toast } from "sonner";
import { Effect, type IEffectNode } from "babylonjs-editor-tools";

export interface IEffectEditorGraphProps {
	filePath: string | null;
	onNodeSelected?: (nodeId: string | number | null) => void;
	editor: IEffectEditor;
}

export interface IEffectEditorGraphState {
	nodes: TreeNodeInfo<IEffectNode>[];
	selectedNodeId: string | number | null;
}

interface IEffectInfo {
	id: string;
	name: string;
	effect: Effect;
	originalJsonData?: any; // Store original JSON data for export
}

export class EffectEditorGraph extends Component<IEffectEditorGraphProps, IEffectEditorGraphState> {
	private _effects: Map<string, IEffectInfo> = new Map();
	/** Map of node instances to unique IDs for tree nodes */
	private _nodeIdMap: Map<IEffectNode, string> = new Map();

	public constructor(props: IEffectEditorGraphProps) {
		super(props);

		this.state = {
			nodes: [],
			selectedNodeId: null,
		};
	}

	/**
	 * Get the first  effect (for backward compatibility)
	 */
	public getEffect(): Effect | null {
		const firstEffect = this._effects.values().next().value;
		return firstEffect ? firstEffect.effect : null;
	}

	/**
	 * Get all  effects
	 */
	public getAllEffects(): Effect[] {
		return Array.from(this._effects.values()).map((info) => info.effect);
	}

	/**
	 * Get effect by ID
	 */
	public getEffectById(id: string): Effect | null {
		const info = this._effects.get(id);
		return info ? info.effect : null;
	}

	/**
	 * Finds a node in the tree by ID
	 */
	private _findNodeById(nodes: TreeNodeInfo<IEffectNode>[], nodeId: string | number): TreeNodeInfo<IEffectNode> | null {
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
	public getNodeData(nodeId: string | number): IEffectNode | null {
		const node = this._findNodeById(this.state.nodes, nodeId);
		return node?.nodeData || null;
	}

	public componentDidMount(): void {}

	public componentDidUpdate(_prevProps: IEffectEditorGraphProps): void {}

	/**
	 * Loads nodes from converted Three.js JSON data using Effect
	 */
	public async loadFromFile(filePath: string): Promise<void> {
		try {
			if (!this.props.editor.preview?.scene) {
				console.error("Scene is not available");
				return;
			}

			// Load  effect
			const dirname = require("path").dirname(filePath);
			const fs = require("fs-extra");
			const originalJsonData = await fs.readJSON(filePath);
			const effect = await Effect.LoadAsync(filePath, this.props.editor.preview!.scene, dirname + "/");

			// Generate unique ID for effect
			const effectId = `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			const effectName = require("path").basename(filePath, ".json") || "Effect";

			// Store effect with original JSON data for export
			this._effects.set(effectId, {
				id: effectId,
				name: effectName,
				effect: effect,
				originalJsonData,
			});

			// Rebuild tree with all effects
			this._rebuildTree();

			// Apply prewarm before starting (if any systems have prewarm enabled)
			effect.applyPrewarm();

			// Start systems
			effect.start();

			// Notify preview to sync playing state after a short delay
			// This ensures the effect state is properly synchronized
			setTimeout(() => {
				if (this.props.editor?.preview) {
					(this.props.editor.preview as any).forceUpdate?.();
				}
			}, 100);
		} catch (error) {
			console.error("Failed to load Effect file:", error);
		}
	}

	/**
	 * Rebuild tree from all effects
	 */
	private _rebuildTree(): void {
		// Clear node ID map when rebuilding tree to ensure unique IDs
		this._nodeIdMap.clear();

		const nodes: TreeNodeInfo<IEffectNode>[] = [];

		for (const [effectId, effectInfo] of this._effects.entries()) {
			if (effectInfo.effect.root) {
				// Use effect root directly as the tree node, but update its name to effect name
				effectInfo.effect.root.name = effectInfo.name;
				effectInfo.effect.root.uuid = effectId;

				const treeNode = this._convertNodeToTreeNode(effectInfo.effect.root, true);
				nodes.push(treeNode);
			}
		}

		this.setState({ nodes });
	}

	/**
	 * Generate unique ID for a node
	 */
	private _generateUniqueNodeId(Node: IEffectNode): string {
		// Check if we already have an ID for this node instance
		if (this._nodeIdMap.has(Node)) {
			return this._nodeIdMap.get(Node)!;
		}

		// Generate unique ID
		const uniqueId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		this._nodeIdMap.set(Node, uniqueId);
		return uniqueId;
	}

	/**
	 * Converts IEffectNode to TreeNodeInfo recursively
	 */
	private _convertNodeToTreeNode(Node: IEffectNode, isEffectRoot: boolean = false): TreeNodeInfo<IEffectNode> {
		// Always use unique ID instead of uuid or name
		const nodeId = this._generateUniqueNodeId(Node);
		const childNodes = Node.children.length > 0 ? Node.children.map((child) => this._convertNodeToTreeNode(child, false)) : undefined;

		return {
			id: nodeId,
			label: this._getNodeLabelComponent({ id: nodeId, nodeData: Node } as any, Node.name),
			icon: isEffectRoot ? (
				<IoSparklesSharp className="w-4 h-4" />
			) : Node.type === "particle" ? (
				<IoSparklesSharp className="w-4 h-4" />
			) : (
				<HiOutlineFolder className="w-4 h-4" />
			),
			isExpanded: isEffectRoot || Node.type === "group",
			childNodes,
			isSelected: false,
			hasCaret: isEffectRoot || Node.type === "group" || (childNodes && childNodes.length > 0),
			nodeData: Node,
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
	private _updateAllNodeNames(nodes: TreeNodeInfo<IEffectNode>[]): TreeNodeInfo<IEffectNode>[] {
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

				<div
					className="flex-1"
					style={{ minHeight: "80px" }}
					onDragOver={(ev) => {
						ev.preventDefault();
						ev.dataTransfer.dropEffect = "copy";
					}}
					onDrop={(ev) => this._handleDropEmpty(ev)}
				>
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
									<ContextMenuItem
										draggable
										onDragStart={(ev) => {
											ev.dataTransfer.setData("Effect-editor/create-effect", "effect");
										}}
										onClick={() => this._handleCreateEffect()}
									>
										<IoSparklesSharp className="w-4 h-4" /> Effect
									</ContextMenuItem>
								</ContextMenuSubContent>
							</ContextMenuSub>
						</ContextMenuContent>
					</ContextMenu>
				</div>
			</div>
		);
	}

	private _handleNodeExpanded(node: TreeNodeInfo<IEffectNode>): void {
		const nodeId = node.id;
		const nodes = this._updateNodeExpanded(this.state.nodes, nodeId as string | number, true);
		this.setState({ nodes });
	}

	private _handleNodeCollapsed(node: TreeNodeInfo<IEffectNode>): void {
		const nodeId = node.id;
		const nodes = this._updateNodeExpanded(this.state.nodes, nodeId as string | number, false);
		this.setState({ nodes });
	}

	private _updateNodeExpanded(nodes: TreeNodeInfo<IEffectNode>[], nodeId: string | number, isExpanded: boolean): TreeNodeInfo<IEffectNode>[] {
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

	private _handleNodeClicked(node: TreeNodeInfo<IEffectNode>): void {
		const selectedId = node.id as string | number;
		const nodes = this._updateNodeSelection(this.state.nodes, selectedId);
		this.setState({ nodes, selectedNodeId: selectedId });
		this.props.onNodeSelected?.(selectedId);
	}

	private _updateNodeSelection(nodes: TreeNodeInfo<IEffectNode>[], selectedId: string | number): TreeNodeInfo<IEffectNode>[] {
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

	private _getNodeLabelComponent(node: TreeNodeInfo<IEffectNode>, name: string): JSX.Element {
		const label = (
			<div
				className="ml-2 p-1 w-full"
				onDragOver={(ev) => {
					if (node.nodeData?.type === "group") {
						ev.preventDefault();
						ev.stopPropagation();
						ev.dataTransfer.dropEffect = "copy";
					}
				}}
				onDrop={(ev) => {
					if (node.nodeData?.type === "group") {
						ev.preventDefault();
						ev.stopPropagation();
						this._handleDropOnNode(node, ev);
					}
				}}
			>
				{name}
			</div>
		);

		return (
			<ContextMenu>
				<ContextMenuTrigger className="w-full h-full">{label}</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuSub>
						<ContextMenuSubTrigger className="flex items-center gap-2">
							<AiOutlinePlus className="w-5 h-5" /> Add
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							{node.nodeData?.type === "group" && (
								<>
									<ContextMenuItem
										draggable
										onDragStart={(ev) => {
											ev.dataTransfer.setData("Effect-editor/create-item", "base-particle");
										}}
										onClick={() => this._handleAddParticleSystemToNode(node, "base")}
									>
										<IoSparklesSharp className="w-4 h-4" /> Base Particle
									</ContextMenuItem>
									<ContextMenuItem
										draggable
										onDragStart={(ev) => {
											ev.dataTransfer.setData("Effect-editor/create-item", "solid-particle");
										}}
										onClick={() => this._handleAddParticleSystemToNode(node, "solid")}
									>
										<IoSparklesSharp className="w-4 h-4" /> Solid Particle
									</ContextMenuItem>
									<ContextMenuItem
										draggable
										onDragStart={(ev) => {
											ev.dataTransfer.setData("Effect-editor/create-item", "group");
										}}
										onClick={() => this._handleAddGroupToNode(node)}
									>
										<HiOutlineFolder className="w-4 h-4" /> Group
									</ContextMenuItem>
								</>
							)}
						</ContextMenuSubContent>
					</ContextMenuSub>
					{this._isEffectRootNode(node) && (
						<>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={() => this._handleExportEffect(node)}>Export</ContextMenuItem>
						</>
					)}
					<ContextMenuSeparator />
					<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => this._handleDeleteNode(node)}>
						<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Delete
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		);
	}

	/**
	 * Check if node is an effect root node
	 */
	private _isEffectRootNode(node: TreeNodeInfo<IEffectNode>): boolean {
		const nodeData = node.nodeData;
		if (!nodeData || !nodeData.uuid) {
			return false;
		}

		// Check if this node is the root of any effect
		return this._effects.has(nodeData.uuid);
	}

	/**
	 * Export effect to JSON file
	 */
	private async _handleExportEffect(node: TreeNodeInfo<IEffectNode>): Promise<void> {
		const nodeData = node.nodeData;
		if (!nodeData || !nodeData.uuid) {
			return;
		}

		const effectInfo = this._effects.get(nodeData.uuid);
		if (!effectInfo || !effectInfo.originalJsonData) {
			toast.error("Cannot export effect: original data not available");
			return;
		}

		const filePath = saveSingleFileDialog({
			title: "Export Effect",
			filters: [{ name: "Effect Files", extensions: ["effect"] }],
			defaultPath: `${effectInfo.name}.effect`,
		});

		if (!filePath) {
			return;
		}

		try {
			await writeJSON(filePath, effectInfo.originalJsonData, {
				spaces: "\t",
				encoding: "utf-8",
			});

			toast.success(`Effect exported successfully to ${filePath}`);
		} catch (error) {
			console.error("Failed to export effect:", error);
			toast.error(`Failed to export effect: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private _handleCreateEffect(): void {
		if (!this.props.editor.preview?.scene) {
			console.error("Scene is not available");
			return;
		}

		// Create empty effect
		const effect = new Effect(undefined, this.props.editor.preview.scene);

		// Generate unique ID and name for effect
		const effectId = `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		let effectName = "Effect";
		let counter = 1;
		while (Array.from(this._effects.values()).some((info) => info.name === effectName)) {
			effectName = `Effect ${counter}`;
			counter++;
		}

		// Store effect
		this._effects.set(effectId, {
			id: effectId,
			name: effectName,
			effect: effect,
		});

		// Rebuild tree with all effects
		this._rebuildTree();
	}

	private _findEffectForNode(node: TreeNodeInfo<IEffectNode>): Effect | null {
		// Find the effect that contains this node by traversing up the tree
		const nodeData = node.nodeData;
		if (!nodeData) {
			return null;
		}

		// First check if this is an effect root node
		if (nodeData.uuid) {
			const effectInfo = this._effects.get(nodeData.uuid);
			if (effectInfo) {
				return effectInfo.effect;
			}
		}

		// Find effect by checking if node is in any effect's hierarchy
		for (const effectInfo of this._effects.values()) {
			const effect = effectInfo.effect;
			if (effect.root) {
				// Check if node is part of this effect's hierarchy
				const findNodeInHierarchy = (current: IEffectNode): boolean => {
					// Use instance comparison and uuid for matching
					if (current === nodeData || (current.uuid && nodeData.uuid && current.uuid === nodeData.uuid)) {
						return true;
					}
					for (const child of current.children) {
						if (findNodeInHierarchy(child)) {
							return true;
						}
					}
					return false;
				};

				if (findNodeInHierarchy(effect.root)) {
					return effect;
				}
			}
		}

		return null;
	}

	private _handleAddParticleSystemToNode(node: TreeNodeInfo<IEffectNode>, systemType: "solid" | "base"): void {
		const effect = this._findEffectForNode(node);
		if (!effect) {
			console.error("No effect found for node");
			return;
		}

		const nodeData = node.nodeData;
		if (!nodeData || nodeData.type !== "group") {
			console.error("Cannot add particle system: parent is not a group");
			return;
		}

		const newNode = effect.createParticleSystem(nodeData, systemType);
		if (newNode) {
			// Rebuild tree with all effects
			this._rebuildTree();
		}
	}

	private _handleAddGroupToNode(node: TreeNodeInfo<IEffectNode>): void {
		const effect = this._findEffectForNode(node);
		if (!effect) {
			console.error("No effect found for node");
			return;
		}

		const nodeData = node.nodeData;
		if (!nodeData || nodeData.type !== "group") {
			console.error("Cannot add group: parent is not a group");
			return;
		}

		const newNode = effect.createGroup(nodeData);
		if (newNode) {
			// Rebuild tree with all effects
			this._rebuildTree();
		}
	}

	private _handleDropEmpty(ev: React.DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		ev.stopPropagation();

		try {
			const data = ev.dataTransfer.getData("Effect-editor/create-effect");
			if (data === "effect") {
				this._handleCreateEffect();
			}
		} catch (e) {
			// Ignore errors
		}
	}

	private _handleDropOnNode(node: TreeNodeInfo<IEffectNode>, ev: React.DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		ev.stopPropagation();

		if (!node.nodeData || node.nodeData.type !== "group") {
			return;
		}

		try {
			const data = ev.dataTransfer.getData("Effect-editor/create-item");
			if (data === "solid-particle") {
				this._handleAddParticleSystemToNode(node, "solid");
			} else if (data === "base-particle") {
				this._handleAddParticleSystemToNode(node, "base");
			} else if (data === "group") {
				this._handleAddGroupToNode(node);
			}
		} catch (e) {
			// Ignore errors
		}
	}

	private _addNodeToParent(nodes: TreeNodeInfo<IEffectNode>[], parentId: string | number, newNode: TreeNodeInfo<IEffectNode>): TreeNodeInfo<IEffectNode>[] {
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

	private _handleDeleteNode(node: TreeNodeInfo<IEffectNode>): void {
		const nodeData = node.nodeData;
		if (!nodeData) {
			return;
		}

		// Check if this is an effect root node (uuid matches an effect ID)
		const effectId = nodeData.uuid;
		if (effectId && this._effects.has(effectId)) {
			// Delete entire effect
			const effectInfo = this._effects.get(effectId);
			if (effectInfo) {
				effectInfo.effect.dispose();
				this._effects.delete(effectId);
				this._rebuildTree();
			}
		} else {
			// Delete node from effect hierarchy
			const effect = this._findEffectForNode(node);
			if (!effect) {
				return;
			}

			// Find and remove node from effect hierarchy using instance comparison
			const removeNodeFromHierarchy = (current: IEffectNode): boolean => {
				// Remove from children - use instance comparison primarily
				const index = current.children.findIndex((child) => {
					// Primary: instance comparison
					if (child === nodeData) {
						return true;
					}
					// Fallback: uuid comparison (if both have uuid)
					if (child.uuid && nodeData.uuid && child.uuid === nodeData.uuid) {
						return true;
					}
					return false;
				});

				if (index !== -1) {
					const removedNode = current.children[index];
					// Recursively dispose all children first
					this._disposeNodeRecursive(removedNode);
					current.children.splice(index, 1);
					return true;
				}

				// Recursively search in children
				for (const child of current.children) {
					if (removeNodeFromHierarchy(child)) {
						return true;
					}
				}
				return false;
			};

			if (effect.root) {
				removeNodeFromHierarchy(effect.root);
				this._rebuildTree();
			}
		}

		// Clear selection if deleted node was selected
		if (this.state.selectedNodeId === node.id) {
			this.setState({ selectedNodeId: null });
			this.props.onNodeSelected?.(null);
		}
	}

	/**
	 * Recursively dispose a node and all its children
	 */
	private _disposeNodeRecursive(node: IEffectNode): void {
		// First dispose all children
		for (const child of node.children) {
			this._disposeNodeRecursive(child);
		}

		// Dispose system if it's a particle system
		if (node.system) {
			node.system.dispose();
		}
		// Dispose group if it's a group
		if (node.group) {
			node.group.dispose();
		}

		// Clear the node ID from our map
		this._nodeIdMap.delete(node);
	}
}
