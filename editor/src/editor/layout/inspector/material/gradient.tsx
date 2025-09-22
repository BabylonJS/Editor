import { Component, ReactNode } from "react";

import { AbstractMesh } from "babylonjs";
import { GradientMaterial } from "babylonjs-materials";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorAlphaModeField } from "./components/alpha";
import { EditorMaterialInspectorUtilsComponent } from "./components/utils";

export interface IEditorGradientMaterialInspectorProps {
	mesh?: AbstractMesh;
	material: GradientMaterial;
}

export class EditorGradientMaterialInspector extends Component<IEditorGradientMaterialInspectorProps> {
	public constructor(props: IEditorGradientMaterialInspectorProps) {
		super(props);
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Material" label={this.props.material.getClassName()}>
					<EditorInspectorStringField label="Name" object={this.props.material} property="name" />
					<EditorInspectorSwitchField label="Back Face Culling" object={this.props.material} property="backFaceCulling" />

					<EditorAlphaModeField object={this.props.material} />

					<EditorMaterialInspectorUtilsComponent mesh={this.props.mesh} material={this.props.material} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Gradient">
					<EditorInspectorColorField label={<div className="w-14">Top</div>} object={this.props.material} property="topColor" />
					<EditorInspectorColorField label={<div className="w-14">Bottom</div>} object={this.props.material} property="bottomColor" />

					<EditorInspectorNumberField label="Top Color Alpha" object={this.props.material} property="topColorAlpha" min={0} max={1} />
					<EditorInspectorNumberField label="Bottom Color Alpha" object={this.props.material} property="bottomColorAlpha" min={0} max={1} />

					<EditorInspectorNumberField label="Scale" object={this.props.material} property="scale" min={-1} max={1} />
					<EditorInspectorNumberField label="Offset" object={this.props.material} property="offset" />
					<EditorInspectorNumberField label="Smoothness" object={this.props.material} property="smoothness" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Misc">
					<EditorInspectorSwitchField label="Disable Lighting" object={this.props.material} property="disableLighting" />
				</EditorInspectorSectionField>
			</>
		);
	}
}
