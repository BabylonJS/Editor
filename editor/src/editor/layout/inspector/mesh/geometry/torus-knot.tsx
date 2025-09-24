import { Mesh, CreateTorusKnotVertexData } from "babylonjs";

import { Editor } from "../../../../main";

import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

import { getProxy } from "./proxy";

export interface ITorusKnotMeshGeometryInspectorProps {
	object: Mesh;
	editor: Editor;
}

export function TorusKnotMeshGeometryInspector(props: ITorusKnotMeshGeometryInspectorProps) {
	const proxy = getProxy(props.object.metadata, () => {
		handleUpdateGeometry();
	});

	function handleUpdateGeometry() {
		props.object.geometry?.setAllVerticesData(
			CreateTorusKnotVertexData({
				radius: props.object.metadata.radius,
				tube: props.object.metadata.tube,
				radialSegments: props.object.metadata.radialSegments,
				tubularSegments: props.object.metadata.tubularSegments,
			}),
			false
		);

		props.object.refreshBoundingInfo({
			updatePositionsArray: true,
		});
	}

	return (
		<EditorInspectorSectionField title="Torus Knot">
			<EditorInspectorNumberField object={proxy} property="radius" label="Radius" step={0.1} min={0} />
			<EditorInspectorNumberField object={proxy} property="tube" label="Tube" step={0.1} min={1} />
			<EditorInspectorNumberField object={proxy} property="radialSegments" label="Radial Segments" step={1} min={2} max={256} />
			<EditorInspectorNumberField object={proxy} property="tubularSegments" label="Tubular Segments" step={1} min={2} max={256} />
		</EditorInspectorSectionField>
	);
}
