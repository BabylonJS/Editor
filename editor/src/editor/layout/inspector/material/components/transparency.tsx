import { ReactNode } from "react";
import { EditorInspectorListField } from "../../fields/list";
import { Material, StandardMaterial, PBRMaterial } from "babylonjs";


export interface IEditorTransparencyModeFieldProps {
	object: StandardMaterial | PBRMaterial;
	onChange?: () => void;
}

export function EditorTransparencyModeField(props: IEditorTransparencyModeFieldProps): ReactNode {
	const getTransparencyModeItems = () => {
		return [
			{ text: "None", value: null },
			{ text: "Opaque", value: Material.MATERIAL_OPAQUE },
			{ text: "Alpha Test", value: Material.MATERIAL_ALPHATEST },
			{ text: "Alpha Blend", value: Material.MATERIAL_ALPHABLEND },
			{ text: "Alpha Test and Blend", value: Material.MATERIAL_ALPHATESTANDBLEND },
		];
	};

	return <EditorInspectorListField label="Transparency Mode" object={props.object} property="transparencyMode" onChange={props.onChange} items={getTransparencyModeItems()} />;
}
