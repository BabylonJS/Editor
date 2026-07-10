import { extname } from "path/posix";

import { Component, DragEvent, ReactNode } from "react";
import { Button, Tree, TreeNodeInfo } from "@blueprintjs/core";

import { FaCube, FaLink } from "react-icons/fa6";
import { IoMdCube } from "react-icons/io";
import { AiOutlinePlus } from "react-icons/ai";
import { HiSpeakerWave } from "react-icons/hi2";
import { SiBabylondotjs } from "react-icons/si";
import { MdOutlineQuestionMark } from "react-icons/md";
import { GiBrickWall, GiSparkles } from "react-icons/gi";
import { HiOutlineCubeTransparent } from "react-icons/hi";
import { IoCheckmark, IoPlayCircle, IoSparklesSharp } from "react-icons/io5";
import { TbGhost2Filled, TbServerSpark, TbBrandAdobeIndesign } from "react-icons/tb";
import { FaCamera, FaImage, FaLightbulb, FaBone, FaRegLightbulb } from "react-icons/fa";

import { AdvancedDynamicTexture } from "babylonjs-gui";
import { BaseTexture, Node, Observable, Scene, Tools, IParticleSystem, Sprite, Skeleton, TransformNode, AbstractMesh } from "babylonjs";

import { Editor } from "../main";

import { Badge } from "../../ui/shadcn/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/shadcn/ui/tabs";
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

import { cloneNode } from "../../tools/node/clone";
import { isSoundNode } from "../../tools/guards/sound";
import { registerUndoRedo } from "../../tools/undoredo";
import { isDomTextInputFocused } from "../../tools/dom";
import { isSceneLinkNode } from "../../tools/guards/scene";
import { updateAllLights } from "../../tools/light/shadows";
import { isClusteredLight } from "../../tools/light/cluster";
import { getCollisionMeshFor } from "../../tools/mesh/collision";
import { isNodeVisibleInGraph } from "../../tools/node/metadata";
import { isAdvancedDynamicTexture } from "../../tools/guards/texture";
import { updateIblShadowsRenderPipeline } from "../../tools/light/ibl";
import { UniqueNumber, waitNextAnimationFrame } from "../../tools/tools";
import { getSpriteManagerNodeFromSprite } from "../../tools/sprite/tools";
import { isParticleSystemVisibleInGraph } from "../../tools/particles/metadata";
import { applyTransformNodeParentingConfiguration } from "../../tools/node/parenting";
import { isSprite, isSpriteManagerNode, isSpriteMapNode } from "../../tools/guards/sprites";
import { parsePhysicsAggregate, serializePhysicsAggregate } from "../../tools/physics/serialization/aggregate";
import { isAnyParticleSystem, isGPUParticleSystem, isNodeParticleSystemSetMesh, isParticleSystem } from "../../tools/guards/particles";
import {
	isAbstractMesh,
	isAnyTransformNode,
	isCamera,
	isClusteredLightContainer,
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
	onPlaySceneChangedObservable,
	onSkeletonModifiedObservable,
	onSpriteModifiedObservable,
	onTextureModifiedObservable,
} from "../../tools/observables";
import { getObjectScene, isPlaySceneObject, isScenePlaying } from "../../tools/scene/play/runtime";

import { getNodeCommands } from "../dialogs/command-palette/node";
import { getMeshCommands } from "../dialogs/command-palette/mesh";
import { getLightCommands } from "../dialogs/command-palette/light";
import { getCameraCommands } from "../dialogs/command-palette/camera";
import { getSpriteCommands } from "../dialogs/command-palette/sprite";

import { addSoundNode } from "../../project/add/sound";
import { onProjectConfigurationChangedObservable } from "../../project/configuration";

import { applySoundAsset } from "./preview/import/sound";

import { EditorGraphLabel } from "./graph/label";
import { EditorGraphContextMenu } from "./graph/context-menu";
import { setNewParentForGraphSelectedNodes } from "./graph/move";

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
	 * The nodes of the play scene graph. Empty when the game / application is not playing.
	 */
	runtimeNodes: TreeNodeInfo[];

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

type GraphTreeKind = "scene" | "runtime";

export class EditorGraph extends Component<IEditorGraphProps, IEditorGraphState> {
	public _nodeToCopyTransform: Node | null = null;
	public _objectsToCopy: TreeNodeInfo<unknown>[] = [];

	private _playSceneObserverRemovers: (() => void)[] = [];
	private _playSceneRefreshTimeout: number | null = null;

	private _previousTreeNodes: Map<TreeNodeInfo["id"], TreeNodeInfo> = new Map();
	private _activeTab: GraphTreeKind = "runtime";

	public constructor(props: IEditorGraphProps) {
		super(props);

		this.state = {
			nodes: [],
			runtimeNodes: [],
			search: "",
			isFocused: false,

			showOnlyLights: false,
			showOnlyDecals: false,

			hideInstancedMeshes: false,
		};

		onNodesAddedObservable.add(() => this.refresh());
		onParticleSystemAddedObservable.add(() => this.refresh());

		onPlaySceneChangedObservable.add((scene) => this._handlePlaySceneChanged(scene));

		onNodeModifiedObservable.add((node) => this._handleObjectModified(node));
		onSpriteModifiedObservable.add((node) => this._handleObjectModified(node));
		onTextureModifiedObservable.add((texture) => this._handleObjectModified(texture));
		onSkeletonModifiedObservable.add((skeleton) => this._handleObjectModified(skeleton));
		onParticleSystemModifiedObservable.add((particleSystem) => this._handleObjectModified(particleSystem));

		document.addEventListener("copy", () => !isDomTextInputFocused() && !this.isRuntimeTabActive() && this.copySelectedNodes());
		document.addEventListener("paste", () => !isDomTextInputFocused() && !this.isRuntimeTabActive() && this.pasteSelectedNodes());
	}

	public render(): ReactNode {
		const playing = isScenePlaying(this.props.editor);
		if (!playing) {
			// Tabs are unmounted: reset so the next Play starts on the "Runtime" tab (onValueChange doesn't fire on mount).
			this._activeTab = "runtime";
		}

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

				{!playing && this._getSceneTreeComponent()}

				{playing && (
					<Tabs
						defaultValue="runtime"
						onValueChange={(value) => this._handleTabChanged(value as GraphTreeKind)}
						className="flex flex-col gap-2 w-full h-full px-2 overflow-hidden"
					>
						<TabsList className="w-full">
							<TabsTrigger value="scene" className="flex gap-2 items-center w-full">
								<FaCube className="w-4 h-4" /> Scene
							</TabsTrigger>

							<TabsTrigger value="runtime" className="flex gap-2 items-center w-full">
								<IoPlayCircle className="w-4 h-4" /> Runtime
							</TabsTrigger>
						</TabsList>

						<TabsContent value="scene" className="w-full h-full overflow-auto">
							{this._getSceneTreeComponent()}
						</TabsContent>

						<TabsContent value="runtime" className="w-full h-full overflow-auto">
							{this._getRuntimeTreeComponent()}
						</TabsContent>
					</Tabs>
				)}
			</div>
		);
	}

	private _getSceneTreeComponent(): ReactNode {
		return (
			<>
				<Tree
					contents={this.state.nodes}
					onNodeExpand={(n) => this._handleNodeExpanded(n, "scene")}
					onNodeCollapse={(n) => this._handleNodeCollapsed(n, "scene")}
					onNodeClick={(n, _, ev) => this._handleNodeClicked(n, ev, "scene")}
					onNodeContextMenu={(n, _, ev) => this._handleNodeContextMenu(n, ev, "scene")}
					onNodeDoubleClick={(n, _, ev) => this._handleNodeDoubleClicked(n, ev, "scene")}
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
									<ContextMenuItem onClick={() => addSoundNode(this.props.editor)}>Sound Node</ContextMenuItem>
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
			</>
		);
	}

	private _getRuntimeTreeComponent(): ReactNode {
		return (
			<div className="flex flex-col gap-2 w-full h-full">
				<Badge variant="secondary" className="flex items-center gap-2 w-full">
					<IoPlayCircle className="w-6 h-6" />
					Runtime scene — structure is read-only, changes are not saved.
				</Badge>

				<Tree
					contents={this.state.runtimeNodes}
					onNodeExpand={(n) => this._handleNodeExpanded(n, "runtime")}
					onNodeCollapse={(n) => this._handleNodeCollapsed(n, "runtime")}
					onNodeClick={(n, _, ev) => this._handleNodeClicked(n, ev, "runtime")}
					onNodeContextMenu={(n, _, ev) => this._handleNodeContextMenu(n, ev, "runtime")}
					onNodeDoubleClick={(n, _, ev) => this._handleNodeDoubleClicked(n, ev, "runtime")}
				/>
			</div>
		);
	}

	private _handleTabChanged(tab: GraphTreeKind): void {
		this._activeTab = tab;

		let selected: any = null;
		this._forEachNode(this._getTreeNodes(tab), (n) => (selected ??= n.isSelected ? n.nodeData : null));

		if (tab === "scene") {
			this.props.editor.layout.inspector.setEditedObject(selected ?? this.props.editor.layout.preview.scene);
			this.props.editor.layout.animations.setEditedObject(selected ?? null);

			if (selected && !isPlaySceneObject(this.props.editor, selected) && (isNode(selected) || isSprite(selected))) {
				this.props.editor.layout.preview.gizmo.setAttachedObject(selected);
			}
		} else {
			this.props.editor.layout.inspector.setEditedObject(selected ?? this.props.editor.layout.preview.play?.scene ?? null);
			this.props.editor.layout.animations.setEditedObject(selected ?? null);
		}
	}

	/**
	 * Returns wether or not the "Runtime" tab of the graph is active while the game / application is playing.
	 */
	public isRuntimeTabActive(): boolean {
		return isScenePlaying(this.props.editor) && this._activeTab === "runtime";
	}

	public componentDidMount(): void {
		onProjectConfigurationChangedObservable.add(() => {
			this.refresh();
		});
	}

	/**
	 * Called on the play scene changed (play started, stopped or restarted).
	 * Subscribes to the play scene events to keep the graph live while playing, and cleans
	 * all the references to the play scene before it gets disposed.
	 */
	private _handlePlaySceneChanged(scene: Scene | null): void {
		this._playSceneObserverRemovers.forEach((remove) => remove());
		this._playSceneObserverRemovers = [];

		if (this._playSceneRefreshTimeout !== null) {
			window.clearTimeout(this._playSceneRefreshTimeout);
			this._playSceneRefreshTimeout = null;
		}

		if (scene) {
			const track = <T,>(observable: Observable<T>): void => {
				const observer = observable.add(() => this._schedulePlaySceneRefresh());
				this._playSceneObserverRemovers.push(() => observable.remove(observer));
			};

			track(scene.onNewMeshAddedObservable);
			track(scene.onMeshRemovedObservable);
			track(scene.onNewTransformNodeAddedObservable);
			track(scene.onTransformNodeRemovedObservable);
			track(scene.onNewLightAddedObservable);
			track(scene.onLightRemovedObservable);
			track(scene.onNewCameraAddedObservable);
			track(scene.onCameraRemovedObservable);
		} else {
			this.setState({ runtimeNodes: [] });

			const previewScene = this.props.editor.layout.preview.scene;

			let selected: any = null;
			this._forEachNode(this.state.nodes, (n) => (selected ??= n.isSelected ? n.nodeData : null));

			// The play scene is already null here: compare against the edited scene to know
			// wether or not the inspector was showing a runtime object.
			const editedObject = this.props.editor.layout.inspector.state.editedObject;
			const editedObjectScene = getObjectScene(editedObject);

			if (editedObject && editedObjectScene && editedObjectScene !== previewScene) {
				this.props.editor.layout.inspector.setEditedObject(selected ?? previewScene);
			}

			// The animations panel tracks its own object: it may retain a disposed animatable even
			// when the inspector was re-pointed elsewhere during the play (ex. using "Edit Camera").
			const animatable = this.props.editor.layout.animations.state.animatable;
			const animatableScene = getObjectScene(animatable);

			if (animatable && animatableScene && animatableScene !== previewScene) {
				this.props.editor.layout.animations.setEditedObject(null);

				if (selected) {
					this.props.editor.layout.animations.setEditedObject(selected);
				}
			}
		}

		this.refresh();
	}

	/**
	 * Schedules a debounced refresh of the graph while the play scene is running.
	 * Scripts may add/remove lots of nodes per frame: a debounce avoids refreshing the graph for each one.
	 */
	private _schedulePlaySceneRefresh(): void {
		if (this._playSceneRefreshTimeout !== null) {
			return;
		}

		this._playSceneRefreshTimeout = window.setTimeout(() => {
			this._playSceneRefreshTimeout = null;

			if (this.props.editor.layout.preview.play?.canPlayScene) {
				this._refreshRuntimeNodes();
			}
		}, 300);
	}

	/**
	 * Refreshes the graph.
	 */
	public refresh(): Promise<void> {
		this._refreshSceneNodes();

		if (this.props.editor.layout.preview.play?.canPlayScene) {
			this._refreshRuntimeNodes();
		} else if (this.state.runtimeNodes.length) {
			this.setState({ runtimeNodes: [] });
		}

		return waitNextAnimationFrame();
	}

	private _refreshSceneNodes(): void {
		this._previousTreeNodes = this._getTreeNodesIndex(this.state.nodes);
		this.setState({ nodes: this._buildTreeNodes(this.props.editor.layout.preview.scene, true) });
	}

	private _refreshRuntimeNodes(): void {
		const scene = this.props.editor.layout.preview.play?.scene;
		if (!scene) {
			return;
		}

		this._previousTreeNodes = this._getTreeNodesIndex(this.state.runtimeNodes);
		this.setState({ runtimeNodes: this._buildTreeNodes(scene, false) });
	}

	/**
	 * Returns the given tree nodes indexed by id, used to preserve the selection and expansion
	 * states across refreshes in constant time (runtime scenes may contain tens of thousands of nodes).
	 */
	private _getTreeNodesIndex(nodes: TreeNodeInfo[]): Map<TreeNodeInfo["id"], TreeNodeInfo> {
		const index = new Map<TreeNodeInfo["id"], TreeNodeInfo>();
		this._forEachNode(nodes, (n) => index.set(n.id, n));

		return index;
	}

	private _buildTreeNodes(scene: Scene, isEditedScene: boolean): TreeNodeInfo[] {
		let nodes: (TreeNodeInfo | null)[] = [];

		if (this.state.showOnlyLights || this.state.showOnlyDecals) {
			if (this.state.showOnlyLights) {
				// The clustered light container belongs to the edited scene: don't mix its lights when playing.
				const lights = isEditedScene ? scene.lights.concat(this.props.editor.layout.preview.clusteredLightContainer.lights) : scene.lights.slice();
				nodes.push(...lights.map((light) => this._parseSceneNode(light, true)));
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

		return nodes.filter((n) => n !== null) as TreeNodeInfo[];
	}

	/**
	 * Sets the given node selected in the graph. All other selected nodes
	 * become unselected to have only the given node selected. All parents are expanded.
	 * Nodes belonging to the play scene are ignored: the selection only tracks the edited scene.
	 * @param node defines the reference tot the node to select in the graph.
	 */
	public setSelectedNode(node: Node | IParticleSystem | Sprite): void {
		if (isPlaySceneObject(this.props.editor, node)) {
			return;
		}

		const originalSource = (isAnyParticleSystem(node) ? (node.emitter as AbstractMesh) : node) as Node | null;

		let source = originalSource;
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

		if (isLight(originalSource) && this.props.editor.layout.preview.clusteredLightContainer.lights.includes(originalSource)) {
			source = this.props.editor.layout.preview.clusteredLightContainer;

			while (source) {
				idsToExpand.push(source.id);
				source = source.parent;
			}
		}

		this._forEachNode(this.state.nodes, (n) => {
			if (typeof n.id === "string" && idsToExpand.includes(n.id)) {
				n.isExpanded = true;
			}

			n.isSelected = n.nodeData === node;
		});

		this.setState({
			nodes: this.state.nodes,
		});
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
	public addToSelectedNodes(node: Node | IParticleSystem | Sprite): void {
		this._forEachNode(this.state.nodes, (n) => {
			if (n.nodeData === node) {
				n.isSelected = true;
			}
		});

		this.setState({
			nodes: this.state.nodes,
		});
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
			object: nodesToCopy[0],
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
							instance.isPickable = object.isPickable;
							instance.position.copyFrom(object.position);
							instance.rotation.copyFrom(object.rotation);
							instance.scaling.copyFrom(object.scaling);
							instance.rotationQuaternion = object.rotationQuaternion?.clone() ?? null;
							instance.parent = object.parent;

							if (object.physicsAggregate) {
								instance.physicsAggregate = parsePhysicsAggregate(instance, serializePhysicsAggregate(object.physicsAggregate));
								instance.physicsAggregate.body.disableSync = true;
							}

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

		const sourcePosition = (this._nodeToCopyTransform as any)["position"];
		const sourceRotation = (this._nodeToCopyTransform as any)["rotation"];
		const sourceScaling = (this._nodeToCopyTransform as any)["scaling"];
		const sourceRotationQuaternion = (this._nodeToCopyTransform as any)["rotationQuaternion"];
		const sourceDirection = (this._nodeToCopyTransform as any)["direction"];

		const targetPosition = (node as any)["position"];
		const targetRotation = (node as any)["rotation"];
		const targetScaling = (node as any)["scaling"];
		const targetRotationQuaternion = (node as any)["rotationQuaternion"];
		const targetDirection = (node as any)["direction"];

		const savedTargetPosition = targetPosition?.clone();
		const savedTargetRotation = targetRotation?.clone();
		const savedTargetScaling = targetScaling?.clone();
		const savedTargetRotationQuaternion = targetRotationQuaternion?.clone();
		const savedTargetDirection = targetDirection?.clone();

		registerUndoRedo({
			object: node,
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
						(node as any)["rotationQuaternion"] = null;
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
						(node as any)["rotationQuaternion"] = sourceRotationQuaternion.clone();
					}
				}

				if (sourceDirection && targetDirection) {
					targetDirection.copyFrom(sourceDirection);
				}
			},
		});

		this.props.editor.layout.inspector.forceUpdate();
	}

	private _handleSearch(search: string): void {
		this.setState({ search }, () => {
			this.refresh();
		});
	}

	private _getTreeNodes(tree: GraphTreeKind): TreeNodeInfo[] {
		return tree === "scene" ? this.state.nodes : this.state.runtimeNodes;
	}

	private _commitTreeNodes(tree: GraphTreeKind): void {
		if (tree === "scene") {
			this.setState({ nodes: this.state.nodes });
		} else {
			this.setState({ runtimeNodes: this.state.runtimeNodes });
		}
	}

	private _handleNodeClicked(node: TreeNodeInfo, ev: React.MouseEvent<HTMLElement>, tree: GraphTreeKind): void {
		this.props.editor.layout.inspector.setEditedObject(node.nodeData);
		this.props.editor.layout.animations.setEditedObject(node.nodeData);

		// Gizmos and camera preview belong to the edited scene: don't attach them to play scene objects.
		if (!isPlaySceneObject(this.props.editor, node.nodeData)) {
			if (isNode(node.nodeData) || isSprite(node.nodeData)) {
				this.props.editor.layout.preview.gizmo.setAttachedObject(node.nodeData);
			}

			if (isCamera(node.nodeData)) {
				this.props.editor.layout.preview.setCameraPreviewActive(node.nodeData);
			}
		}

		const nodes = this._getTreeNodes(tree);

		if (ev.ctrlKey || ev.metaKey) {
			this._forEachNode(nodes, (n) => n.id === node.id && (n.isSelected = !n.isSelected));
		} else if (ev.shiftKey) {
			this._handleShiftSelect(node, tree);
		} else {
			this._forEachNode(nodes, (n) => (n.isSelected = n.id === node.id));
		}

		this._commitTreeNodes(tree);
	}

	private _handleShiftSelect(node: TreeNodeInfo, tree: GraphTreeKind): void {
		let lastSelected!: TreeNodeInfo;
		let firstSelected!: TreeNodeInfo;

		const nodes = this._getTreeNodes(tree);

		this._forEachNode(nodes, (n) => {
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
		this._forEachNode(nodes, (n) => {
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

	private _handleNodeContextMenu(node: TreeNodeInfo, ev: React.MouseEvent<HTMLElement>, tree: GraphTreeKind): void {
		if (!node.isSelected) {
			this._handleNodeClicked(node, ev, tree);
		}
	}

	private _handleNodeExpanded(node: TreeNodeInfo, tree: GraphTreeKind): void {
		this._forEachNode(this._getTreeNodes(tree), (n) => n.id === node.id && (n.isExpanded = true));
		this._commitTreeNodes(tree);
	}

	private _handleNodeCollapsed(node: TreeNodeInfo, tree: GraphTreeKind): void {
		this._forEachNode(this._getTreeNodes(tree), (n) => n.id === node.id && (n.isExpanded = false));
		this._commitTreeNodes(tree);
	}

	private _handleNodeDoubleClicked(node: TreeNodeInfo, ev: React.MouseEvent<HTMLElement>, tree: GraphTreeKind): void {
		this._forEachNode(this._getTreeNodes(tree), (n) => n.id === node.id && (n.isExpanded = !n.isExpanded));

		this._handleNodeClicked(node, ev, tree);
		this._commitTreeNodes(tree);
	}

	public _forEachNode(nodes: TreeNodeInfo[] | undefined, callback: (node: TreeNodeInfo, index: number) => void): void {
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

		const previousSkeletonNode = this._previousTreeNodes.get(rootSkeletonNode.id);
		if (previousSkeletonNode) {
			rootSkeletonNode.isSelected = previousSkeletonNode.isSelected;
			rootSkeletonNode.isExpanded = previousSkeletonNode.isExpanded;
		}

		return rootSkeletonNode;
	}

	private _getSkeletonNode(skeleton: Skeleton): TreeNodeInfo {
		const info = {
			nodeData: skeleton,
			id: skeleton.id,
			icon: <FaBone className="w-4 h-4" />,
			label: this._getNodeLabelComponent(skeleton, skeleton.name, false),
		} as TreeNodeInfo;

		const previousNode = this._previousTreeNodes.get(info.id);
		if (previousNode) {
			info.isSelected = previousNode.isSelected;
		}

		return info;
	}

	private _getParticleSystemNode(particleSystem: IParticleSystem): TreeNodeInfo {
		const info = {
			nodeData: particleSystem,
			id: particleSystem.id,
			icon: this._getIcon(particleSystem),
			label: this._getNodeLabelComponent(particleSystem, particleSystem.name, false),
		} as TreeNodeInfo;

		const previousNode = this._previousTreeNodes.get(info.id);
		if (previousNode) {
			info.isSelected = previousNode.isSelected;
			info.isExpanded = previousNode.isExpanded;
		}

		return info;
	}

	private _getSpriteNode(sprite: Sprite): TreeNodeInfo {
		const info = {
			nodeData: sprite,
			id: sprite.uniqueId,
			icon: this._getIcon(sprite),
			label: this._getNodeLabelComponent(sprite, sprite.name, false),
		} as TreeNodeInfo;

		const previousNode = this._previousTreeNodes.get(info.id);
		if (previousNode) {
			info.isSelected = previousNode.isSelected;
			info.isExpanded = previousNode.isExpanded;
		}

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

			const previousNode = this._previousTreeNodes.get(info.id);
			if (previousNode) {
				info.isSelected = previousNode.isSelected;
				info.isExpanded = previousNode.isExpanded;
			}

			childNodes.push(info);
		});

		if (!childNodes.length) {
			return null;
		}

		const rootGuiNode = {
			childNodes,
			nodeData: scene,
			id: "__editor__gui__",
			icon: <TbBrandAdobeIndesign className="w-4 h-4" />,
			label: this._getNodeLabelComponent(scene, "Gui", false),
		} as TreeNodeInfo;

		const previousGuiNode = this._previousTreeNodes.get(rootGuiNode.id);
		if (previousGuiNode) {
			rootGuiNode.isSelected = previousGuiNode.isSelected;
			rootGuiNode.isExpanded = previousGuiNode.isExpanded;
		}

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

		if (isLight(node) && !node._scene.lights.includes(node) && !isClusteredLight(node, this.props.editor)) {
			return null;
		}

		if (isCamera(node) && !node._scene.cameras.includes(node)) {
			return null;
		}

		if (isClusteredLightContainer(node) && (this.state.showOnlyLights || this.state.showOnlyDecals)) {
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

			// Handle particle systems
			if (isAbstractMesh(node) && !noChildren) {
				const particleSystems = node.getScene().particleSystems.filter((ps) => ps.emitter === node);
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

			// Handle clustered lights
			if (isClusteredLightContainer(node) && !noChildren) {
				node.lights.forEach((light) => {
					const clusteredLightNode = this._parseSceneNode(light, false);
					if (clusteredLightNode) {
						info.childNodes?.push(clusteredLightNode);
					}
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

		const previousNode = this._previousTreeNodes.get(info.id);
		if (previousNode) {
			info.isSelected = previousNode.isSelected;
			info.isExpanded = previousNode.isExpanded;
		}

		return info;
	}

	private _getNodeIconComponent(node: Node): ReactNode {
		return (
			<div
				onClick={(ev) => {
					if (isPlaySceneObject(this.props.editor, node)) {
						return;
					}

					const enabled = !node.isEnabled();

					let selectedNodeData = this.getSelectedNodes().map((n) => n.nodeData);
					if (!selectedNodeData.includes(node)) {
						selectedNodeData = [node];
					}

					selectedNodeData.forEach((node) => {
						if (isNode(node) || isClusteredLightContainer(node)) {
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
		if (isPlaySceneObject(this.props.editor, texture)) {
			return this._getIcon(texture);
		}

		const layer = getObjectScene(texture)?.layers.find((l) => l.texture === texture);
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

		if (isClusteredLightContainer(object)) {
			return <FaRegLightbulb className="w-4 h-4" />;
		}

		if (isCamera(object)) {
			return <FaCamera className="w-4 h-4" />;
		}

		if (isSceneLinkNode(object)) {
			return <FaLink className="w-4 h-4" />;
		}

		if (isAdvancedDynamicTexture(object)) {
			return <TbBrandAdobeIndesign className="w-4 h-4" />;
		}

		if (isSoundNode(object)) {
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

	private _handleObjectModified(node: Node | BaseTexture | IParticleSystem | Sprite | Skeleton): void {
		[this.state.nodes, this.state.runtimeNodes].forEach((nodes) => {
			this._forEachNode(nodes, (n) => {
				if (n.nodeData === node) {
					n.label = this._getNodeLabelComponent(node, node.name);
				}
			});
		});

		this.setState({ nodes: this.state.nodes, runtimeNodes: this.state.runtimeNodes });
	}

	private _handleDropEmpty(ev: DragEvent<HTMLDivElement>): void {
		const node = ev.dataTransfer.getData("graph/node");
		if (node) {
			setNewParentForGraphSelectedNodes(this.props.editor, this.props.editor.layout.preview.scene, ev.shiftKey);
		}

		const asset = ev.dataTransfer.getData("assets");
		if (asset) {
			const absolutePaths = this.props.editor.layout.assets.state.selectedKeys;

			absolutePaths.forEach((absolutePath) => {
				const extension = extname(absolutePath).toLowerCase();

				switch (extension) {
					case ".mp3":
					case ".ogg":
					case ".wav":
					case ".wave":
						applySoundAsset(this.props.editor, this.props.editor.layout.preview.scene, absolutePath).then(() => {
							this.props.editor.layout.graph.refresh();
						});
						break;
				}
			});
		}
	}
}
