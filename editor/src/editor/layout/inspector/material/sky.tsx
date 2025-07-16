import { Component, ReactNode } from "react";

import { AbstractMesh } from "babylonjs";
import { SkyMaterial } from "babylonjs-materials";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorMaterialInspectorUtilsComponent } from "./utils";

export interface IEditorSkyMaterialInspectorProps {
    mesh?: AbstractMesh;
    material: SkyMaterial;
}

export class EditorSkyMaterialInspector extends Component<IEditorSkyMaterialInspectorProps> {
	public constructor(props: IEditorSkyMaterialInspectorProps) {
		super(props);
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Material" label={this.props.material.getClassName()}>
					<EditorInspectorStringField label="Name" object={this.props.material} property="name" />
					<EditorInspectorSwitchField label="Back Face Culling" object={this.props.material} property="backFaceCulling" />

					<EditorMaterialInspectorUtilsComponent
						mesh={this.props.mesh}
						material={this.props.material}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Sky">
					<EditorInspectorNumberField object={this.props.material} property="inclination" label="Inclination" min={-0.6} max={0.6} />
					<EditorInspectorNumberField object={this.props.material} property="azimuth" label="azimuth" min={0} max={1} />
					<EditorInspectorNumberField object={this.props.material} property="luminance" label="Luminance" min={0.01} />
					<EditorInspectorNumberField object={this.props.material} property="turbidity" label="Turbidity" min={0} />
					<EditorInspectorNumberField object={this.props.material} property="rayleigh" label="Rayleigh" min={-0.22} />
					<EditorInspectorNumberField object={this.props.material} property="mieCoefficient" label="Mie Coefficient" min={-0.10} max={1} />
					<EditorInspectorNumberField object={this.props.material} property="mieDirectionalG" label="Mie Directional G" min={0} max={1} />
					<EditorInspectorSwitchField object={this.props.material} property="dithering" label="Dithering" />
				</EditorInspectorSectionField>
			</>
		);
	}
}
