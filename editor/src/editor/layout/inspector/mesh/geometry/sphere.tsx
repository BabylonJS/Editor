import { Mesh } from "babylonjs";

import { EditorInspectorListField } from "../../fields/list";
import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

export interface ISphereMeshGeometryInspectorProps {
	proxy: any;
}

export function SphereMeshGeometryInspector(props: ISphereMeshGeometryInspectorProps) {
	return (
		<EditorInspectorSectionField title="Sphere">
			<EditorInspectorNumberField object={props.proxy} property="diameter" label="Diameter" step={0.1} min={0.01} />
			<EditorInspectorNumberField object={props.proxy} property="segments" label="Segments" step={0.1} min={2} />
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
