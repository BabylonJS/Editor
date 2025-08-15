import { Mesh } from "babylonjs";

import { EditorInspectorListField } from "../../fields/list";
import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

export interface IBoxMeshGeometryInspectorProps {
	proxy: any;
}

export function BoxMeshGeometryInspector(props: IBoxMeshGeometryInspectorProps) {
	return (
		<EditorInspectorSectionField title="Box">
			<EditorInspectorNumberField object={props.proxy} property="width" label="Width" step={0.1} />
			<EditorInspectorNumberField object={props.proxy} property="height" label="Height" step={0.1} />
			<EditorInspectorNumberField object={props.proxy} property="depth" label="Depth" step={0.1} />
			<EditorInspectorListField
				object={props.proxy}
				property="sideOrientation"
				label="Side Orientation"
				items={[
					{ text: "Front", value: Mesh.FRONTSIDE },
					{ text: "Back", value: Mesh.BACKSIDE },
				]}
			/>
		</EditorInspectorSectionField>
	);
}
