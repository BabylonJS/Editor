import { Component, ReactNode } from "react";

import { AbstractMesh, Node, Observer, TransformNode } from "babylonjs";

import { isTransformNode } from "../../../tools/guards/nodes";
import { isSceneLinkNode } from "../../../tools/guards/scene";
import { onNodeModifiedObservable } from "../../../tools/observables";

import { EditorInspectorStringField } from "./fields/string";
import { EditorInspectorVectorField } from "./fields/vector";
import { EditorInspectorSectionField } from "./fields/section";

import { ScriptInspectorComponent } from "./script/script";
import { CustomMetadataInspector } from "./metadata/custom-metadata";

import { onGizmoNodeChangedObservable } from "../preview/gizmo";

import { IEditorInspectorImplementationProps } from "./inspector";
import { EditorInspectorSwitchField } from "./fields/switch";

export class EditorTransformNodeInspector extends Component<IEditorInspectorImplementationProps<AbstractMesh>> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isTransformNode(object) || isSceneLinkNode(object);
	}

	public constructor(props: IEditorInspectorImplementationProps<AbstractMesh>) {
		super(props);

		props.object.metadata ??= {};
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
					<EditorInspectorVectorField label={<div className="w-14">Scaling</div>} object={this.props.object} property="scaling" />

					<EditorInspectorSwitchField
						object={this.props.object.metadata}
						property="isStaticGroup"
						label="Is Static Group"
						tooltip={
							<>
								When checked, all descendants will be considered as static and their transforms will be frozen by default at runtime.
								<br />
								This is useful for optimization purposes when you know that a group of objects will not move during the game.
							</>
						}
					/>
				</EditorInspectorSectionField>

				<ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

				<CustomMetadataInspector object={this.props.object} />
			</>
		);
	}

	private _gizmoObserver: Observer<Node> | null = null;

	public componentDidMount(): void {
		this._gizmoObserver = onGizmoNodeChangedObservable.add((node) => {
			if (node === this.props.object) {
				this.props.editor.layout.inspector.forceUpdate();
			}
		});
	}

	public componentWillUnmount(): void {
		if (this._gizmoObserver) {
			onGizmoNodeChangedObservable.remove(this._gizmoObserver);
		}
	}

	public static GetRotationInspector(object: TransformNode, onFinishChange?: () => void): ReactNode {
		if (object.rotationQuaternion) {
			const valueRef = object.rotationQuaternion.toEulerAngles();

			const proxy = new Proxy(valueRef, {
				get(target, prop) {
					return target[prop];
				},
				set(obj, prop, value) {
					obj[prop] = value;
					object.rotationQuaternion?.copyFrom(obj.toQuaternion());

					return true;
				},
			});

			const o = { proxy };

			return (
				<EditorInspectorVectorField
					label={<div className="w-14">Rotation</div>}
					object={o}
					property="proxy"
					asDegrees
					step={0.1}
					onFinishChange={() => onFinishChange?.()}
				/>
			);
		}

		return (
			<EditorInspectorVectorField
				label={<div className="w-14">Rotation</div>}
				object={object}
				property="rotation"
				asDegrees
				step={0.1}
				onFinishChange={() => onFinishChange?.()}
			/>
		);
	}
}
