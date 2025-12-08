import { Component, ReactNode } from "react";
import { Tree, TreeNodeInfo } from "@blueprintjs/core";
import { Scene, AbstractMesh, ParticleSystem, SolidParticleSystem, Vector3, Color4, StandardMaterial, PBRMaterial, Texture, Color3 } from "babylonjs";
import { createParticleSystemFromData, createGroupMesh } from "./particle-generator";
import { IFXParticleData, IFXGroupData, IFXNodeData, isGroupData, isParticleData } from "./properties/types";
import { IConvertedNode, convertThreeJSJSONToFXEditor, IConvertedData } from "./loader";

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

// Maps to track created particle systems and meshes
const createdParticleSystemsMap = new Map<string | number, ParticleSystem | SolidParticleSystem>();
const createdMeshesMap = new Map<string | number, AbstractMesh>();
const createdMaterialsMap = new Map<string, StandardMaterial | PBRMaterial>();
const createdTexturesMap = new Map<string, Texture>();

export interface IFXEditorGraphProps {
	filePath: string | null;
	onNodeSelected?: (nodeId: string | number | null) => void;
	onResourcesLoaded?: (resources: IConvertedNode[]) => void;
	scene?: Scene;
}

export interface IFXEditorGraphState {
	nodes: TreeNodeInfo[];
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
	private _findNodeById(nodes: TreeNodeInfo[], nodeId: string | number): TreeNodeInfo | null {
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
	 * Updates node data in the tree
	 */
	private _updateNodeDataInTree(nodes: TreeNodeInfo[], nodeId: string | number, data: IFXNodeData): TreeNodeInfo[] {
		return nodes.map((n) => {
			if (n.id === nodeId) {
				return {
					...n,
					nodeData: data,
					label: this._getNodeLabelComponent(n, data.name),
				};
			}
			if (n.childNodes) {
				return {
					...n,
					childNodes: this._updateNodeDataInTree(n.childNodes, nodeId, data),
				};
			}
			return n;
		});
	}

	/**
	 * Gets node data by ID from tree
	 */
	public getNodeData(nodeId: string | number): IFXNodeData | undefined {
		const node = this._findNodeById(this.state.nodes, nodeId);
		return node ? (node.nodeData as IFXNodeData) : undefined;
	}

	/**
	 * Sets node data for a node
	 */
	public setNodeData(nodeId: string | number, data: IFXNodeData): void {
		const nodes = this._updateNodeDataInTree(this.state.nodes, nodeId, data);
		this.setState({ nodes });
	}

	/**
	 * Gets or creates particle data for a node
	 */
	public getOrCreateParticleData(nodeId: string | number): IFXParticleData {
		const existing = this.getNodeData(nodeId);
		if (existing && isParticleData(existing)) {
			return existing;
		}

		const newData: IFXParticleData = {
			type: "particle",
			id: String(nodeId),
			name: "Particle",
			visibility: true,
			position: new Vector3(0, 0, 0),
			rotation: new Vector3(0, 0, 0),
			scale: new Vector3(1, 1, 1),
			emitterShape: {
				shape: "Box",
				direction1: new Vector3(0, 1, 0),
				direction2: new Vector3(0, 1, 0),
				minEmitBox: new Vector3(-0.5, -0.5, -0.5),
				maxEmitBox: new Vector3(0.5, 0.5, 0.5),
				radius: 1.0,
				angle: 0.785398,
				radiusRange: 0.0,
				heightRange: 0.0,
				emitFromSpawnPointOnly: false,
				height: 1.0,
				directionRandomizer: 0.0,
				meshPath: null,
			},
			particleRenderer: {
				renderMode: "Billboard",
				worldSpace: false,
				material: null,
				materialType: "MeshStandardMaterial",
				transparent: true,
				opacity: 1.0,
				side: "Double",
				blending: "Add",
				color: new Color4(1, 1, 1, 1),
				renderOrder: 0,
				uvTile: {
					column: 1,
					row: 1,
					startTileIndex: 0,
					blendTiles: false,
				},
				texture: null,
				meshPath: null,
				softParticles: false,
			},
			emission: {
				looping: true,
				duration: 5.0,
				prewarm: false,
				onlyUsedByOtherSystem: false,
				emitOverTime: 10,
				emitOverDistance: 0,
			},
			bursts: [],
			particleInitialization: {
				startLife: {
					functionType: "IntervalValue",
					data: { min: 1.0, max: 2.0 },
				},
				startSize: {
					functionType: "IntervalValue",
					data: { min: 0.1, max: 0.2 },
				},
				startSpeed: {
					functionType: "IntervalValue",
					data: { min: 1.0, max: 2.0 },
				},
				startColor: {
					colorFunctionType: "ConstantColor",
					data: { color: new Color4(1, 1, 1, 1) },
				},
				startRotation: {
					functionType: "IntervalValue",
					data: { min: 0, max: 360 },
				},
			},
			behaviors: [],
		};

		// Update tree and return the new data
		this.setNodeData(nodeId, newData);
		return newData;
	}

	/**
	 * Sets particle data for a node
	 */
	public setParticleData(nodeId: string | number, data: IFXParticleData): void {
		// Ensure type is set correctly
		const newData: IFXParticleData = { ...data, type: "particle" };
		this.setNodeData(nodeId, newData);
	}

	/**
	 * Gets or creates group data for a node
	 */
	public getOrCreateGroupData(nodeId: string | number): IFXGroupData {
		const existing = this.getNodeData(nodeId);
		if (existing && isGroupData(existing)) {
			return existing;
		}

		const newData: IFXGroupData = {
			type: "group",
			id: String(nodeId),
			name: "Group",
			visibility: true,
			position: new Vector3(0, 0, 0),
			rotation: new Vector3(0, 0, 0),
			scale: new Vector3(1, 1, 1),
		};

		// Update tree and return the new data
		this.setNodeData(nodeId, newData);
		return newData;
	}

	/**
	 * Sets group data for a node
	 */
	public setGroupData(nodeId: string | number, data: IFXGroupData): void {
		// Ensure type is set correctly
		const newData: IFXGroupData = { ...data, type: "group" };
		this.setNodeData(nodeId, newData);
	}

	/**
	 * Checks if a node is a group
	 */
	public isGroupNode(nodeId: string | number): boolean {
		const data = this.getNodeData(nodeId);
		return data !== undefined && isGroupData(data);
	}

	public componentDidMount(): void {
		this._syncParticlesWithScene();
	}

	public componentDidUpdate(prevProps: IFXEditorGraphProps): void {
		if (prevProps.scene !== this.props.scene) {
			this._syncParticlesWithScene();
		}
	}

	/**
	 * Loads nodes from converted Three.js JSON data
	 */
	public async loadFromFile(filePath: string): Promise<void> {
		try {
			const convertedData = await convertThreeJSJSONToFXEditor(filePath);
			const { nodes, resources, materials, textures } = convertedData;
			
			// Create materials and textures if scene is available
			if (this.props.scene) {
				await this._createMaterialsAndTextures(materials, textures, filePath);
			}
			
			// Filter out resource nodes (texture, geometry) - they will be shown in Resources tab
			const particleNodes = nodes.filter((n) => n.type === "particle" || n.type === "group");
			const treeNodes = this._convertToTreeNodeInfo(particleNodes, null);
			this.setState({ nodes: treeNodes }, () => {
				this._syncParticlesWithScene();
			});
			// Notify parent about loaded resources
			if (this.props.onResourcesLoaded) {
				this.props.onResourcesLoaded(resources);
			}
		} catch (error) {
			console.error("Failed to load FX file:", error);
		}
	}

	/**
	 * Creates materials and textures from converted data
	 */
	private async _createMaterialsAndTextures(
		materials: IConvertedData["materials"],
		textures: IConvertedData["textures"],
		filePath: string
	): Promise<void> {
		if (!this.props.scene) {
			return;
		}

		const scene = this.props.scene;
		const dirname = require("path").dirname(filePath);

		// Clear existing materials and textures
		createdMaterialsMap.forEach((mat) => mat.dispose());
		createdMaterialsMap.clear();
		createdTexturesMap.forEach((tex) => tex.dispose());
		createdTexturesMap.clear();

		// Create textures first
		for (const textureData of textures) {
			if (!textureData.imageUrl) {
				continue;
			}

			try {
				// Resolve texture path relative to JSON file
				const texturePath = require("path").isAbsolute(textureData.imageUrl)
					? textureData.imageUrl
					: require("path").join(dirname, textureData.imageUrl);

				const texture = new Texture(texturePath, scene);
				texture.name = textureData.name || textureData.uuid;
				createdTexturesMap.set(textureData.uuid, texture);
			} catch (error) {
				console.warn(`Failed to load texture ${textureData.uuid}:`, error);
			}
		}

		// Create materials
		for (const materialData of materials) {
			try {
				let material: StandardMaterial | PBRMaterial;

				if (materialData.type === "MeshBasicMaterial") {
					material = new StandardMaterial(`Material_${materialData.uuid}`, scene);
				} else {
					// MeshStandardMaterial -> PBRMaterial
					material = new PBRMaterial(`Material_${materialData.uuid}`, scene);
				}

				// Convert color from hex number (0xRRGGBB) to Color3
				if (materialData.color !== undefined) {
					const r = ((materialData.color >> 16) & 0xff) / 255;
					const g = ((materialData.color >> 8) & 0xff) / 255;
					const b = (materialData.color & 0xff) / 255;
					
					if (material instanceof StandardMaterial) {
						material.diffuseColor = new Color3(r, g, b);
					} else if (material instanceof PBRMaterial) {
						material.albedoColor = new Color3(r, g, b);
					}
				}

				// Apply texture
				if (materialData.map) {
					const texture = createdTexturesMap.get(materialData.map);
					if (texture) {
						if (material instanceof StandardMaterial) {
							material.diffuseTexture = texture;
						} else if (material instanceof PBRMaterial) {
							material.albedoTexture = texture;
						}
					}
				}

				// Apply transparency
				if (materialData.transparent !== undefined) {
					material.alpha = materialData.transparent ? (materialData.opacity ?? 1.0) : 1.0;
				} else if (materialData.opacity !== undefined) {
					material.alpha = materialData.opacity;
				}

				// Apply side (0 = Front, 1 = Back, 2 = Double)
				if (materialData.side !== undefined) {
					if (materialData.side === 0) {
						material.sideOrientation = 1; // Front
					} else if (materialData.side === 1) {
						material.sideOrientation = 2; // Back
					} else {
						material.sideOrientation = 0; // Double
					}
				}

				// Apply depth write
				if (materialData.depthWrite !== undefined) {
					material.disableDepthWrite = !materialData.depthWrite;
				}

				// Apply blending (0 = No, 1 = Normal, 2 = Additive, 3 = Multiply, etc.)
				if (materialData.blending !== undefined) {
					// Three.js blending modes: 0 = No, 1 = Normal, 2 = Additive, 3 = Multiply
					// Babylon.js: use alpha blending for additive, multiply for multiply
					if (materialData.blending === 2) {
						// Additive blending
						material.alphaMode = 2; // ALPHA_ADD
					} else if (materialData.blending === 3) {
						// Multiply blending
						material.alphaMode = 3; // ALPHA_MULTIPLY
					}
				}

				createdMaterialsMap.set(materialData.uuid, material);
			} catch (error) {
				console.warn(`Failed to create material ${materialData.uuid}:`, error);
			}
		}
	}

	/**
	 * Updates node names in the graph (called when name changes in properties)
	 */
	public updateNodeNames(): void {
		const nodes = this._updateAllNodeNames(this.state.nodes);
		this.setState({ nodes });
	}

	/**
	 * Converts converted nodes to TreeNodeInfo format
	 */
	private _convertToTreeNodeInfo(convertedNodes: IConvertedNode[], _parentId: string | null): TreeNodeInfo[] {
		return convertedNodes.map((node) => {
			// Create node data based on type (only particle and group nodes should be here)
			let nodeData: IFXNodeData;
			if (node.type === "particle" && node.particleData) {
				nodeData = { ...node.particleData, type: "particle" };
			} else if (node.type === "group" && node.groupData) {
				// Group node - use groupData from loader if available
				nodeData = { ...node.groupData, type: "group" };
			} else {
				// Fallback for group node without groupData
				nodeData = {
					type: "group",
					id: node.id,
					name: node.name, // Use original name from JSON
					visibility: true,
					position: new Vector3(0, 0, 0),
					rotation: new Vector3(0, 0, 0),
					scale: new Vector3(1, 1, 1),
				};
			}

			const treeNode: TreeNodeInfo = {
				id: node.id,
				label: this._getNodeLabelComponent({ id: node.id, nodeData } as any, nodeData.name),
				icon: node.type === "particle" ? <IoSparklesSharp className="w-4 h-4" /> : <HiOutlineFolder className="w-4 h-4" />,
				isExpanded: node.type === "group",
				childNodes: node.children ? this._convertToTreeNodeInfo(node.children, node.id) : undefined,
				isSelected: false,
				hasCaret: node.type === "group" || (node.children && node.children.length > 0),
				nodeData: nodeData,
			};

			return treeNode;
		});
	}

	/**
	 * Updates all node names in the tree from actual data
	 */
	private _updateAllNodeNames(nodes: TreeNodeInfo[]): TreeNodeInfo[] {
		return nodes.map((n) => {
			const nodeData = n.nodeData as IFXNodeData | undefined;
			const nodeName = nodeData ? nodeData.name : "Unknown";
			const childNodes = n.childNodes ? this._updateAllNodeNames(n.childNodes) : undefined;
			return {
				...n,
				label: this._getNodeLabelComponent(n, nodeName),
				childNodes,
			};
		});
	}

	/**
	 * Syncs particle systems with the scene based on graph nodes
	 */
	private _syncParticlesWithScene(): void {
		if (!this.props.scene) {
			return;
		}

		// Clear existing particle systems
		createdParticleSystemsMap.forEach((ps) => {
			if (ps.dispose) {
				ps.dispose();
			}
		});
		createdParticleSystemsMap.clear();

		createdMeshesMap.forEach((mesh) => {
			mesh.dispose();
		});
		createdMeshesMap.clear();

		// Create particle systems from graph nodes
		this._createParticlesFromNodes(this.state.nodes, this.props.scene, null);
	}

	/**
	 * Recursively creates particle systems from graph nodes
	 */
	private _createParticlesFromNodes(nodes: TreeNodeInfo[], scene: Scene, parentMesh: AbstractMesh | null): void {
		for (const node of nodes) {
			const nodeData = node.nodeData as IFXNodeData | undefined;
			if (!nodeData) {
				continue;
			}

			if (isGroupData(nodeData)) {
				// Create group mesh (empty mesh)
				const groupMesh = createGroupMesh(scene, nodeData.name, nodeData.position, nodeData.rotation, nodeData.scale);
				groupMesh.setEnabled(nodeData.visibility);

				if (parentMesh) {
					groupMesh.parent = parentMesh;
				}

				createdMeshesMap.set(nodeData.id, groupMesh);

				// Recursively create children
				if (node.childNodes) {
					this._createParticlesFromNodes(node.childNodes, scene, groupMesh);
				}
			} else if (isParticleData(nodeData)) {
				// Apply material and texture to particle data if available
				if (nodeData.particleRenderer.material?.uuid) {
					const material = createdMaterialsMap.get(nodeData.particleRenderer.material.uuid);
					if (material) {
						// Material is already created, we can use it
						// Note: ParticleSystem doesn't directly use materials, but we can apply texture
					}
				}

				// Apply texture if available
				if (nodeData.particleRenderer.texture?.uuid) {
					const texture = createdTexturesMap.get(nodeData.particleRenderer.texture.uuid);
					if (texture) {
						nodeData.particleRenderer.texture = texture;
					}
				}

				// Create particle system
				const emitter = parentMesh || undefined;
				const particleSystem = createParticleSystemFromData(scene, nodeData, emitter);

				if (particleSystem) {
					createdParticleSystemsMap.set(nodeData.id, particleSystem);
				}

				// Recursively create children (particles can have children too)
				if (node.childNodes) {
					this._createParticlesFromNodes(node.childNodes, scene, emitter || null);
				}
			}
		}
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
		const nodeData = node.nodeData as IFXNodeData | undefined;
		return nodeData?.name || "Unknown";
	}

	private _getNodeType(node: TreeNodeInfo): "particle" | "group" {
		const nodeData = node.nodeData as IFXNodeData | undefined;
		if (!nodeData) {
			return "particle";
		}
		return isGroupData(nodeData) ? "group" : "particle";
	}

	private _handleNodeClicked(node: TreeNodeInfo): void {
		const selectedId = node.id as string | number;
		const nodes = this._updateNodeSelection(this.state.nodes, selectedId);
		this.setState({ nodes, selectedNodeId: selectedId });
		this.props.onNodeSelected?.(selectedId);
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

	private _handleAddParticles(parentId?: string | number): void {
		const nodeId = `particle-${Date.now()}`;
		const particleData = this.getOrCreateParticleData(nodeId);

		const newNode: TreeNodeInfo = {
			id: nodeId,
			label: this._getNodeLabelComponent({ id: nodeId, nodeData: particleData } as any, particleData.name),
			icon: <IoSparklesSharp className="w-4 h-4" />,
			isExpanded: false,
			childNodes: undefined,
			isSelected: false,
			hasCaret: false,
			nodeData: particleData,
		};

		if (parentId) {
			// Add to parent's children
			const nodes = this._addNodeToParent(this.state.nodes, parentId, newNode);
			this.setState({ nodes }, () => {
				this._syncParticlesWithScene();
			});
		} else {
			// Add to root
			this.setState(
				{
					nodes: [...this.state.nodes, newNode],
				},
				() => {
					this._syncParticlesWithScene();
				}
			);
		}
	}

	private _handleAddGroup(parentId?: string | number): void {
		const nodeId = `group-${Date.now()}`;
		const groupData = this.getOrCreateGroupData(nodeId);

		const newNode: TreeNodeInfo = {
			id: nodeId,
			label: this._getNodeLabelComponent({ id: nodeId, nodeData: groupData } as any, groupData.name),
			icon: <HiOutlineFolder className="w-4 h-4" />,
			isExpanded: true,
			childNodes: [],
			isSelected: false,
			hasCaret: true,
			nodeData: groupData,
		};

		if (parentId) {
			// Add to parent's children
			const nodes = this._addNodeToParent(this.state.nodes, parentId, newNode);
			this.setState({ nodes }, () => {
				this._syncParticlesWithScene();
			});
		} else {
			// Add to root
			this.setState(
				{
					nodes: [...this.state.nodes, newNode],
				},
				() => {
					this._syncParticlesWithScene();
				}
			);
		}
	}

	private _handleAddParticlesToNode(node: TreeNodeInfo): void {
		const nodeId = node.id as string | number;
		this._handleAddParticles(nodeId);
	}

	private _handleAddGroupToNode(node: TreeNodeInfo): void {
		const nodeId = node.id as string | number;
		this._handleAddGroup(nodeId);
	}

	private _addNodeToParent(nodes: TreeNodeInfo[], parentId: string | number, newNode: TreeNodeInfo): TreeNodeInfo[] {
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

		const deletedId = node.id!;

		// Dispose particle system or mesh
		const particleSystem = createdParticleSystemsMap.get(deletedId);
		if (particleSystem) {
			if (particleSystem.dispose) {
				particleSystem.dispose();
			}
			createdParticleSystemsMap.delete(deletedId);
		}

		const mesh = createdMeshesMap.get(deletedId);
		if (mesh) {
			mesh.dispose();
			createdMeshesMap.delete(deletedId);
		}

		// Node data is removed automatically when node is deleted from tree

		const newNodes = deleteNodeById(this.state.nodes, deletedId);
		const newSelectedNodeId = this.state.selectedNodeId === deletedId ? null : this.state.selectedNodeId;

		this.setState(
			{
				nodes: newNodes,
				selectedNodeId: newSelectedNodeId,
			},
			() => {
				this._syncParticlesWithScene();
			}
		);

		if (this.state.selectedNodeId === deletedId) {
			this.props.onNodeSelected?.(null);
		}
	}
}
