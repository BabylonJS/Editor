import { extname, join } from "path/posix";

import { VscJson } from "react-icons/vsc";
import { Component, ReactNode } from "react";

import { Observer, Node, Constants, Texture } from "babylonjs";

import { SpriteManagerNode } from "../../../nodes/sprite-manager";

import { ToggleGroup, ToggleGroupItem } from "../../../../ui/shadcn/ui/toggle-group";

import { isTexture } from "../../../../tools/guards/texture";
import { registerUndoRedo } from "../../../../tools/undoredo";
import { isSpriteManagerNode } from "../../../../tools/guards/sprites";
import { onNodeModifiedObservable } from "../../../../tools/observables";
import { computeSpriteManagerPreviews } from "../../../../tools/sprite/preview";

import { getProjectAssetsRootUrl } from "../../../../project/configuration";

import { onGizmoNodeChangedObservable } from "../../preview/gizmo";

import { ScriptInspectorComponent } from "../script/script";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorTextureField } from "../fields/texture";

import { IEditorInspectorImplementationProps } from "../inspector";

export interface IEditorSpriteManagerNodeInspectorState {
	dragOver: boolean;
	isPacked: boolean;
}

export class EditorSpriteManagerNodeInspector extends Component<IEditorInspectorImplementationProps<SpriteManagerNode>, IEditorSpriteManagerNodeInspectorState> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isSpriteManagerNode(object);
	}

	public constructor(props: IEditorInspectorImplementationProps<SpriteManagerNode>) {
		super(props);

		this.state = {
			dragOver: false,
			isPacked: this.props.object.atlasJsonRelativePath ? true : false,
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

				<ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

				<EditorInspectorSectionField title="Assets">
					<ToggleGroup
						type="single"
						className="w-full"
						value={this.state.isPacked ? "packed" : "unpacked"}
						onValueChange={(v) => this.setState({ isPacked: v === "packed" })}
					>
						<ToggleGroupItem value="unpacked" className="w-full">
							Unpacked
						</ToggleGroupItem>
						<ToggleGroupItem value="packed" className="w-full">
							Packed
						</ToggleGroupItem>
					</ToggleGroup>

					{this.state.isPacked && this._getPackedSpritePreviewsInspector()}
					{!this.state.isPacked && this._getUnpackedSpriteManagerInspector()}
				</EditorInspectorSectionField>

				{this.props.object.spriteManager && this.props.object.spritesheet && this._getCommonSpriteManagerInspector()}
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
		await computeSpriteManagerPreviews(this.props.object);
		this.forceUpdate();
	}

	private _getCommonSpriteManagerInspector(): ReactNode {
		const spritesheetSize = this.props.object.spritesheet!.getSize();

		const o = {
			capacity: this.props.object.spriteManager?.capacity ?? 0,
		};

		return (
			<EditorInspectorSectionField title="Sprite Manager">
				<EditorInspectorNumberField
					noUndoRedo
					object={o}
					property="capacity"
					label="Capacity"
					step={1}
					min={1}
					max={100_000}
					onFinishChange={(v) => this._handleCapacityChanged(v)}
				/>

				{!this.props.object.atlasJson && (
					<>
						<EditorInspectorNumberField
							object={this.props.object.spriteManager}
							property="cellWidth"
							label="Cell Width"
							min={1}
							step={1}
							max={spritesheetSize.width}
							onFinishChange={() => {
								this.props.object._previews = [];
								this._computeSpritePreviewImages();
							}}
						/>
						<EditorInspectorNumberField
							object={this.props.object.spriteManager}
							property="cellHeight"
							label="Cell Height"
							min={1}
							step={1}
							max={spritesheetSize.height}
							onFinishChange={() => {
								this.props.object._previews = [];
								this._computeSpritePreviewImages();
							}}
						/>
					</>
				)}

				<EditorInspectorSwitchField object={this.props.object.spriteManager} property="pixelPerfect" label="Pixel Perfect" />

				<EditorInspectorListField
					label="Blend Mode"
					object={this.props.object}
					property="blendMode"
					items={[
						{ text: "Disable", value: Constants.ALPHA_DISABLE },
						{ text: "Add", value: Constants.ALPHA_ADD },
						{ text: "Combine", value: Constants.ALPHA_COMBINE },
						{ text: "Subtract", value: Constants.ALPHA_SUBTRACT },
						{ text: "Multiply", value: Constants.ALPHA_MULTIPLY },
						{ text: "Maximized", value: Constants.ALPHA_MAXIMIZED },
						{ text: "One-one", value: Constants.ALPHA_ONEONE },
						{ text: "Premultiplied", value: Constants.ALPHA_PREMULTIPLIED },
						{ text: "Premultiplied Porterduff", value: Constants.ALPHA_PREMULTIPLIED_PORTERDUFF },
						{ text: "Interpolate", value: Constants.ALPHA_INTERPOLATE },
						{ text: "Screen Mode", value: Constants.ALPHA_SCREENMODE },
					]}
				/>

				<EditorInspectorSwitchField object={this.props.object.spriteManager} property="fogEnabled" label="Fog Enabled" />
				<EditorInspectorSwitchField object={this.props.object.spriteManager} property="disableDepthWrite" label="Disable Depth Write" />
				<EditorInspectorSwitchField object={this.props.object.spriteManager} property="useLogarithmicDepth" label="Use Logarithmic Depth" />
			</EditorInspectorSectionField>
		);
	}

	private _handleCapacityChanged(newCapacity: number): void {
		const rootUrl = getProjectAssetsRootUrl()!;

		const oldSerializationData = this.props.object.serialize();
		const newSerializationData = {
			...oldSerializationData.spriteManager,
			capacity: newCapacity,
		};

		const absoluteFilePath = this.props.object.atlasJsonRelativePath
			? join(rootUrl, this.props.object.atlasJsonRelativePath)
			: join(rootUrl, oldSerializationData.spriteManager.textureUrl);

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				if (this.props.object.atlasJsonRelativePath) {
					this.props.object.buildFromImageAbsolutePath(absoluteFilePath, oldSerializationData.spriteManager);
				} else {
					this.props.object.buildFromImageAbsolutePath(absoluteFilePath, oldSerializationData.spriteManager);
				}
			},
			redo: () => {
				if (this.props.object.atlasJsonRelativePath) {
					this.props.object.buildFromImageAbsolutePath(absoluteFilePath, newSerializationData);
				} else {
					this.props.object.buildFromImageAbsolutePath(absoluteFilePath, newSerializationData);
				}
			},
		});

		this.forceUpdate();
	}

	private _getUnpackedSpriteManagerInspector(): ReactNode {
		const o = {
			texture: this.props.object.spritesheet,
		};

		const scene = this.props.editor.layout.preview.scene;

		return (
			<>
				<EditorInspectorTextureField
					noUndoRedo
					hideLevel
					hideSize
					hideInvert
					noPopover
					object={o}
					property="texture"
					title="Texture"
					scene={scene}
					accept3dlTexture={false}
					acceptCubeTexture={false}
					onChange={async (texture) => {
						if (isTexture(texture)) {
							this._handleSpritesheetTextureChanged(texture);
						}
					}}
				/>

				{this.props.object.spritesheet && !this.props.object.atlasJsonRelativePath && (
					<div className="flex flex-col gap-2 w-full">
						<div
							style={{
								gridTemplateRows: `repeat(auto-fill, 64px)`,
								gridTemplateColumns: `repeat(auto-fill, 64px)`,
							}}
							className="grid gap-2 justify-between p-2 rounded-lg w-full max-h-96 overflow-y-auto bg-black/50 text-white/75"
						>
							{this.props.object._previews.map((base64, index) => (
								<div
									key={`${index}-${this.props.object.spriteManager!.cellWidth} ${this.props.object.spriteManager!.cellHeight}`}
									className="flex justify-center items-center w-14 h-14 p-2 bg-secondary rounded-lg cursor-pointer hover:bg-background transition-all duration-300 ease-in-out"
								>
									<img
										draggable
										src={base64}
										className="w-full h-full object-contain"
										onDragStart={(ev) => {
											ev.dataTransfer.setData(
												"sprite",
												JSON.stringify({
													cellIndex: index,
													spriteNodeId: this.props.object.id,
												})
											);
										}}
									/>
								</div>
							))}
						</div>
					</div>
				)}
			</>
		);
	}

	private _handleSpritesheetTextureChanged(texture: Texture | null): void {
		const oldSpriteManagerSerializationData = this.props.object.serialize();

		registerUndoRedo({
			executeRedo: true,
			action: () => {
				this.props.object._previews = [];
			},
			undo: async () => {
				this.props.object.disposeSpriteManager();

				if (oldSpriteManagerSerializationData.atlasJsonRelativePath) {
					await this.props.object.buildFromAtlasJsonAbsolutePath(
						join(getProjectAssetsRootUrl()!, oldSpriteManagerSerializationData.atlasJsonRelativePath),
						oldSpriteManagerSerializationData.spriteManager
					);
				} else if (oldSpriteManagerSerializationData.spriteManager) {
					this.props.object.buildFromImageAbsolutePath(
						join(getProjectAssetsRootUrl()!, oldSpriteManagerSerializationData.spriteManager.textureUrl),
						oldSpriteManagerSerializationData.spriteManager
					);
				}

				this._computeSpritePreviewImages();
				this.props.editor.layout.graph.refresh();
			},
			redo: async () => {
				this.props.object.disposeSpriteManager();

				if (texture) {
					const imagePath = join(getProjectAssetsRootUrl()!, texture.name);
					this.props.object.buildFromImageAbsolutePath(imagePath);
					this._computeSpritePreviewImages();
				}

				this.props.editor.layout.graph.refresh();
			},
		});

		this.forceUpdate();
	}

	private _getPackedSpritePreviewsInspector(): ReactNode {
		const atlasJson = this.props.object.atlasJson;

		if (!this.props.object.atlasJsonRelativePath || !atlasJson) {
			return this._getAtlasJsonDraggableZone();
		}

		const frameKeys = Object.keys(atlasJson.frames);

		return (
			<div className="flex flex-col gap-2 w-full">
				<div
					style={{
						gridTemplateRows: `repeat(auto-fill, 64px)`,
						gridTemplateColumns: `repeat(auto-fill, 64px)`,
					}}
					className="grid gap-2 justify-between p-2 rounded-lg w-full max-h-96 overflow-y-auto bg-black/50 text-white/75"
				>
					{frameKeys.map((frameKey) => (
						<div
							key={frameKey}
							className="flex justify-center items-center w-14 h-14 p-2 bg-secondary rounded-lg cursor-pointer hover:bg-background transition-all duration-300 ease-in-out"
						>
							<img
								draggable
								src={atlasJson.frames[frameKey]._preview}
								className="w-full h-full object-contain"
								onDragStart={(ev) => {
									ev.dataTransfer.setData(
										"sprite",
										JSON.stringify({
											cellRef: frameKey,
											spriteNodeId: this.props.object.id,
										})
									);
								}}
							/>
						</div>
					))}
				</div>
			</div>
		);
	}

	private _getAtlasJsonDraggableZone(): ReactNode {
		return (
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
						this.props.object._previews = [];
						this.props.object.buildFromAtlasJsonAbsolutePath(path);

						this._computeSpritePreviewImages();
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
		);
	}
}
