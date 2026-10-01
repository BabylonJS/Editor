import { Component, ReactNode } from "react";

import { Mesh, Observer } from "babylonjs";
import { TerrainMaterialPlugin } from "babylonjs-editor-tools";

import { Editor } from "../../../main";

import { isTerrainMesh } from "../../../../tools/guards/nodes";
import { onRedoObservable, onUndoObservable } from "../../../../tools/undoredo";
import { onNodesAddedObservable, onProjectSavedObservable } from "../../../../tools/observables";

import { getTerrainEligibility } from "../../../../tools/terrain/engine/eligibility";
import { onTerrainChangedObservable } from "../../../../tools/terrain/engine/events";
import { getTerrainMeshInfo, getTerrainPlugin } from "../../../../tools/terrain/engine/info";
import { onTerrainBusyChangedObservable } from "../../../../tools/terrain/engine/yield";

import { onTerrainSettingsChangedObservable, terrainSettings } from "./settings";
import { TerrainViewportController } from "./viewport/controller";

import { TerrainTools } from "./sections/tools";
import { TerrainHeader } from "./sections/header";
import { TerrainBanners } from "./sections/banners";
import { TerrainEmptyState } from "./sections/empty";

import { TerrainPaintMode } from "./modes/paint";
import { TerrainSculptMode } from "./modes/sculpt";

export interface IEditorTerrainInspectorProps {
	editor: Editor;
	/**
	 * Defines the object edited in the inspector.
	 */
	object: unknown;
}

export class EditorTerrainInspector extends Component<IEditorTerrainInspectorProps> {
	/**
	 * Handles the terrain tool in the preview: brush cursor, strokes and shortcuts.
	 */
	private _controller: TerrainViewportController | null = null;

	private _observers: (() => void)[] = [];

	private _plugin: TerrainMaterialPlugin | null = null;
	private _pluginObserver: Observer<TerrainMaterialPlugin> | null = null;

	public render(): ReactNode {
		const terrain = this._getTerrain();

		return (
			<div className="flex flex-col gap-2 w-full min-h-full pb-2">
				{this._controller && !terrain && <TerrainEmptyState editor={this.props.editor} object={this.props.object} />}
				{this._controller && terrain && this._getTerrainComponent(terrain, this._controller)}
			</div>
		);
	}

	public componentDidMount(): void {
		this._controller = new TerrainViewportController(this.props.editor, () => this.forceUpdate());

		// Everything shown by the tool comes from the terrain and the settings: redraw when one of them changes.
		this._observe(onTerrainChangedObservable, (event) => event.reason !== "layer-edit" && this.forceUpdate());
		this._observe(onTerrainBusyChangedObservable, () => this.forceUpdate());
		this._observe(onTerrainSettingsChangedObservable, (external) => external && this.forceUpdate());
		this._observe(onUndoObservable, () => this.forceUpdate());
		this._observe(onRedoObservable, () => this.forceUpdate());
		this._observe(onNodesAddedObservable, () => this.forceUpdate());
		this._observe(onProjectSavedObservable, () => this.forceUpdate());

		this.componentDidUpdate();
		this.forceUpdate();
	}

	public componentDidUpdate(): void {
		const terrain = this._getTerrain();

		// The preview creates a new scene when another scene or project is loaded.
		this._controller?.setScene(this.props.editor.layout.preview.scene);
		this._controller?.setTarget(terrain);

		// The textures of the terrain material are loaded asynchronously.
		const plugin = terrain ? getTerrainPlugin(terrain) : null;
		if (plugin !== this._plugin) {
			this._plugin?.onResourcesChangedObservable.remove(this._pluginObserver);
			this._plugin = plugin;
			this._pluginObserver = plugin?.onResourcesChangedObservable.add(() => this.forceUpdate()) ?? null;
		}
	}

	public componentWillUnmount(): void {
		this._observers.forEach((remove) => remove());
		this._plugin?.onResourcesChangedObservable.remove(this._pluginObserver);

		this._controller?.dispose();
	}

	/**
	 * Returns the edited object when it is a terrain that can be edited.
	 */
	private _getTerrain(): Mesh | null {
		const object = this.props.object;
		if (isTerrainMesh(object) && !object.isDisposed() && getTerrainEligibility(object).eligible) {
			return object;
		}

		return null;
	}

	private _getTerrainComponent(terrain: Mesh, controller: TerrainViewportController): ReactNode {
		const editor = this.props.editor;
		const info = getTerrainMeshInfo(terrain);
		const mode = terrainSettings.category;

		// A terrain saved by a newer version of the editor can't be edited.
		const locked = info.warnings.includes("newer-version");

		return (
			<>
				<TerrainHeader editor={editor} mesh={terrain} info={info} controller={controller} />
				<TerrainTools info={info} />

				<TerrainBanners editor={editor} mesh={terrain} info={info} />

				<div className={`flex flex-col gap-2 w-full ${locked ? "pointer-events-none opacity-50" : ""}`}>
					{mode === "sculpt" && <TerrainSculptMode editor={editor} mesh={terrain} info={info} controller={controller} />}
					{mode === "paint" && <TerrainPaintMode editor={editor} mesh={terrain} info={info} />}
				</div>
			</>
		);
	}

	private _observe<T>(observable: { add: (callback: (data: T) => void) => unknown; remove: (observer: any) => unknown }, callback: (data: T) => void): void {
		const observer = observable.add(callback);
		this._observers.push(() => observable.remove(observer));
	}
}
