import { Component, ReactNode } from "react";

import { ClusteredLightContainer } from "babylonjs";

import { isClusteredLightContainer } from "../../../../tools/guards/nodes";

import { EditorInspectorSectionField } from "../fields/section";

import { IEditorInspectorImplementationProps } from "../inspector";
import { EditorInspectorNumberField } from "../fields/number";

export class EditorClusteredLightContainerInspector extends Component<IEditorInspectorImplementationProps<ClusteredLightContainer>> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isClusteredLightContainer(object);
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Clustered Light Container">
					<EditorInspectorNumberField label="Horizontal Tiles" object={this.props.object} property="horizontalTiles" min={1} max={128} step={1} />
					<EditorInspectorNumberField label="Vertical Tiles" object={this.props.object} property="verticalTiles" min={1} max={128} step={1} />
					<EditorInspectorNumberField label="Depth Slices" object={this.props.object} property="depthSlices" min={1} max={128} step={1} />
					<EditorInspectorNumberField label="Max Range" object={this.props.object} property="maxRange" min={1} max={30_000} step={1} />
				</EditorInspectorSectionField>
			</>
		);
	}
}
