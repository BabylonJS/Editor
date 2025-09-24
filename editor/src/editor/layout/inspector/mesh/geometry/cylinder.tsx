import { Mesh, CreateCylinderVertexData } from "babylonjs";

import { Editor } from "../../../../main";

import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

import { getProxy } from "./proxy";

export interface ICylinderMeshGeometryInspectorProps {
	object: Mesh;
	editor: Editor;
}

export function CylinderMeshGeometryInspector(props: ICylinderMeshGeometryInspectorProps) {
	const proxy = getProxy(props.object.metadata, () => {
		handleUpdateGeometry();
	});

	function handleUpdateGeometry() {
		props.object.geometry?.setAllVerticesData(
			CreateCylinderVertexData({
				height: props.object.metadata.height,
				diameterTop: props.object.metadata.diameterTop,
				diameterBottom: props.object.metadata.diameterBottom,
				subdivisions: props.object.metadata.subdivisions,
			}),
			false
		);

		props.object.refreshBoundingInfo({
			updatePositionsArray: true,
		});
	}

	return (
		<EditorInspectorSectionField title="Cylinder">
			<EditorInspectorNumberField object={proxy} property="height" label="Height" step={0.1} />
			<EditorInspectorNumberField object={proxy} property="diameterTop" label="Diameter Top" step={0.1} />
			<EditorInspectorNumberField object={proxy} property="diameterBottom" label="Diameter Bottom" step={0.1} />
			<EditorInspectorNumberField object={proxy} property="subdivisions" label="Subdivisions" step={1} min={2} max={256} />
		</EditorInspectorSectionField>
	);
}
