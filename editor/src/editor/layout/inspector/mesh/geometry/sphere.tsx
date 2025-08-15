import { Mesh, CreateSphereVertexData } from "babylonjs";

import { Editor } from "../../../../main";

import { EditorInspectorListField } from "../../fields/list";
import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

import { getProxy } from "./proxy";

export interface ISphereMeshGeometryInspectorProps {
	object: Mesh;
	editor: Editor;
}

export function SphereMeshGeometryInspector(props: ISphereMeshGeometryInspectorProps) {
	const proxy = getProxy(props.object.metadata, () => {
		handleUpdateGeometry();
	});

	function handleUpdateGeometry() {
		props.object.geometry?.setAllVerticesData(
			CreateSphereVertexData({
				diameter: props.object.metadata.diameter,
				segments: props.object.metadata.segments,
				sideOrientation: props.object.metadata.sideOrientation,
			}),
			false
		);

		props.object.refreshBoundingInfo({
			updatePositionsArray: true,
		});
	}

	return (
		<EditorInspectorSectionField title="Sphere">
			<EditorInspectorNumberField object={proxy} property="diameter" label="Diameter" step={0.1} min={0.01} />
			<EditorInspectorNumberField object={proxy} property="segments" label="Segments" step={0.1} min={2} />
			<EditorInspectorListField
				object={proxy}
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
