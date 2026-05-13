import { Component, ReactNode } from "react";
import { Tree, TreeNodeInfo } from "@blueprintjs/core";
import { readJSON, writeJSON } from "fs-extra";
import { basename } from "path";
import { toast } from "sonner";
import { AiOutlineClose, AiOutlinePlus } from "react-icons/ai";
import { HiOutlineFolder } from "react-icons/hi2";
import { IoSparklesSharp } from "react-icons/io5";

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "../../../ui/shadcn/ui/context-menu";
import { saveSingleFileDialog } from "../../../tools/dialog";
import { IEffectEditor } from ".";
import { ParticleSystem, QuarksUtil } from "babylon.quarks";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IQuarksEffectFile, IQuarksNode, QuarksEffectDocument, getQuarksTransformUuid } from "./quarks-bridge";
import { applyQuarksLoadedInspectorHints } from "./quarks-inspector-hints";
import { flushQuarksParticleBatchGeometry } from "./quarks-mesh-geometry";

export type PlaybackState = "playing" | "paused" | "stopped" | "unavailable";
type StoredPlaybackState = Exclude<PlaybackState, "unavailable">;

export interface IPlaybackControlState {
	state: PlaybackState;
	canPlayPause: boolean;
	canStop: boolean;
	canRestart: boolean;
	reason?: string;
}

export interface IEffectEditorGraphProps {
	filePath: string | null;
	onNodeSelected?: (nodeId: string | number | null) => void;
	editor: IEffectEditor;
}

export interface IEffectEditorGraphState {
	nodes: TreeNodeInfo<IQuarksNode>[];
	selectedNodeId: string | number | null;
}

export class EffectEditorGraph extends Component<IEffectEditorGraphProps, IEffectEditorGraphState> {
	private _effects: Map<string, QuarksEffectDocument> = new Map();
	private _nodeIndex: Map<string, IQuarksNode> = new Map();
	private _playbackByUuid: Map<string, StoredPlaybackState> = new Map();
	/** User expand/collapse only; `_rebuildTree` must not reset expansion. */
	private _userTreeExpandOverride: Map<string, boolean> = new Map();

	public constructor(props: IEffectEditorGraphProps) {
		super(props);
		this.state = {
			nodes: [],
			selectedNodeId: null,
		};
	}

	/** Returns the first effect document for fallback flows. */
	public getEffect(): QuarksEffectDocument | null {
		return this._effects.values().next().value ?? null;
	}

	/** Returns all effect documents currently loaded in graph. */
	public getAllEffects(): QuarksEffectDocument[] {
		return Array.from(this._effects.values());
	}

	/** Returns node data currently shown in tree by generated node id. */
	public getNodeData(nodeId: string | number): IQuarksNode | null {
		return this._nodeIndex.get(String(nodeId)) ?? null;
	}

	/** Returns transform node backing selected tree node. */
	public getNodeTransform(nodeId: string | number): TransformNode | null {
		const node = this.getNodeData(nodeId);
		if (!node) {
			return null;
		}

		if (node.type === "particle") {
			return (node.data as ParticleSystem).emitter as TransformNode;
		}

		return node.data as TransformNode;
	}

	/** Returns particle system backing selected tree node if it is a particle node. */
	public getNodeSystem(nodeId: string | number): ParticleSystem | null {
		const node = this.getNodeData(nodeId);
		if (!node || node.type !== "particle") {
			return null;
		}

		return node.data as ParticleSystem;
	}

	/** Loads quarks-native effect file into graph. */
	public async loadFromFile(filePath: string): Promise<void> {
		if (!this.props.editor.preview?.scene) {
			return;
		}

		try {
			const json = await readJSON(filePath);
			this._disposeAllEffects();
			this._playbackByUuid.clear();

			const effects = this._normalizeImportedEffects(json);
			if (effects.length === 0) {
				this._createDefaultEffectDocument(basename(filePath, ".fx") || "Effect");
				this._rebuildTree();
				this._notifyUiStateChanged();
				return;
			}

			for (const effect of effects) {
				const document = QuarksEffectDocument.fromQuarksJson(this.props.editor.preview.scene, effect.data, effect.name);
				document.stop();
				this._effects.set(document.id, document);
				this._registerEffectNaturalIdle(document);
				this._setNodePlaybackState(document.toNodeTree(), "stopped");
				this._flushParticleBatchGeometryForDocument(document);
				applyQuarksLoadedInspectorHints(document.root);
			}

			this._rebuildTree();
			this._notifyUiStateChanged();
		} catch (error) {
			toast.error(`Failed to load effect file: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/** Loads plain quarks JSON into graph as a new document. */
	public async loadFromQuarksFile(filePath: string): Promise<void> {
		if (!this.props.editor.preview?.scene) {
			return;
		}

		try {
			const json = await readJSON(filePath);
			const document = QuarksEffectDocument.fromQuarksJson(this.props.editor.preview.scene, json, basename(filePath, ".json") || "Effect");
			document.stop();
			this._effects.set(document.id, document);
			this._registerEffectNaturalIdle(document);
			this._setNodePlaybackState(document.toNodeTree(), "stopped");
			this._flushParticleBatchGeometryForDocument(document);
			applyQuarksLoadedInspectorHints(document.root);
			this._rebuildTree();
			this._notifyUiStateChanged();
		} catch (error) {
			toast.error(`Failed to import quarks file: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/** Unity import path is removed in Quarks-native pipeline. */
	public async loadFromUnityData(): Promise<void> {
		toast.error("Unity import is removed in Quarks-native effect editor.");
	}

	/** Serializes documents into the new quarks-native editor file format. */
	public serializeToFileFormat(): IQuarksEffectFile {
		return {
			version: "quarks-editor-1",
			effects: this.getAllEffects().map((effect) => effect.serialize()),
		};
	}

	/** Toggles selected node between playing and paused state. */
	public toggleNodePlayback(nodeId: string | number): boolean {
		const control = this.getNodePlaybackControlState(nodeId);
		if (!control.canPlayPause) {
			return false;
		}
		const state = control.state;
		if (state === "playing") {
			this.pauseNode(nodeId);
			return false;
		}

		this.playNode(nodeId);
		return true;
	}

	/** Plays selected node or entire effect root. */
	public playNode(nodeId: string | number): void {
		const node = this.getNodeData(nodeId);
		if (!node) {
			return;
		}
		if (!this._nodeHasParticleSystems(node)) {
			return;
		}

		const effect = this._findEffectForNode(node);
		if (!effect) {
			return;
		}

		const transform = this.getNodeTransform(nodeId);
		if (!transform) {
			return;
		}

		effect.resetNaturalIdleTracking(transform);
		effect.playNode(transform);
		this._setNodePlaybackState(node, "playing");
		this._rebuildTree();
		this._notifyUiStateChanged();
	}

	/** Pauses selected node or entire effect root. */
	public pauseNode(nodeId: string | number): void {
		const node = this.getNodeData(nodeId);
		if (!node) {
			return;
		}
		if (!this._nodeHasParticleSystems(node)) {
			return;
		}

		const effect = this._findEffectForNode(node);
		if (!effect) {
			return;
		}

		const transform = this.getNodeTransform(nodeId);
		if (!transform) {
			return;
		}

		effect.pauseNode(transform);
		this._setNodePlaybackState(node, "paused");
		this._rebuildTree();
		this._notifyUiStateChanged();
	}

	/** Stops selected node or entire effect root. */
	public stopNode(nodeId: string | number): void {
		const node = this.getNodeData(nodeId);
		if (!node) {
			return;
		}
		if (!this._nodeHasParticleSystems(node)) {
			return;
		}

		const effect = this._findEffectForNode(node);
		if (!effect) {
			return;
		}

		const transform = this.getNodeTransform(nodeId);
		if (!transform) {
			return;
		}

		effect.resetNaturalIdleTracking(transform);
		effect.stopNode(transform);
		this._setNodePlaybackState(node, "stopped");
		this._rebuildTree();
		this._notifyUiStateChanged();
	}

	/** Restarts selected node or entire effect root. */
	public restartNode(nodeId: string | number): void {
		const node = this.getNodeData(nodeId);
		if (!node) {
			return;
		}
		if (!this._nodeHasParticleSystems(node)) {
			return;
		}

		const effect = this._findEffectForNode(node);
		const transform = this.getNodeTransform(nodeId);
		if (!effect || !transform) {
			return;
		}

		effect.resetNaturalIdleTracking(transform);
		effect.restartNode(transform);
		this._setNodePlaybackState(node, "playing");
		this._rebuildTree();
		this._notifyUiStateChanged();
	}

	/** Returns selected node playback state. */
	public getNodePlaybackState(nodeId: string | number): PlaybackState {
		const node = this.getNodeData(nodeId);
		if (!node) {
			return "unavailable";
		}
		if (!this._nodeHasParticleSystems(node)) {
			return "unavailable";
		}
		return this._resolveAggregatePlaybackState(node);
	}

	/** Returns preview-control availability and disabled reason for selected node. */
	public getNodePlaybackControlState(nodeId: string | number | null | undefined): IPlaybackControlState {
		if (nodeId === null || nodeId === undefined) {
			return {
				state: "unavailable",
				canPlayPause: false,
				canStop: false,
				canRestart: false,
				reason: "Select a node to control playback.",
			};
		}
		const node = this.getNodeData(nodeId);
		if (!node) {
			return {
				state: "unavailable",
				canPlayPause: false,
				canStop: false,
				canRestart: false,
				reason: "Selected node is no longer available.",
			};
		}
		if (!this._nodeHasParticleSystems(node)) {
			return {
				state: "unavailable",
				canPlayPause: false,
				canStop: false,
				canRestart: false,
				reason: "No particle systems in selected node.",
			};
		}
		const state = this._resolveAggregatePlaybackState(node);
		return {
			state,
			canPlayPause: true,
			canStop: state === "playing" || state === "paused",
			canRestart: true,
		};
	}

	/** Backward-compatible boolean playback selector. */
	public isNodePlaying(nodeId: string | number): boolean {
		return this.getNodePlaybackState(nodeId) === "playing";
	}

	/** Refreshes labels when node names are changed. */
	public updateNodeNames(): void {
		this._rebuildTree();
	}

	public componentWillUnmount(): void {
		this._disposeAllEffects();
	}

	public render(): ReactNode {
		const hasNodes = this.state.nodes.length > 0;

		return (
			<div className="flex h-full min-h-0 w-full flex-col text-foreground">
				{hasNodes ? (
					<div className="min-h-0 flex-1 overflow-auto pb-6">
						<Tree
							contents={this.state.nodes}
							onNodeExpand={(n) => this._handleNodeExpanded(n)}
							onNodeCollapse={(n) => this._handleNodeCollapsed(n)}
							onNodeClick={(n) => this._handleNodeClicked(n)}
						/>
					</div>
				) : (
					<div className="flex min-h-0 flex-1 flex-col" style={{ minHeight: "80px" }}>
						<ContextMenu>
							<ContextMenuTrigger className="flex h-full min-h-0 w-full flex-1">
								<div className="flex h-full w-full flex-1 items-center justify-center">
									<div className="p-4 text-muted-foreground">No particles. Right-click to add.</div>
								</div>
							</ContextMenuTrigger>
							<ContextMenuContent>
								<ContextMenuSub>
									<ContextMenuSubTrigger className="flex items-center gap-2">
										<AiOutlinePlus className="w-5 h-5" /> Add
									</ContextMenuSubTrigger>
									<ContextMenuSubContent>
										<ContextMenuItem onClick={() => this._handleCreateEffect()}>
											<IoSparklesSharp className="w-4 h-4" /> Effect
										</ContextMenuItem>
									</ContextMenuSubContent>
								</ContextMenuSub>
							</ContextMenuContent>
						</ContextMenu>
					</div>
				)}
			</div>
		);
	}

	/** Ensures batch meshes exist for paused systems after load so Renderer inspector can bind materials. */
	private _flushParticleBatchGeometryForDocument(document: QuarksEffectDocument): void {
		QuarksUtil.runOnAllParticleEmitters(document.root, (emitter) => {
			flushQuarksParticleBatchGeometry(emitter.system as ParticleSystem);
		});
	}

	/** Rebuilds tree from live quarks document roots. */
	private _rebuildTree(): void {
		const nodes: TreeNodeInfo<IQuarksNode>[] = [];
		this._nodeIndex.clear();

		for (const effect of this._effects.values()) {
			const root = effect.toNodeTree();
			nodes.push(this._convertNode(root, true));
		}

		const prevSelected = this.state.selectedNodeId;
		const selectionStillValid = prevSelected !== null && prevSelected !== undefined && this._nodeIndex.has(String(prevSelected));
		const nextSelectedId = selectionStillValid ? prevSelected : null;

		const nodesWithSelection = nextSelectedId !== null && nextSelectedId !== undefined ? this._setNodeSelected(nodes, nextSelectedId) : nodes;

		this.setState({ nodes: nodesWithSelection, selectedNodeId: nextSelectedId }, () => {
			if (!selectionStillValid && prevSelected !== null && prevSelected !== undefined) {
				this.props.onNodeSelected?.(null);
			}
		});
	}

	/** Expanded state: user overrides win; otherwise match previous default (root + groups open). */
	private _getTreeNodeIsExpanded(nodeId: string | number, isEffectRoot: boolean, nodeType: IQuarksNode["type"]): boolean {
		const key = String(nodeId);
		if (this._userTreeExpandOverride.has(key)) {
			return this._userTreeExpandOverride.get(key)!;
		}
		return isEffectRoot || nodeType === "group";
	}

	/** Converts internal node model into Blueprint tree data. */
	private _convertNode(node: IQuarksNode, isEffectRoot: boolean): TreeNodeInfo<IQuarksNode> {
		this._nodeIndex.set(node.id, node);
		const isParticle = node.type === "particle";
		const icon = isParticle ? (
			<IoSparklesSharp className={`w-4 h-4 ${isEffectRoot ? "text-purple-400" : "text-yellow-400"}`} />
		) : (
			<HiOutlineFolder className="w-4 h-4 text-blue-400" />
		);

		return {
			id: node.id,
			label: this._getNodeLabelComponent(node),
			icon,
			isExpanded: this._getTreeNodeIsExpanded(node.id, isEffectRoot, node.type),
			hasCaret: node.children.length > 0 || node.type === "group",
			nodeData: node,
			childNodes: node.children.map((child) => this._convertNode(child, false)),
		};
	}

	/** Detects current effect document by any node in its hierarchy. */
	private _findEffectForNode(node: IQuarksNode): QuarksEffectDocument | null {
		for (const effect of this._effects.values()) {
			const tree = effect.toNodeTree();
			if (this._containsNode(tree, node.uuid)) {
				return effect;
			}
		}
		return null;
	}

	/** Finds whether tree contains node uuid. */
	private _containsNode(node: IQuarksNode, uuid: string): boolean {
		if (node.uuid === uuid) {
			return true;
		}
		return node.children.some((child) => this._containsNode(child, uuid));
	}

	/** Creates an empty effect document in active preview scene. */
	private _handleCreateEffect(): void {
		if (!this.props.editor.preview?.scene) {
			return;
		}

		this._createDefaultEffectDocument(`Effect ${this._effects.size + 1}`);
		this._rebuildTree();
		this._notifyUiStateChanged();
	}

	/** Adds a particle system under selected group node. */
	private _handleAddParticleSystemToNode(node: IQuarksNode): void {
		const effect = this._findEffectForNode(node);
		const parent = this.getNodeTransform(node.id);
		if (!effect || !parent) {
			return;
		}

		effect.createParticle(parent);
		this._setNodePlaybackState(node, "stopped");
		this._rebuildTree();
		this._notifyUiStateChanged();
	}

	/** Adds a transform group under selected group node. */
	private _handleAddGroupToNode(node: IQuarksNode): void {
		const effect = this._findEffectForNode(node);
		const parent = this.getNodeTransform(node.id);
		if (!effect || !parent) {
			return;
		}

		effect.createGroup(parent);
		this._setNodePlaybackState(node, "stopped");
		this._rebuildTree();
		this._notifyUiStateChanged();
	}

	/** Deletes selected node or whole effect when deleting root. */
	private _handleDeleteNode(node: IQuarksNode): void {
		const effect = this._findEffectForNode(node);
		if (!effect) {
			return;
		}

		if (node.uuid === effect.id) {
			effect.dispose();
			this._effects.delete(effect.id);
			this._clearNodePlaybackState(node);
			this._rebuildTree();
			this._notifyUiStateChanged();
			return;
		}

		const transform = this.getNodeTransform(node.id);
		if (!transform || !transform.parent || !(transform.parent instanceof TransformNode)) {
			return;
		}

		effect.removeNode(transform);
		this._clearNodePlaybackState(node);
		this._rebuildTree();
		this._notifyUiStateChanged();
	}

	/** Exports a single effect as quarks JSON payload. */
	private async _handleExportEffect(node: IQuarksNode): Promise<void> {
		const effect = this._findEffectForNode(node);
		if (!effect) {
			return;
		}

		const filePath = saveSingleFileDialog({
			title: "Export Effect",
			filters: [{ name: "Quarks Files", extensions: ["json"] }],
			defaultPath: `${effect.name}.json`,
		});

		if (!filePath) {
			return;
		}

		await writeJSON(filePath, effect.serialize().data, { spaces: "\t", encoding: "utf-8" });
		toast.success("Effect exported");
	}

	/** Node context menu label with CRUD operations. */
	private _getNodeLabelComponent(node: IQuarksNode): JSX.Element {
		const playbackState = this.getNodePlaybackState(node.id);
		const stateLabel = playbackState === "playing" ? "Playing" : playbackState === "paused" ? "Paused" : playbackState === "stopped" ? "Stopped" : "Unavailable";
		const stateClassName =
			playbackState === "playing" ? "bg-emerald-400" : playbackState === "paused" ? "bg-amber-400" : playbackState === "stopped" ? "bg-slate-400" : "bg-red-400";

		return (
			<ContextMenu>
				<ContextMenuTrigger className="w-full h-full">
					<div className="ml-2 p-1 w-full flex items-center gap-2">
						<span className={`inline-block w-2 h-2 rounded-full ${stateClassName}`} title={stateLabel} />
						<span>{node.name}</span>
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent>
					{node.type === "group" && (
						<>
							<ContextMenuSub>
								<ContextMenuSubTrigger className="flex items-center gap-2">
									<AiOutlinePlus className="w-5 h-5" /> Add
								</ContextMenuSubTrigger>
								<ContextMenuSubContent>
									<ContextMenuItem onClick={() => this._handleAddParticleSystemToNode(node)}>
										<IoSparklesSharp className="w-4 h-4" /> Particle
									</ContextMenuItem>
									<ContextMenuItem onClick={() => this._handleAddGroupToNode(node)}>
										<HiOutlineFolder className="w-4 h-4" /> Group
									</ContextMenuItem>
								</ContextMenuSubContent>
							</ContextMenuSub>
							<ContextMenuSeparator />
						</>
					)}
					{this._effects.has(node.uuid) && (
						<>
							<ContextMenuItem onClick={() => this._handleExportEffect(node)}>Export</ContextMenuItem>
							<ContextMenuSeparator />
						</>
					)}
					<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => this._handleDeleteNode(node)}>
						<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Delete
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		);
	}

	/** Expands tree node preserving existing tree state. */
	private _handleNodeExpanded(node: TreeNodeInfo<IQuarksNode>): void {
		this._userTreeExpandOverride.set(String(node.id), true);
		this.setState({ nodes: this._setNodeExpanded(this.state.nodes, node.id, true) });
	}

	/** Collapses tree node preserving existing tree state. */
	private _handleNodeCollapsed(node: TreeNodeInfo<IQuarksNode>): void {
		this._userTreeExpandOverride.set(String(node.id), false);
		this.setState({ nodes: this._setNodeExpanded(this.state.nodes, node.id, false) });
	}

	/** Selects tree node and notifies external tabs. */
	private _handleNodeClicked(node: TreeNodeInfo<IQuarksNode>): void {
		const selectedNodeId = node.id as string;
		this.setState({ nodes: this._setNodeSelected(this.state.nodes, selectedNodeId), selectedNodeId });
		this.props.onNodeSelected?.(selectedNodeId);
	}

	/** Updates expand/collapse state recursively for tree node id. */
	private _setNodeExpanded(nodes: TreeNodeInfo<IQuarksNode>[], id: string | number, value: boolean): TreeNodeInfo<IQuarksNode>[] {
		return nodes.map((node) => ({
			...node,
			isExpanded: node.id === id ? value : node.isExpanded,
			childNodes: node.childNodes ? this._setNodeExpanded(node.childNodes, id, value) : undefined,
		}));
	}

	/** Updates selected tree node recursively for tree node id. */
	private _setNodeSelected(nodes: TreeNodeInfo<IQuarksNode>[], id: string | number): TreeNodeInfo<IQuarksNode>[] {
		return nodes.map((node) => ({
			...node,
			isSelected: node.id === id,
			childNodes: node.childNodes ? this._setNodeSelected(node.childNodes, id) : undefined,
		}));
	}

	/** Disposes every loaded effect when switching files/unmounting. */
	private _disposeAllEffects(): void {
		for (const effect of this._effects.values()) {
			effect.dispose();
		}
		this._effects.clear();
		this._playbackByUuid.clear();
		this._userTreeExpandOverride.clear();
		this._notifyUiStateChanged();
	}

	/** Notifies external panels that graph/runtime state changed outside their React state. */
	private _notifyUiStateChanged(): void {
		this.props.editor.preview?.forceUpdate();
		this.props.editor.layout?.forceUpdate();
	}

	/** Applies playback state recursively to node and descendants. */
	private _setNodePlaybackState(node: IQuarksNode, state: StoredPlaybackState): void {
		this._playbackByUuid.set(node.uuid, state);
		for (const child of node.children) {
			this._setNodePlaybackState(child, state);
		}
	}

	/** Clears playback state recursively for removed node subtree. */
	private _clearNodePlaybackState(node: IQuarksNode): void {
		this._playbackByUuid.delete(node.uuid);
		for (const child of node.children) {
			this._clearNodePlaybackState(child);
		}
	}

	/** Finds whether node subtree has at least one particle system. */
	private _nodeHasParticleSystems(node: IQuarksNode): boolean {
		if (node.type === "particle") {
			return true;
		}
		return node.children.some((child) => this._nodeHasParticleSystems(child));
	}

	/** Collects stored playback states for all particle descendants. */
	private _collectParticlePlaybackStates(node: IQuarksNode, out: StoredPlaybackState[]): void {
		if (node.type === "particle") {
			out.push(this._playbackByUuid.get(node.uuid) ?? "stopped");
			return;
		}
		for (const child of node.children) {
			this._collectParticlePlaybackStates(child, out);
		}
	}

	/** Resolves aggregate playback state for group/effect selections. */
	private _resolveAggregatePlaybackState(node: IQuarksNode): StoredPlaybackState {
		const states: StoredPlaybackState[] = [];
		this._collectParticlePlaybackStates(node, states);
		if (states.some((s) => s === "playing")) {
			return "playing";
		}
		if (states.some((s) => s === "paused")) {
			return "paused";
		}
		return "stopped";
	}

	/** Normalizes import payloads into list of quarks object roots. */
	private _normalizeImportedEffects(json: any): Array<{ name: string; data: any }> {
		if (json?.version === "quarks-editor-1" && Array.isArray(json.effects)) {
			return json.effects.map((entry: any, index: number) => ({
				name: entry?.name || `Effect ${index + 1}`,
				data: entry?.data,
			}));
		}

		if (json?.object) {
			return [
				{
					name: json?.object?.name || "Effect",
					data: json,
				},
			];
		}

		throw new Error("Unsupported effect file format");
	}

	/** Subscribes to Quarks emitEnd + last particle death so non-looping playback clears "playing" in the tree. */
	private _registerEffectNaturalIdle(document: QuarksEffectDocument): void {
		document.setNaturalIdleHandler((emitter) => {
			const uuid = getQuarksTransformUuid(emitter);
			this._playbackByUuid.set(uuid, "stopped");
			this._rebuildTree();
			this._notifyUiStateChanged();
		});
	}

	/** Creates a valid default Quarks document with one editable particle system. */
	private _createDefaultEffectDocument(name: string): QuarksEffectDocument {
		if (!this.props.editor.preview?.scene) {
			throw new Error("Preview scene is not ready");
		}

		const document = QuarksEffectDocument.createEmpty(this.props.editor.preview.scene, name);
		this._effects.set(document.id, document);
		this._registerEffectNaturalIdle(document);
		document.createParticle(document.root);
		document.stop();
		this._setNodePlaybackState(document.toNodeTree(), "stopped");
		return document;
	}
}
