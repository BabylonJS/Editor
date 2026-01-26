import { Component, DragEvent, ReactNode } from "react";
import { Button, Tree, TreeNodeInfo } from "@blueprintjs/core";

import { FaLink } from "react-icons/fa6";
import { IoMdCube } from "react-icons/io";
import { BsSoundwave } from "react-icons/bs";
import { AiOutlinePlus } from "react-icons/ai";
import { HiSpeakerWave } from "react-icons/hi2";
import { MdOutlineQuestionMark } from "react-icons/md";
import { GiBrickWall, GiSparkles } from "react-icons/gi";
import { HiOutlineCubeTransparent } from "react-icons/hi";
import { IoCheckmark, IoSparklesSharp } from "react-icons/io5";
import { TbGhost2Filled, TbServerSpark } from "react-icons/tb";
import { FaCamera, FaImage, FaLightbulb, FaBone } from "react-icons/fa";
import { SiAdobeindesign, SiBabylondotjs } from "react-icons/si";

import { AdvancedDynamicTexture } from "babylonjs-gui";
import { BaseTexture, Node, Scene, Sound, Tools, IParticleSystem, Sprite, Skeleton, TransformNode } from "babylonjs";

import { Editor } from "../main";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../ui/shadcn/ui/dropdown-menu";
import {
	ContextMenu,
	ContextMenuItem,
	ContextMenuContent,
	ContextMenuTrigger,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "../../ui/shadcn/ui/context-menu";

import { isSound } from "../../tools/guards/sound";
import { cloneNode } from "../../tools/node/clone";
import { registerUndoRedo } from "../../tools/undoredo";
import { isDomTextInputFocused } from "../../tools/dom";
import { isSceneLinkNode } from "../../tools/guards/scene";
import { updateAllLights } from "../../tools/light/shadows";
import { getCollisionMeshFor } from "../../tools/mesh/collision";
import { isNodeVisibleInGraph } from "../../tools/node/metadata";
import { isAdvancedDynamicTexture } from "../../tools/guards/texture";
import { updateIblShadowsRenderPipeline } from "../../tools/light/ibl";
import { UniqueNumber, waitNextAnimationFrame } from "../../tools/tools";
import { getSpriteManagerNodeFromSprite } from "../../tools/sprite/tools";
import { isParticleSystemVisibleInGraph } from "../../tools/particles/metadata";
import { applyTransformNodeParentingConfiguration } from "../../tools/node/parenting";
import { isSprite, isSpriteManagerNode, isSpriteMapNode } from "../../tools/guards/sprites";
import { isAnyParticleSystem, isGPUParticleSystem, isNodeParticleSystemSetMesh, isParticleSystem } from "../../tools/guards/particles";
import {
	isAbstractMesh,
	isAnyTransformNode,
	isCamera,
	isCollisionInstancedMesh,
	isCollisionMesh,
	isEditorCamera,
	isInstancedMesh,
	isLight,
	isMesh,
	isNode,
	isTransformNode,
} from "../../tools/guards/nodes";
import {
	onNodeModifiedObservable,
	onNodesAddedObservable,
	onParticleSystemAddedObservable,
	onParticleSystemModifiedObservable,
	onSpriteModifiedObservable,
	onTextureModifiedObservable,
} from "../../tools/observables";

import { getNodeCommands } from "../dialogs/command-palette/node";
import { getMeshCommands } from "../dialogs/command-palette/mesh";
import { getLightCommands } from "../dialogs/command-palette/light";
import { getCameraCommands } from "../dialogs/command-palette/camera";
import { getSpriteCommands } from "../dialogs/command-palette/sprite";

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
	 * Defines wether or not only lights should be shown in the graph.
	 */
	showOnlyLights: boolean;
	/**
	 * Defines wether or not only decals should be shown in the graph.
	 */
	showOnlyDecals: boolean;

	/**
	 * Defines wether or not instanced meshes should be hidden from the graph.
	 */
	hideInstancedMeshes: boolean;
}

export class EditorGraph extends Component<IEditorGraphProps, IEditorGraphState> {
	private _soundsList: Sound[] = [];

	public _nodeToCopyTransform: Node | null = null;
	public _objectsToCopy: TreeNodeInfo<unknown>[] = [];

	public constructor(props: IEditorGraphProps) {
		super(props);

		this.state = {
			nodes: [],
			search: "",
			isFocused: false,

			showOnlyLights: false,
			showOnlyDecals: false,

			hideInstancedMeshes: false,
		};

		onNodesAddedObservable.add(() => this.refresh());
		onParticleSystemAddedObservable.add(() => this.refresh());

		onNodeModifiedObservable.add((node) => this._handleObjectModified(node));
		onSpriteModifiedObservable.add((node) => this._handleObjectModified(node));
		onTextureModifiedObservable.add((texture) => this._handleObjectModified(texture));
		onParticleSystemModifiedObservable.add((particleSystem) => this._handleObjectModified(particleSystem));

		document.addEventListener("copy", () => !isDomTextInputFocused() && this.copySelectedNodes());
		document.addEventListener("paste", () => !isDomTextInputFocused() && this.pasteSelectedNodes());
	}

	public render(): ReactNode {
		return (
			<div
				className="flex flex-col w-full h-full text-foreground"
				onClick={() => this.setState({ isFocused: true })}
				onMouseLeave={() => this.setState({ isFocused: false })}
			>
				<div className="flex justify-between gap-2 w-full p-2">
					<input
						type="text"
						placeholder="Search..."
						value={this.state.search}
						onChange={(ev) => this._handleSearch(ev.currentTarget.value)}
						className="px-5 py-2 w-full rounded-lg bg-primary-foreground outline-none"
					/>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button minimal icon="settings" className="transition-all duration-300" />
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem
								className="flex gap-1 items-center"
								onClick={() => {
									this.setState({ hideInstancedMeshes: !this.state.hideInstancedMeshes }, () => this.refresh());
								}}
							>
								{this.state.hideInstancedMeshes ? <IoCheckmark /> : ""} Hide Instanced Meshes
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="flex gap-1 items-center"
								onClick={() => {
									this.setState({ showOnlyLights: !this.state.showOnlyLights }, () => this.refresh());
								}}
							>
								{this.state.showOnlyLights ? <IoCheckmark /> : ""} Show Only Lights
							</DropdownMenuItem>
							<DropdownMenuItem
								className="flex gap-1 items-center"
								onClick={() => {
									this.setState({ showOnlyDecals: !this.state.showOnlyDecals }, () => this.refresh());
								}}
							>
								{this.state.showOnlyDecals ? <IoCheckmark /> : ""} Show Only Decals
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

				<div className="w-full h-full min-h-20" onDragOver={(ev) => ev.preventDefault()} onDrop={(ev) => this._handleDropEmpty(ev)}>
					<ContextMenu>
						<ContextMenuTrigger className="w-full h-full">
							<div className="w-full h-full"></div>
						</ContextMenuTrigger>
						<ContextMenuContent>
							<ContextMenuSub>
								<ContextMenuSubTrigger className="flex items-center gap-2">
									<AiOutlinePlus className="w-5 h-5" /> Add
								</ContextMenuSubTrigger>
								<ContextMenuSubContent>
									{getLightCommands(this.props.editor).map((command) => {
										return (
											<ContextMenuItem key={command.key} disabled={command.disabled} onClick={command.action}>
												{command.text}
											</ContextMenuItem>
										);
									})}
									<ContextMenuSeparator />
									{getNodeCommands(this.props.editor).map((command) => {
										return (
											<ContextMenuItem key={command.key} disabled={command.disabled} onClick={command.action}>
												{command.text}
											</ContextMenuItem>
										);
									})}
									<ContextMenuSeparator />
									<ContextMenuSub>
										<ContextMenuSubTrigger className="flex items-center gap-2">
											<IoMdCube className="w-5 h-5" /> Meshes
										</ContextMenuSubTrigger>
										<ContextMenuSubContent>
											{getMeshCommands(this.props.editor).map((command) => {
												return (
													<ContextMenuItem key={command.key} disabled={command.disabled} onClick={command.action}>
														{command.text}
													</ContextMenuItem>
												);
											})}
										</ContextMenuSubContent>
									</ContextMenuSub>
									<ContextMenuSeparator />
									{getCameraCommands(this.props.editor).map((command) => {
										return (
											<ContextMenuItem key={command.key} disabled={command.disabled} onClick={command.action}>
												{command.text}
											</ContextMenuItem>
										);
									})}
									<ContextMenuSeparator />
									{getSpriteCommands(this.props.editor).map((command) => {
										return (
											<ContextMenuItem key={command.key} disabled={command.disabled} onClick={command.action}>
												{command.text}
											</ContextMenuItem>
										);
									})}
								</ContextMenuSubContent>
							</ContextMenuSub>
						</ContextMenuContent>
					</ContextMenu>
				</div>
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
	public refresh(): Promise<void> {
		const scene = this.props.editor.layout.preview.scene;

		this._soundsList = scene.soundTracks?.map((st) => st.soundCollection).flat() ?? [];

		let nodes: (TreeNodeInfo | null)[] = [];

		if (this.state.showOnlyLights || this.state.showOnlyDecals) {
			if (this.state.showOnlyLights) {
				nodes.push(...scene.lights.map((light) => this._parseSceneNode(light, true)));
			}

			if (this.state.showOnlyDecals) {
				nodes.push(...scene.meshes.filter((mesh) => mesh.metadata?.decal).map((mesh) => this._parseSceneNode(mesh, true)));
			}
		} else {
			nodes = scene.rootNodes.filter((n) => !isEditorCamera(n)).map((n) => this._parseSceneNode(n));
		}

		const guiNode = this._parseGuiNode(scene);
		if (guiNode) {
			nodes.splice(0, 0, guiNode);
		}

		const soundNode = this._parseSoundNode(scene);
		if (soundNode) {
			nodes.splice(0, 0, soundNode);
		}

		const skeletonNode = this._parseSkeletonNode(scene);
		if (skeletonNode) {
			nodes.splice(0, 0, skeletonNode);
		}

		nodes.splice(0, 0, {
			id: "__editor__scene__",
			nodeData: scene,
			icon: <SiBabylondotjs className="w-4 h-4" />,
			label: this._getNodeLabelComponent(scene, "Scene", false),
		});

		this.setState({
			nodes: nodes.filter((n) => n !== null) as TreeNodeInfo[],
		});

		return waitNextAnimationFrame();
	}

	/**
	 * Sets the given node selected in the graph. All other selected nodes
	 * become unselected to have only the given node selected. All parents are expanded.
	 * @param node defines the reference tot the node to select in the graph.
	 */
	public setSelectedNode(node: Node | Sound | IParticleSystem | Sprite): void {
		let source = isSound(node) ? node["_connectedTransformNode"] : isAnyParticleSystem(node) ? node.emitter : node;

		if (!source) {
			return;
		}

		if (isSprite(source)) {
			source = getSpriteManagerNodeFromSprite(source);
		}

		const idsToExpand: string[] = [];

		while (source) {
			idsToExpand.push(source.id);
			source = source.parent;
		}

		this._forEachNode(this.state.nodes, (n) => {
			if (typeof n.id === "string" && idsToExpand.includes(n.id)) {
				n.isExpanded = true;
			}

			n.isSelected = n.nodeData === node;
		});

		this.setState({ nodes: this.state.nodes });
	}

	/**
	 * Returns whether or not the given node is selected in the graph.
	 * @param nodeData defines the reference to the node data to check.
	 */
	public isNodeSelected(nodeData: any): boolean {
		return this.getSelectedNodes().find((n) => n.nodeData === nodeData) !== undefined;
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
		this.refresh();
	}

	/**
	 * Pastes the previously copied nodes.
	 */
	public pasteSelectedNodes(parent?: Node, shift?: boolean): void {
		if (!this._objectsToCopy.length) {
			return;
		}

		const newNodes: (Node | IParticleSystem | Sprite)[] = [];
		const nodesToCopy = this._objectsToCopy.map((n) => n.nodeData);

		registerUndoRedo({
			executeRedo: true,
			action: () => {
				this.refresh();

				waitNextAnimationFrame().then(() => {
					const firstNode = newNodes[0] ?? null;
					if (firstNode) {
						this.props.editor.layout.graph.setSelectedNode(firstNode);

						if (isNode(firstNode) || isSprite(firstNode)) {
							this.props.editor.layout.preview.gizmo.setAttachedObject(firstNode);
						}
					}

					this.props.editor.layout.inspector.setEditedObject(firstNode);
					this.props.editor.layout.animations.setEditedObject(firstNode);
				});
			},
			undo: () => {
				newNodes.forEach((node) => {
					node.dispose(false, false);
				});
				newNodes.splice(0, newNodes.length);
			},
			redo: () => {
				const tempTransfromNode = new TransformNode("tempParent", this.props.editor.layout.preview.scene);

				try {
					nodesToCopy.forEach((object) => {
						let node: Node | IParticleSystem | Sprite | null = null;

						if (isAbstractMesh(object) && !isNodeParticleSystemSetMesh(object)) {
							const suffix = "(Instanced Mesh)";
							const name = isInstancedMesh(object) ? object.name : `${object.name.replace(` ${suffix}`, "")} ${suffix}`;

							const instance = (node = object.createInstance(name));
							instance.position.copyFrom(object.position);
							instance.rotation.copyFrom(object.rotation);
							instance.scaling.copyFrom(object.scaling);
							instance.rotationQuaternion = object.rotationQuaternion?.clone() ?? null;
							instance.parent = object.parent;

							const collisionMesh = getCollisionMeshFor(instance.sourceMesh);
							collisionMesh?.updateInstances(instance.sourceMesh);
						} else if (isParticleSystem(object) && isAbstractMesh(parent)) {
							const suffix = "(Clone)";
							const name = `${object.name.replace(` ${suffix}`, "")} ${suffix}`;

							node = object.clone(name, parent, false);
						} else if (isNode(object) || isSprite(object)) {
							node = cloneNode(this.props.editor, object);
						}

						if (node) {
							if (!isSprite(node)) {
								node.id = Tools.RandomId();
							}

							node.uniqueId = UniqueNumber.Get();

							if (parent && isNode(node)) {
								if (shift && isNode(object)) {
									node.parent = object.parent;
									applyTransformNodeParentingConfiguration(node, parent, tempTransfromNode);
								} else {
									node.parent = parent;
								}
							}

							if (isAbstractMesh(node)) {
								this.props.editor.layout.preview.scene.lights
									.map((light) => light.getShadowGenerator())
									.forEach((generator) => generator?.getShadowMap()?.renderList?.push(node));
							}

							newNodes.push(node);
						}
					});
				} catch (e) {
					console.error(e);
				}

				tempTransfromNode.dispose(false, true);
			},
		});
	}

	public copySelectedNodeTransform(node: Node): void {
		this._nodeToCopyTransform = node;
		this.refresh();
	}

	public pasteSelectedNodeTransform(node: Node): void {
		if (!this._nodeToCopyTransform) {
			return;
		}

		const sourcePosition = this._nodeToCopyTransform["position"];
		const sourceRotation = this._nodeToCopyTransform["rotation"];
		const sourceScaling = this._nodeToCopyTransform["scaling"];
		const sourceRotationQuaternion = this._nodeToCopyTransform["rotationQuaternion"];
		const sourceDirection = this._nodeToCopyTransform["direction"];

		const targetPosition = node["position"];
		const targetRotation = node["rotation"];
		const targetScaling = node["scaling"];
		const targetRotationQuaternion = node["rotationQuaternion"];
		const targetDirection = node["direction"];

		const savedTargetPosition = targetPosition?.clone();
		const savedTargetRotation = targetRotation?.clone();
		const savedTargetScaling = targetScaling?.clone();
		const savedTargetRotationQuaternion = targetRotationQuaternion?.clone();
		const savedTargetDirection = targetDirection?.clone();

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				if (savedTargetPosition && targetPosition) {
					targetPosition.copyFrom(savedTargetPosition);
				}

				if (savedTargetRotation && targetRotation) {
					targetRotation.copyFrom(savedTargetRotation);
				}

				if (savedTargetScaling && targetScaling) {
					targetScaling.copyFrom(savedTargetScaling);
				}

				if (targetRotationQuaternion) {
					if (!savedTargetRotationQuaternion) {
						node["rotationQuaternion"] = null;
					} else {
						targetRotationQuaternion.copyFrom(savedTargetRotationQuaternion);
					}
				}

				if (savedTargetDirection && targetDirection) {
					targetDirection.copyFrom(savedTargetDirection);
				}
			},
			redo: () => {
				if (sourcePosition && targetPosition) {
					targetPosition.copyFrom(sourcePosition);
				}

				if (sourceRotation && targetRotation) {
					targetRotation.copyFrom(sourceRotation);
				}

				if (sourceScaling && targetScaling) {
					targetScaling.copyFrom(sourceScaling);
				}

				if (sourceRotationQuaternion) {
					if (targetRotationQuaternion) {
						targetRotationQuaternion.copyFrom(sourceRotationQuaternion);
					} else {
						node["rotationQuaternion"] = sourceRotationQuaternion.clone();
					}
				}

				if (sourceDirection && targetDirection) {
					targetDirection.copyFrom(sourceDirection);
				}
			},
		});

		this.props.editor.layout.inspector.forceUpdate();
	}

	private _handleSearch(search: string) {
		this.setState({ search }, () => {
			this.refresh();
		});
	}

	private _handleNodeClicked(node: TreeNodeInfo, ev: React.MouseEvent<HTMLElement>): void {
		this.props.editor.layout.inspector.setEditedObject(node.nodeData);
		this.props.editor.layout.animations.setEditedObject(node.nodeData);

		if (isNode(node.nodeData) || isSprite(node.nodeData)) {
			this.props.editor.layout.preview.gizmo.setAttachedObject(node.nodeData);
		}

		if (isCamera(node.nodeData)) {
			this.props.editor.layout.preview.setCameraPreviewActive(node.nodeData);
		}

		if (ev.ctrlKey || ev.metaKey) {
			this._forEachNode(this.state.nodes, (n) => n.id === node.id && (n.isSelected = !n.isSelected));
		} else if (ev.shiftKey) {
			this._handleShiftSelect(node);
		} else {
			this._forEachNode(this.state.nodes, (n) => (n.isSelected = n.id === node.id));
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

	private _parseSkeletonNode(scene: Scene): TreeNodeInfo | null {
		if (!scene.skeletons.length) {
			return null;
		}

		const childNodes: TreeNodeInfo[] = [];

		scene.skeletons.forEach((skeleton) => {
			if (!skeleton.name.toLowerCase().includes(this.state.search.toLowerCase())) {
				return;
			}

			childNodes.push(this._getSkeletonNode(skeleton));
		});

		const rootSkeletonNode = {
			childNodes,
			nodeData: scene,
			id: "__editor__skeletons__",
			icon: <FaBone className="w-4 h-4" />,
			label: this._getNodeLabelComponent(scene, "Skeletons", false),
		} as TreeNodeInfo;

		this._forEachNode(this.state.nodes, (n) => {
			if (n.id === rootSkeletonNode.id) {
				rootSkeletonNode.isSelected = n.isSelected;
				rootSkeletonNode.isExpanded = n.isExpanded;
			}
		});

		return rootSkeletonNode;
	}

	private _getSkeletonNode(skeleton: Skeleton): TreeNodeInfo {
		const info = {
			nodeData: skeleton,
			id: skeleton.id,
			icon: <FaBone className="w-4 h-4" />,
			label: this._getNodeLabelComponent(skeleton, skeleton.name, false),
		} as TreeNodeInfo;

		this._forEachNode(this.state.nodes, (n) => {
			if (n.id === info.id) {
				info.isSelected = n.isSelected;
			}
		});

		return info;
	}

	private _parseSoundNode(scene: Scene): TreeNodeInfo | null {
		const soundTracks = scene.soundTracks;
		if (!soundTracks?.length) {
			return null;
		}

		const childNodes: TreeNodeInfo[] = [];

		this._soundsList.forEach((sound) => {
			if (sound.spatialSound) {
				return;
			}

			if (!sound.name.toLowerCase().includes(this.state.search.toLowerCase())) {
				return;
			}

			childNodes.push(this._getSoundNode(sound));
		});

		if (!childNodes.length) {
			return null;
		}

		const rootSoundNode = {
			childNodes,
			nodeData: scene,
			id: "__editor__sounds__",
			icon: <BsSoundwave className="w-4 h-4" />,
			label: this._getNodeLabelComponent(scene, "Sounds", false),
		} as TreeNodeInfo;

		this._forEachNode(this.state.nodes, (n) => {
			if (n.id === rootSoundNode.id) {
				rootSoundNode.isSelected = n.isSelected;
				rootSoundNode.isExpanded = n.isExpanded;
			}
		});

		return rootSoundNode;
	}

	private _getSoundNode(sound: Sound): TreeNodeInfo {
		const info = {
			nodeData: sound,
			id: sound.id,
			icon: this._getIcon(sound),
			label: this._getNodeLabelComponent(sound, sound.name, false),
		} as TreeNodeInfo;

		this._forEachNode(this.state.nodes, (n) => {
			if (n.id === info.id) {
				info.isSelected = n.isSelected;
				info.isExpanded = n.isExpanded;
			}
		});

		return info;
	}

	private _getParticleSystemNode(particleSystem: IParticleSystem): TreeNodeInfo {
		const info = {
			nodeData: particleSystem,
			id: particleSystem.id,
			icon: this._getIcon(particleSystem),
			label: this._getNodeLabelComponent(particleSystem, particleSystem.name, false),
		} as TreeNodeInfo;

		this._forEachNode(this.state.nodes, (n) => {
			if (n.id === info.id) {
				info.isSelected = n.isSelected;
				info.isExpanded = n.isExpanded;
			}
		});

		return info;
	}

	private _getSpriteNode(sprite: Sprite): TreeNodeInfo {
		const info = {
			nodeData: sprite,
			id: sprite.uniqueId,
			icon: this._getIcon(sprite),
			label: this._getNodeLabelComponent(sprite, sprite.name, false),
		} as TreeNodeInfo;

		this._forEachNode(this.state.nodes, (n) => {
			if (n.id === info.id) {
				info.isSelected = n.isSelected;
				info.isExpanded = n.isExpanded;
			}
		});

		return info;
	}

	private _parseGuiNode(scene: Scene): TreeNodeInfo | null {
		const guiTextures = scene.textures.filter((texture) => texture.getClassName() === "AdvancedDynamicTexture") as AdvancedDynamicTexture[];
		if (!guiTextures.length) {
			return null!;
		}

		const childNodes: TreeNodeInfo[] = [];

		guiTextures.forEach((texture) => {
			if (!texture.name.toLowerCase().includes(this.state.search.toLowerCase())) {
				return;
			}

			const info = {
				nodeData: texture,
				id: texture.uniqueId,
				icon: this._getAdvancedTextureIconComponent(texture),
				label: this._getNodeLabelComponent(texture, texture.name, false),
			} as TreeNodeInfo;

			this._forEachNode(this.state.nodes, (n) => {
				if (n.id === info.id) {
					info.isSelected = n.isSelected;
					info.isExpanded = n.isExpanded;
				}
			});

			childNodes.push(info);
		});

		if (!childNodes.length) {
			return null;
		}

		const rootGuiNode = {
			childNodes,
			nodeData: scene,
			id: "__editor__gui__",
			icon: <SiAdobeindesign className="w-4 h-4" />,
			label: this._getNodeLabelComponent(scene, "Gui", false),
		} as TreeNodeInfo;

		this._forEachNode(this.state.nodes, (n) => {
			if (n.id === rootGuiNode.id) {
				rootGuiNode.isSelected = n.isSelected;
				rootGuiNode.isExpanded = n.isExpanded;
			}
		});

		return rootGuiNode;
	}

	private _parseSceneNode(node: Node, noChildren?: boolean): TreeNodeInfo | null {
		if ((isMesh(node) && (node._masterMesh || !isNodeVisibleInGraph(node))) || isCollisionMesh(node) || isCollisionInstancedMesh(node)) {
			return null;
		}

		// Check is in graph
		if (isInstancedMesh(node) && this.state.hideInstancedMeshes) {
			return null;
		}

		if (isAnyTransformNode(node) && !node._scene.transformNodes.includes(node)) {
			return null;
		}

		if (isAbstractMesh(node) && !node._scene.meshes.includes(node)) {
			return null;
		}

		if (isLight(node) && !node._scene.lights.includes(node)) {
			return null;
		}

		if (isCamera(node) && !node._scene.cameras.includes(node)) {
			return null;
		}

		node.id ??= Tools.RandomId();

		const info = {
			id: node.id,
			nodeData: node,
			isSelected: false,
			childNodes: [],
			hasCaret: false,
			icon: this._getNodeIconComponent(node),
			label: this._getNodeLabelComponent(node, node.name),
		} as TreeNodeInfo;

		if (!isSceneLinkNode(node) && !noChildren) {
			const children = node.getDescendants(true);
			if (children.length) {
				info.childNodes = children.map((c) => this._parseSceneNode(c)).filter((c) => c !== null) as TreeNodeInfo[];
			}

			// Handle sounds
			if (isTransformNode(node) || isMesh(node) || isInstancedMesh(node)) {
				const sounds = this._soundsList.filter((s) => s["_connectedTransformNode"] === node);

				sounds?.forEach((sound) => {
					if (sound.name.toLowerCase().includes(this.state.search.toLowerCase())) {
						info.childNodes?.push(this._getSoundNode(sound));
					}
				});
			}

			// Handle particle systems
			if (isAbstractMesh(node) && !noChildren) {
				const particleSystems = this.props.editor.layout.preview.scene.particleSystems.filter((ps) => ps.emitter === node);
				particleSystems.forEach((particleSystem) => {
					if (
						(isParticleSystem(particleSystem) || isGPUParticleSystem(particleSystem)) &&
						isParticleSystemVisibleInGraph(particleSystem) &&
						particleSystem.name.toLowerCase().includes(this.state.search.toLowerCase())
					) {
						info.childNodes?.push(this._getParticleSystemNode(particleSystem));
					}
				});
			}

			// Handle sprites
			if (isSpriteManagerNode(node) && !noChildren) {
				node.spriteManager?.sprites.forEach((sprite) => {
					info.childNodes?.push(this._getSpriteNode(sprite));
				});
			}

			if (info.childNodes?.length) {
				info.hasCaret = true;
			} else {
				info.childNodes = undefined;
			}
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
					const enabled = !node.isEnabled();

					let selectedNodeData = this.getSelectedNodes().map((n) => n.nodeData);
					if (!selectedNodeData.includes(node)) {
						selectedNodeData = [node];
					}

					selectedNodeData.forEach((node) => {
						if (isNode(node)) {
							node.setEnabled(enabled);
						}
					});

					this.refresh();
					ev.stopPropagation();

					updateAllLights(this.props.editor.layout.preview.scene);
					updateIblShadowsRenderPipeline(this.props.editor.layout.preview.scene);
				}}
				className={`cursor-pointer ${node.isEnabled() ? "opacity-100" : "opacity-20"} transition-all duration-100 ease-in-out`}
			>
				{this._getIcon(node)}
			</div>
		);
	}

	private _getAdvancedTextureIconComponent(texture: AdvancedDynamicTexture): ReactNode {
		const layer = this.props.editor.layout.preview.scene.layers.find((l) => l.texture === texture);
		if (!layer) {
			return null;
		}

		return (
			<div
				onClick={(ev) => {
					layer.isEnabled = !layer.isEnabled;
					this.refresh();
					ev.stopPropagation();
				}}
				className={`cursor-pointer ${layer?.isEnabled ? "opacity-100" : "opacity-20"} transition-all duration-100 ease-in-out`}
			>
				{this._getIcon(texture)}
			</div>
		);
	}

	private _getIcon(object: any): ReactNode {
		if (isTransformNode(object)) {
			return <HiOutlineCubeTransparent className="w-4 h-4" />;
		}

		if (isNodeParticleSystemSetMesh(object)) {
			return <TbServerSpark className="w-4 h-4" />;
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

		if (isAdvancedDynamicTexture(object)) {
			return <SiAdobeindesign className="w-4 h-4" />;
		}

		if (isSound(object)) {
			return <HiSpeakerWave className="w-4 h-4" />;
		}

		if (isParticleSystem(object)) {
			return <IoSparklesSharp className="w-4 h-4" />;
		}

		if (isGPUParticleSystem(object)) {
			return <GiSparkles className="w-4 h-4" />;
		}

		if (isSprite(object)) {
			return <FaImage className="w-4 h-4" />;
		}

		if (isSpriteMapNode(object)) {
			return <GiBrickWall className="w-4 h-4" />;
		}

		if (isSpriteManagerNode(object)) {
			return <TbGhost2Filled className="w-4 h-4" />;
		}

		return <MdOutlineQuestionMark className="w-4 h-4" />;
	}

	private _getNodeLabelComponent(object: any, name?: string | null, noContextMenu?: boolean): JSX.Element {
		const label = <EditorGraphLabel object={object} editor={this.props.editor} name={name ?? "Unnamed Node"} />;

		if (noContextMenu) {
			return label;
		}

		return (
			<EditorGraphContextMenu editor={this.props.editor} object={object}>
				{label}
			</EditorGraphContextMenu>
		);
	}

	private _handleObjectModified(node: Node | BaseTexture | IParticleSystem | Sprite): void {
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
