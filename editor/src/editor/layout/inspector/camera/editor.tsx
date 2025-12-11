import { Component, ReactNode } from "react";

import { isEditorCamera } from "../../../../tools/guards/nodes";

import { Button } from "../../../../ui/shadcn/ui/button";

import { EditorCamera } from "../../../nodes/camera";

import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { FocalLengthInspector } from "./utils/focal";

export class EditorCameraInspector extends Component<IEditorInspectorImplementationProps<EditorCamera>> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: any): boolean {
		return isEditorCamera(object);
	}

	public render(): ReactNode {
		return (
			<>
				<div className="text-center text-3xl">Editor Camera</div>

				<EditorInspectorSectionField title="Common">
					<EditorInspectorNumberField object={this.props.object} property="speed" label="Speed" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Fov">
					<EditorInspectorNumberField object={this.props.object} property="minZ" label="Min Z" min={0.01} />
					<EditorInspectorNumberField object={this.props.object} property="maxZ" label="Max Z" />

					<FocalLengthInspector camera={this.props.object} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Controls">
					<EditorInspectorNumberField
						object={this.props.object}
						property="panSensitivityMultiplier"
						label="Pan Sensitivity"
						min={0.1}
						max={50}
						step={0.5}
						tooltip="Controls how responsive the camera panning is. Higher values make panning more sensitive."
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Keys">
					<Button variant="secondary" onClick={() => this.props.editor.setState({ editPreferences: true })}>
						Configure in preferences...
					</Button>
				</EditorInspectorSectionField>
			</>
		);
	}
}
