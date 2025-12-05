import { Component, ReactNode } from "react";
import { Tree, TreeNodeInfo } from "@blueprintjs/core";

import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";
import { IoSparklesSharp } from "react-icons/io5";

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

export interface IFXEditorGraphProps {
	filePath: string | null;
}

export interface IFXParticleNode {
	id: string;
	name: string;
}

export interface IFXEditorGraphState {
	nodes: TreeNodeInfo[];
}

export class FXEditorGraph extends Component<IFXEditorGraphProps, IFXEditorGraphState> {
	public constructor(props: IFXEditorGraphProps) {
		super(props);

		this.state = {
			nodes: [],
		};
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
					onDragOver={(ev) => ev.preventDefault()}
				>
					<ContextMenu>
						<ContextMenuTrigger className="w-full h-full">
							<div className="w-full h-full flex items-center justify-center">
								{this.state.nodes.length === 0 && (
									<div className="p-4 text-muted-foreground">No particles. Right-click to add.</div>
								)}
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
								</ContextMenuSubContent>
							</ContextMenuSub>
						</ContextMenuContent>
					</ContextMenu>
				</div>
			</div>
		);
	}

	private _handleNodeExpanded(node: TreeNodeInfo): void {
		const nodeId = node.id;
		const nodes = this._updateNodeExpanded(this.state.nodes, nodeId as string | number, true);
		this.setState({ nodes });
	}

	private _handleNodeCollapsed(node: TreeNodeInfo): void {
		const nodeId = node.id;
		const nodes = this._updateNodeExpanded(this.state.nodes, nodeId as string | number, false);
		this.setState({ nodes });
	}

	private _updateNodeExpanded(nodes: TreeNodeInfo[], nodeId: string | number, isExpanded: boolean): TreeNodeInfo[] {
		return nodes.map((n) => {
			const nodeName = this._getNodeName(n);
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

	private _getNodeName(node: TreeNodeInfo): string {
		// Extract name from label - if it's a React element, try to get text content
		if (typeof node.label === "string") {
			return node.label;
		}
		// Default name for particles
		return "Particle";
	}

	private _handleNodeClicked(node: TreeNodeInfo): void {
		const nodes = this._updateNodeSelection(this.state.nodes, node.id as string | number);
		this.setState({ nodes });
	}


	private _updateNodeSelection(nodes: TreeNodeInfo[], selectedId: string | number): TreeNodeInfo[] {
		return nodes.map((n) => {
			const nodeName = this._getNodeName(n);
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

	private _getNodeLabelComponent(node: TreeNodeInfo, name: string): JSX.Element {
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
							<ContextMenuItem onClick={() => this._handleAddParticles()}>
								<IoSparklesSharp className="w-4 h-4" /> Particle
							</ContextMenuItem>
						</ContextMenuSubContent>
					</ContextMenuSub>
					<ContextMenuSeparator />
					<ContextMenuItem
						className="flex items-center gap-2 !text-red-400"
						onClick={() => this._handleDeleteNode(node)}
					>
						<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Delete
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		);
	}

	private _handleAddParticles(): void {
		const nodeId = `particle-${Date.now()}`;
		const newNode: TreeNodeInfo = {
			id: nodeId,
			label: this._getNodeLabelComponent({ id: nodeId } as TreeNodeInfo, "Particle"),
			icon: <IoSparklesSharp className="w-4 h-4" />,
			isExpanded: false,
			childNodes: undefined,
			isSelected: false,
			hasCaret: false,
		};

		this.setState({
			nodes: [...this.state.nodes, newNode],
		});
	}

	private _handleDeleteNode(node: TreeNodeInfo): void {
		const deleteNodeById = (nodes: TreeNodeInfo[], id: string | number): TreeNodeInfo[] => {
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

		this.setState({
			nodes: deleteNodeById(this.state.nodes, node.id!),
		});
	}
}
