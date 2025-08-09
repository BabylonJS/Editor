import { Component, ReactNode } from "react";
import { StandardMaterial, PBRMaterial } from "babylonjs";
import { EditorInspectorListField } from "../../fields/list";

export interface IEditorTransparencyModeFieldProps {
	object: StandardMaterial | PBRMaterial;
	onChange?: () => void;
}

export class EditorTransparencyModeField extends Component<IEditorTransparencyModeFieldProps> {
	public constructor(props: IEditorTransparencyModeFieldProps) {
		super(props);
	}

	private getTransparencyModeItems() {
		const material = this.props.object;
		
		if (material instanceof PBRMaterial) {
			return [
				{ text: "None", value: null },
				{ text: "Opaque", value: PBRMaterial.MATERIAL_OPAQUE },
				{ text: "Alpha Test", value: PBRMaterial.MATERIAL_ALPHATEST },
				{ text: "Alpha Blend", value: PBRMaterial.MATERIAL_ALPHABLEND },
				{ text: "Alpha Test and Blend", value: PBRMaterial.MATERIAL_ALPHATESTANDBLEND },
			];
		} else if (material instanceof StandardMaterial) {
			return [
				{ text: "None", value: null },
				{ text: "Opaque", value: StandardMaterial.MATERIAL_OPAQUE },
				{ text: "Alpha Test", value: StandardMaterial.MATERIAL_ALPHATEST },
				{ text: "Alpha Blend", value: StandardMaterial.MATERIAL_ALPHABLEND },
				{ text: "Alpha Test and Blend", value: StandardMaterial.MATERIAL_ALPHATESTANDBLEND },
			];
		}
		
		return [];
	}

	public render(): ReactNode {
		return (
			<EditorInspectorListField
				label="Transparency Mode"
				object={this.props.object}
				property="transparencyMode"
				onChange={this.props.onChange}
				items={this.getTransparencyModeItems()}
			/>
		);
	}
}
