import { extname } from "path/posix";

import { Component, ReactNode } from "react";

import { VscJson } from "react-icons/vsc";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";

import { Reorder } from "framer-motion";

import { Observer, Node, Tools } from "babylonjs";
import { ISpriteMapTile } from "babylonjs-editor-tools";

import { Button } from "../../../../ui/shadcn/ui/button";

import { SpriteMapNode } from "../../../nodes/sprite-map";

import { onGizmoNodeChangedObservable } from "../../preview/gizmo";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { isSpriteMapNode } from "../../../../tools/guards/sprites";
import { onNodeModifiedObservable } from "../../../../tools/observables";
import { computeSpriteMapPreviews } from "../../../../tools/sprite/preview";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { ScriptInspectorComponent } from "../script/script";

import { EditorTransformNodeInspector } from "../transform";
import { IEditorInspectorImplementationProps } from "../inspector";

export interface IEditorSpriteMapNodeInspectorState {
	dragOver: boolean;
	selectedTile: ISpriteMapTile | null;
}

export class EditorSpriteMapNodeInspector extends Component<IEditorInspectorImplementationProps<SpriteMapNode>, IEditorSpriteMapNodeInspectorState> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isSpriteMapNode(object);
	}

	public constructor(props: IEditorInspectorImplementationProps<SpriteMapNode>) {
		super(props);

		this.state = {
			dragOver: false,
			selectedTile: props.object.tiles?.[0] ?? null,
		};
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Common">
					<EditorInspectorStringField
						label="Name"
						object={this.props.object}
						property="name"
						onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Transforms">
					<EditorInspectorVectorField label={<div className="w-14">Position</div>} object={this.props.object} property="position" />
					{EditorTransformNodeInspector.GetRotationInspector(this.props.object)}
				</EditorInspectorSectionField>

				<ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

				{this.props.object.spriteMap ? this._getOptionsInspector() : this._getAtlasJsonDraggableZone()}
			</>
		);
	}

	private _gizmoObserver: Observer<Node> | null = null;

	public async componentDidMount(): Promise<void> {
		this._gizmoObserver = onGizmoNodeChangedObservable.add((node) => {
			if (node === this.props.object) {
				this.props.editor.layout.inspector.forceUpdate();
			}
		});

		this._computeSpritePreviewImages();
	}

	public componentWillUnmount(): void {
		if (this._gizmoObserver) {
			onGizmoNodeChangedObservable.remove(this._gizmoObserver);
		}
	}

	private async _computeSpritePreviewImages(): Promise<void> {
		await computeSpriteMapPreviews(this.props.object);
		this.forceUpdate();
	}

	private _getAtlasJsonDraggableZone(): ReactNode {
		return (
			<EditorInspectorSectionField title="Sprite Map">
				<div
					onDragOver={(ev) => {
						ev.preventDefault();
						this.setState({
							dragOver: true,
						});
					}}
					onDragLeave={(ev) => {
						ev.preventDefault();
						this.setState({
							dragOver: false,
						});
					}}
					onDrop={async (ev) => {
						ev.preventDefault();
						this.setState({
							dragOver: false,
						});

						const path = JSON.parse(ev.dataTransfer.getData("assets"))[0];
						const extension = extname(path).toLowerCase();
						if (extension === ".json") {
							await this.props.object.buildFromAbsolutePath(path);
							await this._computeSpritePreviewImages();
							this.forceUpdate();
						}
					}}
					className={`
						flex flex-col gap-4 justify-center items-center p-2 rounded-lg
						border-[1px] border-secondary-foreground/35 border-dashed
						${this.state.dragOver ? "bg-muted-foreground/75 dark:bg-muted-foreground/20" : ""}
						transition-all duration-300 ease-in-out
					`}
				>
					<VscJson size="64px" className="opacity-50" />
					<div className="flex flex-col items-center">
						<div>No Atlas JSON file assigned yet.</div>
						<div className="font-semibold text-muted-foreground">Drag'n'drop an Atlas JSON file here.</div>
					</div>
				</div>
			</EditorInspectorSectionField>
		);
	}

	private _tilesBeforePan: ISpriteMapTile[] | null = null;

	private _getOptionsInspector(): ReactNode {
		const options = this.props.object.spriteMap!.options;

		return (
			<>
				<EditorInspectorSectionField title="Sprite Map Options">
					<EditorInspectorNumberField
						noUndoRedo
						object={options}
						property="layerCount"
						label="Layer Count"
						min={1}
						max={8}
						step={1}
						onChange={() => this.props.object.updateFromOptions(options)}
						onFinishChange={() => this._handleOptionsUndoRedo()}
					/>
					<EditorInspectorVectorField
						noUndoRedo
						object={options}
						property="stageSize"
						label="Stage Size"
						step={1}
						onChange={() => this.props.object.updateFromOptions(options)}
						onFinishChange={() => this._handleOptionsUndoRedo()}
					/>
					<EditorInspectorVectorField
						noUndoRedo
						object={options}
						property="outputSize"
						label="Output Size"
						step={1}
						onChange={() => this.props.object.updateFromOptions(options)}
						onFinishChange={() => this._handleOptionsUndoRedo()}
					/>
					<EditorInspectorVectorField
						noUndoRedo
						object={options}
						property="colorMultiply"
						label="Color Multiply"
						step={1}
						min={0}
						max={1}
						onChange={() => this.props.object.updateFromOptions(options)}
						onFinishChange={() => this._handleOptionsUndoRedo()}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Tiles">
					<div className="flex justify-between items-center">
						<div className="p-2 font-bold">Tile Sets</div>

						<div className="flex gap-2">
							<Button variant="ghost" disabled={this.state.selectedTile === null} className="p-0.5 w-6 h-6" onClick={() => this._handleRemoveTile()}>
								<AiOutlineMinus className="w-4 h-4" />
							</Button>

							<Button variant="ghost" className="p-0.5 w-6 h-6" onClick={() => this._handleAddTile()}>
								<AiOutlinePlus className="w-4 h-4" />
							</Button>
						</div>
					</div>

					<Reorder.Group
						axis="y"
						onPanStart={() => {
							this._tilesBeforePan = this.props.object.tiles.slice();
						}}
						onPanEnd={() => {
							if (this._tilesBeforePan) {
								const oldTiles = this._tilesBeforePan;
								const newTiles = this.props.object.tiles.slice();

								registerUndoRedo({
									executeRedo: true,
									undo: () => (this.props.object.tiles = oldTiles),
									redo: () => (this.props.object.tiles = newTiles),
									action: () => this.props.object.updateFromOptions(options),
								});

								this._tilesBeforePan = null;

								this.forceUpdate();
							}
						}}
						onReorder={(items) => {
							this.props.object.tiles = items;
							this.props.object.updateFromOptions(options);
							this.forceUpdate();
						}}
						values={this.props.object.tiles}
						className="flex flex-col rounded-lg bg-black/50 text-white/75 h-96"
					>
						{this.props.object.tiles.map((tile) => (
							<Reorder.Item key={`${tile.name}`} value={tile} id={`${tile.name}`}>
								<div
									onClick={() => this.setState({ selectedTile: tile })}
									className={`p-2 hover:bg-muted/35 ${this.state.selectedTile === tile ? "bg-muted" : ""} transition-all duration-300 ease-in-out`}
								>
									{tile.name}
								</div>
							</Reorder.Item>
						))}
					</Reorder.Group>

					{this._getTileInspector()}
				</EditorInspectorSectionField>
			</>
		);
	}

	private _getTileInspector(): ReactNode {
		if (!this.state.selectedTile) {
			return null;
		}

		const options = this.props.object.spriteMap!.options;

		return (
			<>
				<EditorInspectorStringField object={this.state.selectedTile} property="name" label="Name" onChange={() => this.forceUpdate()} />
				<EditorInspectorVectorField
					object={this.state.selectedTile}
					property="position"
					label="Position"
					step={1}
					min={0}
					max={[this.props.object.spriteMap!.options.stageSize?.x ?? 0, this.props.object.spriteMap!.options.stageSize?.y ?? 0]}
					onChange={() => this.props.object.updateTile(this.state.selectedTile!)}
				/>
				<EditorInspectorVectorField
					object={this.state.selectedTile}
					property="repeatCount"
					label="Repeat Count"
					step={1}
					min={0}
					max={[this.props.object.spriteMap!.options.stageSize?.x ?? 0, this.props.object.spriteMap!.options.stageSize?.y ?? 0]}
					onChange={() => this.props.object.updateTile(this.state.selectedTile!)}
				/>
				<EditorInspectorVectorField
					object={this.state.selectedTile}
					property="repeatOffset"
					label="Repeat Offset"
					step={1}
					min={0}
					max={[this.props.object.spriteMap!.options.stageSize?.x ?? 0, this.props.object.spriteMap!.options.stageSize?.y ?? 0]}
					onChange={() => this.props.object.updateTile(this.state.selectedTile!)}
				/>

				<EditorInspectorListField
					search
					object={this.state.selectedTile}
					property="tile"
					label="Tile"
					items={this.props.object.atlasJson!.frames.map((f, index) => ({
						text: f.filename,
						value: index,
						icon: (
							<div className="flex justify-center items-center w-[24px] h-[24px] bg-secondary rounded-sm">
								<img src={f["_preview"]} className="w-full h-full object-contain" />
							</div>
						),
					}))}
					onChange={() => this.props.object.updateTile(this.state.selectedTile!)}
				/>

				{(options.layerCount ?? 1) > 1 && (
					<EditorInspectorNumberField
						object={this.state.selectedTile}
						property="layer"
						label="Layer"
						min={0}
						max={(options.layerCount ?? 1) - 1}
						step={1}
						onChange={() => this.props.object.updateFromOptions(options)}
					/>
				)}
			</>
		);
	}

	private _handleOptionsUndoRedo(): void {
		const options = this.props.object.spriteMap?.options;
		if (!options) {
			return;
		}

		const oldOptions = {
			layerCount: options.layerCount,
			stageSize: options.stageSize?.clone(),
			outputSize: options.outputSize?.clone(),
			colorMultiply: options.colorMultiply?.clone(),
		};

		const newOptions = {
			layerCount: options.layerCount,
			stageSize: options.stageSize?.clone(),
			outputSize: options.outputSize?.clone(),
			colorMultiply: options.colorMultiply?.clone(),
		};

		registerUndoRedo({
			executeRedo: true,
			undo: () => this.props.object.updateFromOptions(oldOptions),
			redo: () => this.props.object.updateFromOptions(newOptions),
		});

		this.forceUpdate();
	}

	private _handleAddTile(): void {
		const newTile: ISpriteMapTile = {
			id: Tools.RandomId(),
			name: `Tile ${this.props.object.tiles.length + 1}`,
			layer: 0,
			position: { x: 0, y: 0 },
			repeatCount: { x: 0, y: 0 },
			repeatOffset: { x: 0, y: 0 },
			tile: 1,
		};

		registerUndoRedo({
			executeRedo: true,
			undo: () => this.props.object.tiles.pop(),
			redo: () => this.props.object.tiles.push(newTile),
			action: () => this.props.object.updateFromOptions(this.props.object.spriteMap!.options),
		});

		this.setState({
			selectedTile: newTile,
		});

		this.props.object.updateFromOptions(this.props.object.spriteMap!.options);
	}

	private _handleRemoveTile(): void {
		const tiles = this.props.object.tiles;
		const selectedTile = this.state.selectedTile;

		if (!selectedTile || tiles.length < 2) {
			return;
		}

		const index = tiles.indexOf(selectedTile);
		if (index === -1) {
			return;
		}

		registerUndoRedo({
			executeRedo: true,
			undo: () => tiles.splice(index, 0, selectedTile),
			redo: () => tiles.splice(index, 1),
			action: () => this.props.object.updateFromOptions(this.props.object.spriteMap!.options),
		});

		this.setState({
			selectedTile: tiles[0] ?? null,
		});
	}
}
