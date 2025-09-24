import { Mesh, CreateCapsuleVertexData } from "babylonjs";

import { Editor } from "../../../../main";

import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

import { getProxy } from "./proxy";

export interface ICapsuleMeshGeometryInspectorProps {
	object: Mesh;
	editor: Editor;
}

export function CapsuleMeshGeometryInspector(props: ICapsuleMeshGeometryInspectorProps) {
	const proxy = getProxy(props.object.metadata, () => {
		handleUpdateGeometry();
	});

	function handleUpdateGeometry() {
		props.object.geometry?.setAllVerticesData(
			CreateCapsuleVertexData({
				radius: props.object.metadata.radius,
				height: props.object.metadata.height,
				subdivisions: props.object.metadata.subdivisions,
				topCapSubdivisions: props.object.metadata.topCapSubdivisions,
				bottomCapSubdivisions: props.object.metadata.bottomCapSubdivisions,
			}),
			false
		);

		props.object.refreshBoundingInfo({
			updatePositionsArray: true,
		});
	}

	return (
		<EditorInspectorSectionField title="Capsule">
			<EditorInspectorNumberField object={proxy} property="radius" label="Radius" step={0.1} />
			<EditorInspectorNumberField object={proxy} property="height" label="Height" step={0.1} />
			<EditorInspectorNumberField object={proxy} property="subdivisions" label="Subdivisions" step={1} min={2} max={256} />
			<EditorInspectorNumberField object={proxy} property="topCapSubdivisions" label="Top Cap Subdivisions" step={1} min={2} max={256} />
			<EditorInspectorNumberField object={proxy} property="bottomCapSubdivisions" label="Bottom Cap Subdivisions" step={1} min={2} max={256} />
		</EditorInspectorSectionField>
	);
}
