import { join } from "path/posix";

import { Component, ReactNode } from "react";
import { LuRefreshCcw } from "react-icons/lu";

import { Sprite, Observer } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { isSprite } from "../../../../tools/guards/sprites";
import { getSpriteManagerNodeFromSprite } from "../../../../tools/sprite/tools";
import { computeSpritePreviewImagesFromDimensions } from "../../../../tools/sprite/image";
import { computeSpritePreviewImagesFromAtlasJson } from "../../../../tools/sprite/atlas-json";

import { SpriteManagerNode } from "../../../nodes/sprite-manager";

import { onGizmoNodeChangedObservable } from "../../preview/gizmo";

import { getProjectAssetsRootUrl } from "../../../../project/configuration";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorDimensionsField } from "../fields/dimensions";

import { IEditorInspectorImplementationProps } from "../inspector";

export class EditorSpriteInspector extends Component<IEditorInspectorImplementationProps<Sprite>> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isSprite(object);
	}

	private _spriteManagerNode: SpriteManagerNode | null = null;

	public constructor(props: IEditorInspectorImplementationProps<Sprite>) {
		super(props);

		this._spriteManagerNode = getSpriteManagerNodeFromSprite(this.props.object);
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Common">
					<EditorInspectorStringField label="Name" object={this.props.object} property="name" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Transforms">
					<EditorInspectorVectorField label="position" object={this.props.object} property="position" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Dimensions">
					<EditorInspectorDimensionsField object={this.props} property="object" label="Size" onFinishChange={() => this.forceUpdate()} />
					{this._spriteManagerNode?.atlasJson && (
						<Button variant="ghost" className="flex gap-2 items-center" onClick={() => this._resetDimensionsFromAtlasJson()}>
							<LuRefreshCcw className="w-4 h-4" /> Reset to source size
						</Button>
					)}
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Sprite">
					<EditorInspectorNumberField object={this.props.object} property="angle" label="Angle" asDegrees onFinishChange={() => this.forceUpdate()} />

					<EditorInspectorSwitchField object={this.props.object} property="invertU" label="Invert U" />
					<EditorInspectorSwitchField object={this.props.object} property="invertV" label="Invert V" />
					<EditorInspectorSwitchField object={this.props.object} property="isVisible" label="is Visible" />

					{this._spriteManagerNode?.atlasJson && (
						<EditorInspectorListField
							object={this.props.object}
							property="cellRef"
							label="Texture"
							items={Object.keys(this._spriteManagerNode.atlasJson.frames).map((frame) => ({
								text: frame,
								value: frame,
								icon: (
									<div className="flex justify-center items-center w-[24px] h-[24px]">
										<img src={this._spriteManagerNode!.atlasJson.frames[frame]["_preview"]} className="w-full h-full object-contain" />
									</div>
								),
							}))}
						/>
					)}

					{this._spriteManagerNode?.spritesheet && !this._spriteManagerNode.atlasJson && (
						<EditorInspectorListField
							object={this.props.object}
							property="cellIndex"
							label="Texture"
							items={this._spriteManagerNode._previews.map((f, index) => ({
								value: index,
								text: `Frame ${index}`,
								key: `${index}_${this._spriteManagerNode?.spriteManager?.cellWidth}_${this._spriteManagerNode?.spriteManager?.cellHeight}`,
								icon: (
									<div className="flex justify-center items-center w-[24px] h-[24px]">
										<img src={f} className="w-full h-full object-contain" />
									</div>
								),
							}))}
						/>
					)}
				</EditorInspectorSectionField>
			</>
		);
	}

	private _gizmoObserver: Observer<Sprite> | null = null;

	public async componentDidMount(): Promise<void> {
		this._gizmoObserver = onGizmoNodeChangedObservable.add((sprite) => {
			if (sprite === this.props.object) {
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
		if (this._spriteManagerNode?.spriteManager && this._spriteManagerNode?.spritesheet) {
			const imagePath = join(getProjectAssetsRootUrl()!, this._spriteManagerNode.spritesheet.name);

			if (this._spriteManagerNode.atlasJson) {
				await computeSpritePreviewImagesFromAtlasJson(this._spriteManagerNode.atlasJson, imagePath);
			} else if (!this._spriteManagerNode._previews.length) {
				this._spriteManagerNode._previews = await computeSpritePreviewImagesFromDimensions(
					imagePath,
					this._spriteManagerNode.spriteManager.cellWidth,
					this._spriteManagerNode.spriteManager.cellHeight
				);
			}

			this.forceUpdate();
		}
	}

	private _resetDimensionsFromAtlasJson(): void {
		if (!this._spriteManagerNode?.atlasJson) {
			return;
		}

		const sourceSize = this._spriteManagerNode.atlasJson.frames[this.props.object.cellRef].sourceSize;
		if (sourceSize) {
			this.props.object.width = sourceSize.w;
			this.props.object.height = sourceSize.h;
			this.forceUpdate();
		}
	}
}
