import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Animation, Color3, Color4, IAnimationKey, Quaternion, Tools as BabylonTools, Vector2, Vector3 } from "babylonjs";

import { InspectorColor } from "../../../editor/gui/inspector/fields/color";
import { InspectorNumber } from "../../../editor/gui/inspector/fields/number";
import { InspectorVector2 } from "../../../editor/gui/inspector/fields/vector2";
import { InspectorVector3 } from "../../../editor/gui/inspector/fields/vector3";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";
import { InspectorBoolean } from "../../../editor/gui/inspector/fields/boolean";

import { Tools } from "../../../editor/tools/tools";

import { CinematicTrackType, ICinematicPropertyGroupTrack, ICinematicPropertyTrack } from "../../../editor/cinematic/track";

import { Inspector, IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/components/inspectors/abstract-inspector";

import { Key } from "../editor/track/key";

export class CinematicAimationKey {
	/**
	 * Defines the id of the cinematic animation key object.
	 */
	public id: string = Tools.RandomId();

	/**
	 * Constructor.
	 */
	public constructor(public key: Key) {
		// Empty for now...
	}
}

export interface ICinematicAnimationKeyInspectorState {
	// Nothing for now...
}

export class CinematicAnimationKeyInspector extends AbstractInspector<CinematicAimationKey, ICinematicAnimationKeyInspectorState> {
	private _quaternionVector: Vector3 = Vector3.Zero();

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IObjectInspectorProps) {
		super(props);

		this.state = {
			...this.state,
		};
	}

	/**
	 * Renders the content of the inspector.
	 */
	public renderContent(): React.ReactNode {
		return (
			<InspectorSection title="Animation Key">
				<InspectorNumber key={Tools.RandomId()} object={this.selectedObject.key.props.animationKey} property="frame" label="Frame" min={0} step={1} onChange={() => this._handleFrameChange()} onFinishChange={() => this._handleFrameChanged()} />
				{this._getValueInspector()}

				<InspectorSection title="Tangents">
					{this._getTangentsInspector()}
				</InspectorSection>
			</InspectorSection>
		);
	}

	private _getTangentsInspector(): React.ReactNode {
		const track = this.selectedObject.key.props.track;

		return (
			<>
				{this._getTangentInspectorFor(track.animationType, this.selectedObject.key.props.animationKey, "inTangent")}
				{this._getTangentInspectorFor(track.animationType, this.selectedObject.key.props.animationKey, "outTangent")}
			</>
		)
	}

	private _getTangentInspectorFor(animationType: number, key: IAnimationKey, property: "inTangent" | "outTangent"): React.ReactNode {
		const o = { hasTangents: (key[property] ?? null) !== null };

		const checkBox = (
			<InspectorBoolean key={Tools.RandomId()} object={o} property="hasTangents" label="Use Tangents" onChange={(v) => {
				if (v) {
					switch (animationType) {
						case Animation.ANIMATIONTYPE_FLOAT: key[property] = 0; break;
						case Animation.ANIMATIONTYPE_VECTOR2: key[property] = new Vector2(0, 0); break;
						case Animation.ANIMATIONTYPE_VECTOR3: key[property] = new Vector3(0, 0, 0); break;
						case Animation.ANIMATIONTYPE_QUATERNION: key[property] = new Quaternion(0, 0, 0, 0); break;
						case Animation.ANIMATIONTYPE_COLOR3: key[property] = new Color3(0, 0, 0); break;
						case Animation.ANIMATIONTYPE_COLOR4: key[property] = new Color4(0, 0, 0, 0); break;
					}
				} else {
					key[property] = undefined;
				}

				this.forceUpdate();
			}} />
		);

		if (!o.hasTangents) {
			return (
				<InspectorSection title={property}>
					{checkBox}
				</InspectorSection>
			);
		}

		let tangentField: Nullable<React.ReactNode> = null;
		switch (animationType) {
			case Animation.ANIMATIONTYPE_FLOAT: tangentField = <InspectorNumber key={Tools.RandomId()} object={key} property={property} label="Value" />; break;
			case Animation.ANIMATIONTYPE_VECTOR2: tangentField = <InspectorVector2 key={Tools.RandomId()} object={key} property={property} label="Value" />; break;
			case Animation.ANIMATIONTYPE_VECTOR3: tangentField = <InspectorVector3 key={Tools.RandomId()} object={key} property={property} label="Value" />; break;

			case Animation.ANIMATIONTYPE_COLOR3:
			case Animation.ANIMATIONTYPE_COLOR4:
				tangentField = <InspectorColor key={Tools.RandomId()} object={key} property={property} label="Value" />;
				break;

			case Animation.ANIMATIONTYPE_QUATERNION:
				tangentField = (
					<>
						<InspectorVector3 key={Tools.RandomId()} object={key} property={property} label="Value" />
						<InspectorNumber key={Tools.RandomId()} object={key[property]} property="w" label="W" />
					</>
				);
				break;
		}

		return (
			<InspectorSection title={property}>
				{checkBox}
				{tangentField}
			</InspectorSection>
		);
	}

	/**
	 * Called on the animation frame changes.
	 */
	private _handleFrameChange(): void {
		this.selectedObject.key.setState({ position: this.selectedObject.key.props.animationKey.frame });
	}

	/**
	 * Called on the frame finished change.
	 */
	private _handleFrameChanged(): void {
		this.selectedObject.key.props.track.keys.sort((a, b) => a.frame - b.frame);
		this.selectedObject.key.props.timeline.forceUpdate();
	}

	/**
	 * Returns the inspector used to 
	 */
	private _getValueInspector(): React.ReactNode {
		const animationKey = this.selectedObject.key.props.animationKey;

		switch (this.selectedObject.key.props.track.animationType) {
			case Animation.ANIMATIONTYPE_FLOAT:
				return <InspectorNumber key={Tools.RandomId()} object={animationKey} property="value" label="Value" step={0.01} onChange={() => this._handleValueChange()} />;

			case Animation.ANIMATIONTYPE_VECTOR2:
				return <InspectorVector2 key={Tools.RandomId()} object={animationKey} property="value" label="Vector" step={0.01} onChange={() => this._handleValueChange()} />;
			case Animation.ANIMATIONTYPE_VECTOR3:
				return <InspectorVector3 key={Tools.RandomId()} object={animationKey} property="value" label="Vector" step={0.01} onChange={() => this._handleValueChange()} />;

			case Animation.ANIMATIONTYPE_QUATERNION:
				const eulerAngles = animationKey.value.toEulerAngles();
				this._quaternionVector.set(BabylonTools.ToDegrees(eulerAngles.x), BabylonTools.ToDegrees(eulerAngles.y), BabylonTools.ToDegrees(eulerAngles.z));

				return <InspectorVector3 key={Tools.RandomId()} object={this} property="_quaternionVector" label="Quaternion" step={0.01} onChange={() => {
					animationKey.value.copyFrom(new Vector3(
						BabylonTools.ToRadians(this._quaternionVector.x),
						BabylonTools.ToRadians(this._quaternionVector.y),
						BabylonTools.ToRadians(this._quaternionVector.z),
					).toQuaternion());

					this._handleValueChange();
				}} />;

			default:
				return undefined;
		}
	}

	/**
	 * Called on the value change.
	 */
	private _handleValueChange(): void {
		const track = this.selectedObject.key.props.track;

		const nodes: string[] = [];
		switch (this.selectedObject.key.props.trackType) {
			case CinematicTrackType.Property:
				nodes.push((track as ICinematicPropertyTrack).nodeId);
				break;

			case CinematicTrackType.PropertyGroup:
				nodes.push(...(track as ICinematicPropertyGroupTrack).nodeIds);
				break;
		}

		nodes.forEach((n) => {
			const node = this.editor.scene!.getNodeById(n);
			if (!node) {
				return;
			}
	
			const property = track.propertyPath.split(".").pop()!;
			const effectiveProperty = Tools.GetEffectiveProperty<any>(node, track.propertyPath);
	
			const animationKey = this.selectedObject.key.props.animationKey;
	
			switch (track.animationType) {
				case Animation.ANIMATIONTYPE_FLOAT:
					effectiveProperty[property] = animationKey.value;
					break;
	
				case Animation.ANIMATIONTYPE_COLOR3:
				case Animation.ANIMATIONTYPE_COLOR4:
				case Animation.ANIMATIONTYPE_VECTOR2:
				case Animation.ANIMATIONTYPE_VECTOR3:
				case Animation.ANIMATIONTYPE_QUATERNION:
					effectiveProperty[property] = animationKey.value.clone();
					break;
			}
		});

		const timeline = this.selectedObject.key.props.timeline;
		timeline.props.timelines.timeTracker?.setPosition(this.selectedObject.key.props.animationKey.frame);
	}
}

Inspector.RegisterObjectInspector({
	ctor: CinematicAnimationKeyInspector,
	ctorNames: ["CinematicAimationKey"],
	title: "Animation Key",
});
