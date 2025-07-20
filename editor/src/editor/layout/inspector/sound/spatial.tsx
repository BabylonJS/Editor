import { Component, ReactNode } from "react";

import { Sound, ISoundOptions } from "babylonjs";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

export interface IEditorSpatialSoundInspectorComponentProps {
	sound: Sound;
}

export class EditorSpatialSoundInspectorComponent extends Component<IEditorSpatialSoundInspectorComponentProps> {
	public render(): ReactNode {
		return (
			<EditorInspectorSectionField title="Spatial">
				{this._getDistanceModelComponent()}

				{this.props.sound.distanceModel === "linear" ? this._getMaxDistanceComponent() : [this._getRollOffFactorComponent(), this._getRefDistanceComponent()]}

				{this._getPanningModelComponent()}
			</EditorInspectorSectionField>
		);
	}

	private _getDistanceModelComponent(): ReactNode {
		return (
			<EditorInspectorListField
				noUndoRedo
				label="Distance Model"
				object={this.props.sound}
				property="distanceModel"
				items={[
					{ text: "Linear", value: "linear" },
					{ text: "Inverse", value: "inverse" },
					{ text: "Exponential", value: "exponential" },
				]}
				onChange={(value, oldValue) => {
					this.forceUpdate();

					registerUndoRedo({
						executeRedo: true,
						undo: () => this._updateOptions({ distanceModel: oldValue }),
						redo: () => this._updateOptions({ distanceModel: value }),
					});
				}}
			/>
		);
	}

	private _getMaxDistanceComponent(): ReactNode {
		return (
			<EditorInspectorNumberField
				min={0}
				max={100000000}
				step={1}
				label="Max Distance"
				object={this.props.sound}
				property="maxDistance"
				onChange={(value) => this._updateOptions({ maxDistance: value })}
				onFinishChange={(value, oldValue) => {
					registerUndoRedo({
						executeRedo: true,
						undo: () => this._updateOptions({ maxDistance: oldValue }),
						redo: () => this._updateOptions({ maxDistance: value }),
					});
				}}
			/>
		);
	}

	private _getRollOffFactorComponent(): ReactNode {
		return (
			<EditorInspectorNumberField
				min={0}
				max={100000000}
				step={1}
				label="Rolloff Factor"
				object={this.props.sound}
				property="rolloffFactor"
				onChange={(value) => this._updateOptions({ rolloffFactor: value })}
				onFinishChange={(value, oldValue) => {
					registerUndoRedo({
						executeRedo: true,
						undo: () => this._updateOptions({ rolloffFactor: oldValue }),
						redo: () => this._updateOptions({ rolloffFactor: value }),
					});
				}}
			/>
		);
	}

	private _getRefDistanceComponent(): ReactNode {
		return (
			<EditorInspectorNumberField
				min={0}
				max={100000000}
				step={1}
				label="Ref Distance"
				object={this.props.sound}
				property="refDistance"
				onChange={(value) => this._updateOptions({ refDistance: value })}
				onFinishChange={(value, oldValue) => {
					registerUndoRedo({
						executeRedo: true,
						undo: () => this._updateOptions({ refDistance: oldValue }),
						redo: () => this._updateOptions({ refDistance: value }),
					});
				}}
			/>
		);
	}

	private _getPanningModelComponent(): ReactNode {
		return (
			<EditorInspectorListField
				noUndoRedo
				label="Panning Model"
				object={this.props.sound}
				property="_panningModel"
				items={[
					{ text: "Equal Power", value: "equalpower" },
					{ text: "HRTF", value: "HRTF" },
				]}
				onChange={(value, oldValue) => {
					registerUndoRedo({
						executeRedo: true,
						undo: () => (oldValue === "HRTF" ? this.props.sound.switchPanningModelToHRTF() : this.props.sound.switchPanningModelToEqualPower()),
						redo: () => (value === "HRTF" ? this.props.sound.switchPanningModelToHRTF() : this.props.sound.switchPanningModelToEqualPower()),
					});
				}}
			/>
		);
	}

	private _updateOptions(options: ISoundOptions): void {
		this.props.sound.updateOptions({
			maxDistance: this.props.sound.maxDistance,
			refDistance: this.props.sound.refDistance,
			rolloffFactor: this.props.sound.rolloffFactor,
			distanceModel: this.props.sound.distanceModel,
			...options,
		});
	}
}
