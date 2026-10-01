import { pathExists } from "fs-extra";
import { join } from "path/posix";

import { Component, ReactNode, createRef } from "react";

import { LuInfo } from "react-icons/lu";

import type { AbstractMesh, Mesh, Observer, Scene } from "babylonjs";
import type { TerrainMaterialPlugin } from "babylonjs-editor-tools";

import type { Editor } from "../../../main";

import { Badge } from "../../../../ui/shadcn/ui/badge";

import { isAbstractMesh, isCollisionInstancedMesh, isCollisionMesh } from "../../../../tools/guards/nodes";
import { onRedoObservable, onUndoObservable } from "../../../../tools/undoredo";
import { onNodesAddedObservable, onProjectSavedObservable } from "../../../../tools/observables";

import type { TerrainOverlay } from "../../../../tools/terrain/core/types";
import { getTerrainEligibility } from "../../../../tools/terrain/engine/eligibility";
import { onTerrainChangedObservable } from "../../../../tools/terrain/engine/events";
import { getTerrainMeshInfo, getTerrainPlugin, setTerrainOverlay } from "../../../../tools/terrain/engine/info";
import { getActiveTerrainPreview } from "../../../../tools/terrain/engine/state";
import type { ITerrainBusyInfo, ITerrainChangedEvent, ITerrainInfo, TerrainEligibility } from "../../../../tools/terrain/engine/types";
import { getTerrainBusyInfo, onTerrainBusyChangedObservable } from "../../../../tools/terrain/engine/yield";

import { TerrainBrushLibrary } from "../../../../tools/terrain/io/brush-library";
import { getProjectDirectory, resolveRenamedAssetPath } from "../../../../tools/terrain/io/paths";

import { TerrainTabErrorBoundary } from "./error-boundary";
import { getTerrainTabState, type TerrainTabState } from "./state-machine";
import { getActiveTerrainLayerId, onTerrainSettingsChangedObservable, TERRAIN_ACTIVE_LAYER_SETTINGS_KEY, terrainSettings, type ITerrainSettingsChange } from "./settings";
import { TerrainViewportController, type ITerrainViewportStatus } from "./viewport/controller";

import { reportTerrainTabError } from "./drop-actions";

import { TerrainEmptyState } from "./sections/empty";
import { TerrainToolsSection } from "./sections/tools";
import { TerrainBrushSection } from "./sections/brush";
import { TerrainLayersSection } from "./sections/layers";
import { TerrainFiltersSection } from "./sections/filters";
import { TerrainSettingsSections } from "./sections/settings";
import { TerrainToolOptionsSection } from "./sections/tool-options";
import { openTerrainGeneratePanel } from "./sections/generate-panel";
import { TerrainHeader, getTerrainTabCategory } from "./sections/header";

import { openTerrainResizeDialog } from "./dialogs/resize";
import { openTerrainHeightmapImport } from "./dialogs/import-heightmap";

export interface IEditorTerrainInspectorProps {
	editor: Editor;
	object: unknown;
}

/**
 * State of the Terrain tab component. The tab content (EditorTerrainTabContent) owns the live state; the outer component only hosts the error
 * boundary (§1.2).
 */
export interface IEditorTerrainInspectorState {}

/** Text of the playing state (§1.3, §1.17 refused.playing). */
export const TERRAIN_TAB_PLAYING_TEXT = "Terrain tools are disabled while the game is playing.";

/** Period of the light poll that detects Play start/stop, removed meshes and scene changes (the play component has no observable). */
const TERRAIN_TAB_POLL_INTERVAL_MS = 500;

const TERRAIN_TAB_EMPTY_STATUS: Readonly<ITerrainViewportStatus> = {
	canEdit: false,
	message: null,
	hover: null,
	strokeActive: false,
	navigateMode: false,
	captureArmed: false,
	predictedRefusal: null,
};

/**
 * Data of one render of the `terrain` state, from which the header and the sections of the category get their props (the tab re-renders on
 * terrain, settings, busy, library, undo/redo and scene changes, so every render reads fresh values).
 */
export interface ITerrainTabContext {
	/** The editor reference. */
	editor: Editor;
	/** The target terrain. */
	mesh: Mesh;
	/** getTerrainMeshInfo(mesh) of this render. */
	info: ITerrainInfo;
	/** Terrain material plugin, null when the terrain has no terrain material. */
	plugin: TerrainMaterialPlugin | null;
	/** Viewport controller of the tab (brush capture, eyedropper, navigate), null when unavailable. */
	controller: TerrainViewportController | null;
	/** Last status of the controller (hint line, capture armed). */
	status: Readonly<ITerrainViewportStatus>;
	/** Running terrain operation, null when idle: every mutating button is disabled while it runs (§1.12). */
	busy: Readonly<ITerrainBusyInfo> | null;
	/** true when the terrain can't be edited (newer version, unsupported resolution). */
	readOnly: boolean;
}

interface ITerrainTabResolution {
	/** State of the tab (§1.3): "playing" wins over every other state. */
	tabState: TerrainTabState;
	/** true while the game plays (the content renders inert). */
	playing: boolean;
	/** State of the content (the state the tab would have without Play), rendered inert while playing. */
	state: TerrainTabState;
	eligibility: TerrainEligibility | null;
	/** Eligible terrain, null otherwise. */
	mesh: Mesh | null;
}

interface IEditorTerrainTabContentState {
	status: Readonly<ITerrainViewportStatus>;
	busy: Readonly<ITerrainBusyInfo> | null;
	playing: boolean;
	/** Bumped by every change that needs a re-render (terrain events, settings, library, undo/redo, scene). */
	revision: number;
	missingLayerSources: number;
}

/**
 * Content of the Terrain tab (inside the error boundary): state machine, viewport controller lifecycle and subscriptions (§1.2).
 */
export class EditorTerrainTabContent extends Component<IEditorTerrainInspectorProps, IEditorTerrainTabContentState> {
	private _rootRef = createRef<HTMLDivElement>();

	private _controller: TerrainViewportController | null = null;
	private _target: Mesh | null = null;
	private _disposed: boolean = false;

	private _observers: { remove: () => void }[] = [];
	private _pluginObserver: { plugin: TerrainMaterialPlugin; observer: Observer<TerrainMaterialPlugin> } | null = null;
	private _pollInterval: ReturnType<typeof setInterval> | null = null;

	private _appliedOverlay: { mesh: Mesh; key: string } | null = null;
	private _pollSnapshot: string = "";
	private _previewScene: Scene | null = null;
	private _missingSourcesRequest: number = 0;

	public constructor(props: IEditorTerrainInspectorProps) {
		super(props);

		this.state = {
			status: TERRAIN_TAB_EMPTY_STATUS,
			busy: null,
			playing: false,
			revision: 0,
			missingLayerSources: 0,
		};
	}

	public render(): ReactNode {
		const resolution = this._resolve();

		return (
			<div ref={this._rootRef} className="flex flex-col gap-2 w-full min-h-full pb-2">
				{resolution.playing && (
					<Badge variant="secondary" className="flex items-center gap-2 w-full">
						<LuInfo className="w-4 h-4 shrink-0" />
						{TERRAIN_TAB_PLAYING_TEXT}
					</Badge>
				)}

				<div className={`flex flex-col gap-2 w-full ${resolution.playing ? "pointer-events-none opacity-50" : ""}`}>{this._renderState(resolution)}</div>
			</div>
		);
	}

	public componentDidMount(): void {
		this._disposed = false;

		try {
			this._controller = new TerrainViewportController(this.props.editor, {
				rootElement: this._rootRef.current,
				onStatusChanged: (status) => this._handleStatusChanged(status),
			});
		} catch (e) {
			this._controller = null;
			reportTerrainTabError(this.props.editor, e);
		}

		try {
			this._subscribe();
			this._syncTarget();
			this._loadProjectResources();

			if (this._controller) {
				this.setState({ status: { ...this._controller.status } });
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}

		this._pollInterval = setInterval(() => this._poll(), TERRAIN_TAB_POLL_INTERVAL_MS);
		this._pollSnapshot = this._getPollSnapshot();
		this._previewScene = this.props.editor.layout?.preview?.scene ?? null;
	}

	public componentDidUpdate(): void {
		this._syncTarget();
	}

	public componentWillUnmount(): void {
		this._disposed = true;

		if (this._pollInterval !== null) {
			clearInterval(this._pollInterval);
			this._pollInterval = null;
		}

		for (const observer of this._observers.splice(0)) {
			try {
				observer.remove();
			} catch (e) {
				console.error(e);
			}
		}

		this._setPluginObserver(null);

		// Overlays are editor-only helpers of the open tab.
		this._clearOverlay();
		this._cancelPreview(null);

		try {
			this._controller?.dispose();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}

		this._controller = null;
		this._target = null;
	}

	/**
	 * Whether the game plays (§1.3): the play component is playing or holds a scene.
	 */
	private _isPlaying(): boolean {
		const play = this.props.editor.layout?.preview?.play;
		return !!(play?.state?.playing || play?.scene);
	}

	/**
	 * Whether the edited object is a live mesh of the edited scene (a deleted terrain is no longer in scene.meshes: state no-selection).
	 * Meshes of another scene are not: during Play the graph lists the play scene, whose runtime terrains must never become the target (the
	 * controller would clamp against them and the editor-only overlays would be drawn by the running game).
	 * Collision proxies (and their instances) are meshes too: isAbstractMesh doesn't list the "CollisionMesh" class, but the tab must show
	 * their ineligibility ("Collision meshes can't be sculpted.", §1.3), not the no-selection card.
	 */
	private _isLiveMesh(object: unknown): object is AbstractMesh {
		if (!object || !(isAbstractMesh(object) || isCollisionMesh(object) || isCollisionInstancedMesh(object))) {
			return false;
		}

		const mesh = object as AbstractMesh;
		if (mesh.isDisposed()) {
			return false;
		}

		const scene = mesh.getScene();
		return !!scene && scene === this.props.editor.layout?.preview?.scene && scene.meshes.includes(mesh);
	}

	private _resolve(): ITerrainTabResolution {
		const playing = this._isPlaying();
		const object = this.props.object;
		const isMesh = this._isLiveMesh(object);

		let eligibility: TerrainEligibility | null = null;
		if (isMesh) {
			try {
				eligibility = getTerrainEligibility(object);
			} catch (e) {
				console.error(e);
				eligibility = null;
			}
		}

		const tabState = getTerrainTabState({ playing, isAbstractMesh: isMesh, eligibility });
		const state = tabState === "playing" ? getTerrainTabState({ playing: false, isAbstractMesh: isMesh, eligibility }) : tabState;

		return {
			tabState,
			playing: tabState === "playing",
			state,
			eligibility,
			mesh: eligibility?.eligible ? eligibility.mesh : null,
		};
	}

	private _renderState(resolution: ITerrainTabResolution): ReactNode {
		const busy = this.state.busy !== null;
		const eligibility = resolution.eligibility;

		switch (resolution.state) {
			case "no-selection":
				return <TerrainEmptyState editor={this.props.editor} eligibility={null} busy={busy} />;

			case "ineligible":
				return <TerrainEmptyState editor={this.props.editor} eligibility={eligibility && !eligibility.eligible ? eligibility : null} busy={busy} />;

			case "terrain":
				return resolution.mesh ? this._renderTerrain(resolution.mesh) : null;

			default:
				return null;
		}
	}

	private _renderTerrain(mesh: Mesh): ReactNode {
		const info = getTerrainMeshInfo(mesh);
		const plugin = getTerrainPlugin(mesh);

		const context: ITerrainTabContext = {
			editor: this.props.editor,
			mesh,
			info,
			plugin,
			controller: this._controller,
			status: this.state.status,
			busy: this.state.busy,
			readOnly: info.readOnly,
		};

		return (
			<>
				<TerrainHeader
					editor={this.props.editor}
					mesh={mesh}
					info={info}
					plugin={plugin}
					controller={this._controller}
					status={this.state.status}
					busy={this.state.busy}
					missingLayerSources={this.state.missingLayerSources}
					onResize={() => void openTerrainResizeDialog(this.props.editor, mesh)}
					onImportHeightmap={() => void openTerrainHeightmapImport(this.props.editor, mesh)}
					onGenerate={() => this._openGenerate()}
					onRebuildLayerTextures={() => this._rebuildLayerTextures(mesh)}
				/>

				{this._renderCategory(context)}
			</>
		);
	}

	/**
	 * Sections of the category (§1.4): Sculpt = Tools, Brush, {Tool} options, Filters; Paint = Layers first, then the same sections for the
	 * paint tools; Settings = the Settings sections (Generate panel included). Sections subscribe to the settings themselves.
	 */
	private _renderCategory(context: ITerrainTabContext): ReactNode {
		const { editor, mesh, info, controller, status } = context;
		const category = getTerrainTabCategory();

		if (category === "settings") {
			return <TerrainSettingsSections editor={editor} mesh={mesh} />;
		}

		// A terrain created by a newer editor version can't be edited at all (§1.5 banner): the tool sections are shown inert.
		const inert = info.warnings.includes("newer-version");

		return (
			<div className={`flex flex-col gap-2 w-full ${inert ? "pointer-events-none opacity-50" : ""}`}>
				{category === "paint" && <TerrainLayersSection editor={editor} mesh={mesh} />}

				<TerrainToolsSection editor={editor} category={category} status={status} />
				<TerrainBrushSection editor={editor} mesh={mesh} controller={controller} info={info} status={status} />
				<TerrainToolOptionsSection editor={editor} mesh={mesh} controller={controller} info={info} />
				<TerrainFiltersSection editor={editor} mesh={mesh} info={info} />
			</div>
		);
	}

	private _openGenerate(): void {
		try {
			openTerrainGeneratePanel();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	/**
	 * [Rebuild] of the layer textures banner (§1.5): rebuilds the layer arrays and counts the missing sources again at once (the rebuild only
	 * notifies the plugin's resources observer when the arrays changed, e.g. never for a terrain that was not rendered yet).
	 */
	private _rebuildLayerTextures(mesh: Mesh): void {
		try {
			getTerrainPlugin(mesh)?.rebuildLayerTextures();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}

		this._checkMissingLayerSources();
	}

	private _bump(): void {
		if (!this._disposed) {
			this.setState((state) => ({ revision: state.revision + 1 }));
		}
	}

	/**
	 * Adds an observer and remembers how to remove it (componentWillUnmount). Every observer body is wrapped in try/catch (§1.2).
	 */
	private _observe<T>(
		observable: { add: (callback: (value: T) => void) => Observer<T> | null; remove: (observer: Observer<T> | null) => boolean },
		callback: (value: T) => void
	): void {
		const observer = observable.add((value) => {
			try {
				callback(value);
			} catch (e) {
				reportTerrainTabError(this.props.editor, e);
			}
		});

		this._observers.push({ remove: () => observable.remove(observer) });
	}

	private _subscribe(): void {
		this._observe(onTerrainChangedObservable, (event) => this._handleTerrainChanged(event));
		this._observe(onTerrainBusyChangedObservable, (busy) => this._handleBusyChanged(busy));

		this.setState({ busy: getTerrainBusyInfo() });

		this._observe(onTerrainSettingsChangedObservable, (change) => this._handleSettingsChanged(change));
		this._observe(onUndoObservable, () => this._bump());
		this._observe(onRedoObservable, () => this._bump());
		this._observe(onNodesAddedObservable, () => this._bump());
		this._observe(onProjectSavedObservable, () => this._bump());

		try {
			const library = TerrainBrushLibrary.Get();
			// The controller re-resolves the brush shape itself (library and settings changes): the tab only re-renders.
			this._observe(library.onChangedObservable, () => this._bump());
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Loads the brush library of the project (idempotent per directory).
	 */
	private _loadProjectResources(): void {
		try {
			TerrainBrushLibrary.Get()
				.load(getProjectDirectory())
				.catch((e) => reportTerrainTabError(this.props.editor, e));
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Settings changes (§1.4). External changes (category, tool, overlay toggles, shortcuts, reset, MCP) can change the structure of the tab:
	 * full re-render. Field edits notify at every keystroke and pointer-locked move: the sections that show them re-render themselves
	 * (useTerrainSettingsRevision, own observers) and the tab only re-applies the overlay (opacity, contour interval, active layer), since a
	 * full re-render reads getTerrainMeshInfo and renders every section at each move.
	 */
	private _handleSettingsChanged(change: ITerrainSettingsChange): void {
		if (change.external) {
			this._bump();
			return;
		}

		if (change.keys.some((key) => key.startsWith("view.") || key === TERRAIN_ACTIVE_LAYER_SETTINGS_KEY)) {
			this._syncTarget();
		}
	}

	private _handleStatusChanged(status: Readonly<ITerrainViewportStatus>): void {
		try {
			if (!this._disposed) {
				this.setState({ status: { ...status } });
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleTerrainChanged(event: ITerrainChangedEvent): void {
		// Live writes of the layer proxies notify "layer-edit" on every keystroke: the fields show their own values and the Layers section
		// re-keys its detail fields itself (layerFieldsRevision, §1.4).
		if (event.reason === "layer-edit") {
			return;
		}

		const target = this._target;
		const concernsTarget = !!target && (event.mesh === target || (!!target.material && event.mesh.material === target.material));

		if (concernsTarget) {
			// The overlay depends on the material (active layer index) and on the grid (vertex grid overlay).
			if (event.kinds.includes("layers") || event.kinds.includes("material") || event.kinds.includes("grid") || event.reason === "load") {
				this._appliedOverlay = null;
			}

			if (event.kinds.includes("layers") || event.kinds.includes("material") || event.reason === "load") {
				this._checkMissingLayerSources();
			}
		}

		// Other meshes change the terrain list (created, resized or shown terrains) and the header selector.
		this._bump();
	}

	private _handleBusyChanged(busy: Readonly<ITerrainBusyInfo> | null): void {
		if (!this._disposed) {
			this.setState({ busy: busy ? { ...busy } : null });
		}
	}

	private _poll(): void {
		try {
			const playing = this._isPlaying();
			if (playing !== this.state.playing) {
				this.setState({ playing });
			}

			// The preview creates a new scene when another scene or project is opened: the controller and the overlays follow it.
			const scene = this.props.editor.layout?.preview?.scene ?? null;
			if (scene !== this._previewScene) {
				this._previewScene = scene;
				this._appliedOverlay = null;
				this._controller?.setScene(scene);
			}

			const snapshot = this._getPollSnapshot();
			if (snapshot !== this._pollSnapshot) {
				this._pollSnapshot = snapshot;
				this._bump();
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	/**
	 * Cheap snapshot of what the terrain list and the state depend on besides the observables: mesh count of the scene and liveness of the edited object.
	 */
	private _getPollSnapshot(): string {
		const scene = this.props.editor.layout?.preview?.scene;
		return `${scene?.uid ?? ""}|${scene?.meshes.length ?? 0}|${this._isLiveMesh(this.props.object)}`;
	}

	/**
	 * Follows the edited object: controller target, overlays, weight loading on demand, plugin resource observer, Generate preview.
	 */
	private _syncTarget(): void {
		if (this._disposed) {
			return;
		}

		try {
			const resolution = this._resolve();
			const target = resolution.state === "terrain" ? resolution.mesh : null;

			if (target !== this._target) {
				this._target = target;

				this._clearOverlay();
				this._cancelPreview(target);

				this._controller?.setTarget(target);

				this._setPluginObserver(target ? getTerrainPlugin(target) : null);
				this._loadTargetWeights(target);
				this._checkMissingLayerSources();
			} else {
				// The terrain material may have changed (texture painting enabled/disabled, material replaced).
				const plugin = target ? getTerrainPlugin(target) : null;
				if (plugin !== (this._pluginObserver?.plugin ?? null)) {
					this._setPluginObserver(plugin);
					this._loadTargetWeights(plugin ? target : null);
				}
			}

			this._applyOverlay(target);
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _setPluginObserver(plugin: TerrainMaterialPlugin | null): void {
		if (this._pluginObserver?.plugin === plugin) {
			return;
		}

		if (this._pluginObserver) {
			try {
				this._pluginObserver.plugin.onResourcesChangedObservable.remove(this._pluginObserver.observer);
			} catch (e) {
				console.error(e);
			}
		}

		this._pluginObserver = null;

		if (plugin) {
			const observer = plugin.onResourcesChangedObservable.add(() => {
				try {
					this._appliedOverlay = null;
					// Layer textures rebuilt ([Rebuild] of the banner or of the Layers section, a source changed on disk): the missing files
					// may be back, so the banner is recomputed.
					this._checkMissingLayerSources();
					this._bump();
				} catch (e) {
					reportTerrainTabError(this.props.editor, e);
				}
			});

			this._pluginObserver = { plugin, observer };
		}
	}

	/**
	 * Weights of a hidden or not yet rendered terrain load on demand when the tab targets it (§1.16).
	 */
	private _loadTargetWeights(target: Mesh | null): void {
		const plugin = target ? getTerrainPlugin(target) : null;
		if (!plugin) {
			return;
		}

		plugin
			.whenWeightMapsReadyAsync()
			.then(() => this._bump())
			.catch((e) => console.error(e));
	}

	/**
	 * Counts the layer source files of the target that can't be found on disk (layer textures banner, §1.5), asynchronously.
	 */
	private _checkMissingLayerSources(): void {
		const request = ++this._missingSourcesRequest;
		const target = this._target;
		const plugin = target ? getTerrainPlugin(target) : null;
		const projectDirectory = getProjectDirectory();

		if (!plugin || !projectDirectory) {
			if (this.state.missingLayerSources !== 0) {
				this.setState({ missingLayerSources: 0 });
			}
			return;
		}

		const paths = new Set<string>();
		for (const layer of plugin.data.layers) {
			for (const path of [layer.albedo, layer.normal, layer.roughnessMap, layer.aoMap, layer.heightMap]) {
				if (path) {
					paths.add(path);
				}
			}
		}

		Promise.all(Array.from(paths, (path) => pathExists(join(projectDirectory, resolveRenamedAssetPath(path))).catch(() => false)))
			.then((results) => {
				const missing = results.filter((exists) => !exists).length;
				if (!this._disposed && request === this._missingSourcesRequest) {
					// Compared with the latest queued state (a result arriving before React applied the previous one).
					this.setState((state) => (state.missingLayerSources === missing ? null : { missingLayerSources: missing }));
				}
			})
			.catch((e) => console.error(e));
	}

	/**
	 * Applies the overlay of the view settings to the target terrain (§1.5), only when something changed.
	 */
	private _applyOverlay(target: Mesh | null): void {
		const view = terrainSettings.view;
		if (!target || !view) {
			this._clearOverlay();
			return;
		}

		const overlay: TerrainOverlay = view.overlay ?? "none";
		const activeLayerId = overlay === "active-layer" ? getActiveTerrainLayerId(target.material) : null;
		const key = `${overlay}|${view.overlayOpacity}|${view.contourInterval}|${activeLayerId ?? ""}|${target.material?.uniqueId ?? ""}`;

		if (this._appliedOverlay?.mesh === target && this._appliedOverlay.key === key) {
			return;
		}

		if (this._appliedOverlay && this._appliedOverlay.mesh !== target) {
			this._clearOverlay();
		}

		this._appliedOverlay = { mesh: target, key };

		setTerrainOverlay(target, overlay, {
			activeLayerId,
			contourInterval: view.contourInterval,
			opacity: view.overlayOpacity,
		});
	}

	private _clearOverlay(): void {
		const applied = this._appliedOverlay;
		this._appliedOverlay = null;

		if (!applied || applied.mesh.isDisposed() || applied.key.startsWith("none|")) {
			return;
		}

		try {
			setTerrainOverlay(applied.mesh, "none");
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Cancels the open Generate preview when the tab unmounts or targets another terrain (§1.13.3).
	 */
	private _cancelPreview(nextTarget: Mesh | null): void {
		try {
			const preview = getActiveTerrainPreview();
			if (preview?.isOpen && preview.mesh !== nextTarget) {
				preview.cancel();
			}
		} catch (e) {
			console.error(e);
		}
	}
}

/**
 * Content of the Terrain tab of the inspector (§1.2): renders <TerrainTabErrorBoundary> around the content (§1.2), so a render error shows an
 * error card and disposes the viewport controller instead of resetting the editor layout.
 */
export class EditorTerrainInspector extends Component<IEditorTerrainInspectorProps, IEditorTerrainInspectorState> {
	public render(): ReactNode {
		return (
			<TerrainTabErrorBoundary editor={this.props.editor}>
				<EditorTerrainTabContent editor={this.props.editor} object={this.props.object} />
			</TerrainTabErrorBoundary>
		);
	}
}
