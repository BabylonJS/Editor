import { Component, ReactNode } from "react";

import { AbstractMesh } from "babylonjs";
import { GridMaterial } from "babylonjs-materials";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorMaterialInspectorUtilsComponent } from "./utils";

export interface IEditorGridMaterialInspectorProps {
	mesh?: AbstractMesh;
	material: GridMaterial;
}

export class EditorGridMaterialInspector extends Component<IEditorGridMaterialInspectorProps> {
	public constructor(props: IEditorGridMaterialInspectorProps) {
		super(props);
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Material" label={this.props.material.getClassName()}>
					<EditorInspectorStringField label="Name" object={this.props.material} property="name" />
					<EditorInspectorSwitchField label="Back Face Culling" object={this.props.material} property="backFaceCulling" />

					<EditorMaterialInspectorUtilsComponent mesh={this.props.mesh} material={this.props.material} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Material Grid">
					<EditorInspectorVectorField object={this.props.material} property="gridOffset" label="Grid Offset" />
					<EditorInspectorNumberField object={this.props.material} property="gridRatio" label="Grid Ratio" min={0} max={10} />
					<EditorInspectorNumberField object={this.props.material} property="majorUnitFrequency" label="Major Unit Frequency" min={0} max={100} />
					<EditorInspectorNumberField object={this.props.material} property="minorUnitVisibility" label="Minor Unit Visibility" min={0} max={1} />
					<EditorInspectorNumberField object={this.props.material} property="gridVisibility" label="Grid Visibility" min={0} max={1} />
					<EditorInspectorNumberField object={this.props.material} property="opacity" label="Opacity" min={0} max={1} />
					<EditorInspectorSwitchField object={this.props.material} property="preMultiplyAlpha" label="Pre-multiply Alpha" />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Material Colors">
					<EditorInspectorColorField object={this.props.material} property="mainColor" label="Main Color" />
					<EditorInspectorColorField object={this.props.material} property="lineColor" label="Line Color" />
				</EditorInspectorSectionField>
			</>
		);
	}
}
