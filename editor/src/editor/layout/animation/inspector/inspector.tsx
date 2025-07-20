import { Component, ReactNode } from "react";

import { getAnimationTypeForObject } from "babylonjs-editor-tools";
import { Animation, Color3, Color4, IAnimationKey, Quaternion, Vector2, Vector3 } from "babylonjs";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorColorField } from "../../inspector/fields/color";
import { EditorInspectorNumberField } from "../../inspector/fields/number";
import { EditorInspectorVectorField } from "../../inspector/fields/vector";
import { EditorInspectorSwitchField } from "../../inspector/fields/switch";
import { EditorInspectorSectionField } from "../../inspector/fields/section";

import { EditorAnimation } from "../../animation";

export interface IEditorAnimationInspectorProps {
	animationEditor: EditorAnimation;
}

export interface IEditorAnimationInspectorState {
	key: IAnimationKey | null;
}

export class EditorAnimationInspector extends Component<IEditorAnimationInspectorProps, IEditorAnimationInspectorState> {
	public constructor(props: IEditorAnimationInspectorProps) {
		super(props);

		this.state = {
			key: null,
		};
	}

	public render(): ReactNode {
		return (
			<div
				className={`
                    absolute top-0 right-0 w-96 h-full p-2 bg-background border-l-primary-foreground border-l-4
                    ${this.state.key ? "translate-x-0" : "opacity-0 translate-x-full pointer-events-none"}
                    transition-all duration-150 ease-in-out
                `}
			>
				{this._getKeyInspector()}
			</div>
		);
	}

	/**
	 * Sets the rerefence to the key to edit.
	 * @param key defines the reference to the key to edit.
	 */
	public setEditedKey(key: IAnimationKey | null): void {
		if (key !== this.state.key) {
			this.setState({ key });
		}
	}

	private _getKeyInspector(): ReactNode {
		if (!this.state.key) {
			return null;
		}

		const animationType = getAnimationTypeForObject(this.state.key.value);

		return (
			<div className="flex flex-col gap-2 h-full">
				<div className="mx-auto font-semibold text-xl py-2">Key</div>

				<EditorInspectorSectionField title="Properties">
					<EditorInspectorNumberField
						object={this.state.key}
						property="frame"
						label="Frame"
						step={1}
						min={0}
						onChange={() => {
							this.props.animationEditor.timelines.forceUpdate();
							this.props.animationEditor.timelines.updateTracksAtCurrentTime();
						}}
					/>

					{animationType === Animation.ANIMATIONTYPE_FLOAT && (
						<EditorInspectorNumberField
							object={this.state.key}
							property="value"
							label="Value"
							onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()}
						/>
					)}

					{animationType === Animation.ANIMATIONTYPE_VECTOR3 && (
						<EditorInspectorVectorField
							object={this.state.key}
							property="value"
							label="Value"
							onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()}
						/>
					)}

					{(animationType === Animation.ANIMATIONTYPE_COLOR3 || animationType === Animation.ANIMATIONTYPE_COLOR4) && (
						<EditorInspectorColorField
							label={<div className="w-14">Value</div>}
							object={this.state.key}
							property="value"
							onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()}
						/>
					)}
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Tangents">
					<EditorInspectorSwitchField
						label="In Tangents"
						object={{ checked: (this.state.key.inTangent ?? null) !== null }}
						property="checked"
						noUndoRedo
						onChange={(v) => {
							registerSimpleUndoRedo({
								object: this.state.key,
								property: "inTangent",
								oldValue: this.state.key?.inTangent,
								newValue: v ? this._getTangentDefaultValue(this.state.key!) : undefined,
								executeRedo: true,
							});

							this.forceUpdate();
						}}
					/>

					{(this.state.key.inTangent ?? null) !== null && this._getTangentInspector(this.state.key, "inTangent")}

					<EditorInspectorSwitchField
						label="Out Tangents"
						object={{ checked: (this.state.key.outTangent ?? null) !== null }}
						property="checked"
						noUndoRedo
						onChange={(v) => {
							registerSimpleUndoRedo({
								object: this.state.key,
								property: "outTangent",
								oldValue: this.state.key?.outTangent,
								newValue: v ? this._getTangentDefaultValue(this.state.key!) : undefined,
								executeRedo: true,
							});

							this.forceUpdate();
						}}
					/>

					{(this.state.key.outTangent ?? null) !== null && this._getTangentInspector(this.state.key, "outTangent")}
				</EditorInspectorSectionField>
			</div>
		);
	}

	private _getTangentDefaultValue(key: IAnimationKey): number | Vector2 | Vector3 | Quaternion | Color3 | Color4 | null {
		const animationType = getAnimationTypeForObject(key.value);

		switch (animationType) {
			case Animation.ANIMATIONTYPE_FLOAT:
				return 0;
			case Animation.ANIMATIONTYPE_VECTOR2:
				return Vector2.Zero();
			case Animation.ANIMATIONTYPE_VECTOR3:
				return Vector3.Zero();
			case Animation.ANIMATIONTYPE_QUATERNION:
				return Quaternion.Zero();
			case Animation.ANIMATIONTYPE_COLOR3:
				return Color3.Black();
			case Animation.ANIMATIONTYPE_COLOR4:
				return Color3.Black().toColor4(0);
			default:
				return null;
		}
	}

	private _getTangentInspector(key: IAnimationKey, property: "inTangent" | "outTangent"): ReactNode {
		const animationType = getAnimationTypeForObject(key.value);

		switch (animationType) {
			case Animation.ANIMATIONTYPE_FLOAT:
				return <EditorInspectorNumberField object={key} property={property} onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()} />;
			case Animation.ANIMATIONTYPE_VECTOR3:
				return <EditorInspectorVectorField object={key} property={property} onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()} />;

			case Animation.ANIMATIONTYPE_COLOR3:
			case Animation.ANIMATIONTYPE_COLOR4:
				return (
					<EditorInspectorColorField
						object={key}
						property={property}
						noColorPicker
						noClamp
						onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()}
					/>
				);
			default:
				return null;
		}
	}
}
