import { Component, ReactNode } from "react";

import { ArcRotateCamera } from "babylonjs";

import { isArcRotateCamera } from "../../../../tools/guards/nodes";
import { onNodeModifiedObservable } from "../../../../tools/observables";

import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSectionField } from "../fields/section";

import { ScriptInspectorComponent } from "../script/script";

import { FocalLengthInspector } from "./utils/focal";

export class EditorArcRotateCameraInspector extends Component<IEditorInspectorImplementationProps<ArcRotateCamera>> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: any): boolean {
		return isArcRotateCamera(object);
	}

	public render(): ReactNode {
		return (
			<>
				<div className="text-center text-3xl">
					Arc-Rotate Camera
				</div>

				<EditorInspectorSectionField title="Common">
					<EditorInspectorStringField label="Name" object={this.props.object} property="name" onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Transforms">
					<EditorInspectorVectorField label={<div className="w-14">Target</div>} object={this.props.object} property="target" />
					<EditorInspectorNumberField object={this.props.object} property="alpha" label="Alpha" />
					<EditorInspectorNumberField object={this.props.object} property="beta" label="Beta" />
					<EditorInspectorNumberField object={this.props.object} property="radius" label="Radius" min={0} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Fov">
					<EditorInspectorNumberField object={this.props.object} property="minZ" label="Min Z" min={0.01} />
					<EditorInspectorNumberField object={this.props.object} property="maxZ" label="Max Z" />

					<FocalLengthInspector camera={this.props.object} />
				</EditorInspectorSectionField>

				<ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />
			</>
		);
	}
}
