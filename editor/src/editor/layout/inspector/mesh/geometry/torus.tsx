import { Mesh, CreateTorusVertexData } from "babylonjs";

import { Editor } from "../../../../main";

import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

import { getProxy } from "./proxy";

export interface ITorusMeshGeometryInspectorProps {
	object: Mesh;
	editor: Editor;
}

export function TorusMeshGeometryInspector(props: ITorusMeshGeometryInspectorProps) {
	const proxy = getProxy(props.object.metadata, () => {
		handleUpdateGeometry();
	});

	function handleUpdateGeometry() {
		props.object.geometry?.setAllVerticesData(
			CreateTorusVertexData({
				diameter: props.object.metadata.diameter,
				thickness: props.object.metadata.thickness,
				tessellation: props.object.metadata.tessellation,
			}),
			false
		);

		props.object.refreshBoundingInfo({
			updatePositionsArray: true,
		});
	}

	return (
		<EditorInspectorSectionField title="Torus">
			<EditorInspectorNumberField object={proxy} property="diameter" label="Diameter" step={0.1} min={0} />
			<EditorInspectorNumberField object={proxy} property="thickness" label="Thickness" step={0.1} min={1} />
			<EditorInspectorNumberField object={proxy} property="tessellation" label="Tessellation" step={1} min={2} max={256} />
		</EditorInspectorSectionField>
	);
}
