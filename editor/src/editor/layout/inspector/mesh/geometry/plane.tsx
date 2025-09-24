import { Mesh, CreatePlaneVertexData } from "babylonjs";

import { Editor } from "../../../../main";

import { EditorInspectorListField } from "../../fields/list";
import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

import { getProxy } from "./proxy";

export interface IPlaneMeshGeometryInspectorProps {
	object: Mesh;
	editor: Editor;
}

export function PlaneMeshGeometryInspector(props: IPlaneMeshGeometryInspectorProps) {
	const proxy = getProxy(props.object.metadata, () => {
		handleUpdateGeometry();
	});

	function handleUpdateGeometry() {
		props.object.geometry?.setAllVerticesData(
			CreatePlaneVertexData({
				size: props.object.metadata.size,
				sideOrientation: props.object.metadata.sideOrientation,
			}),
			false
		);

		props.object.refreshBoundingInfo({
			updatePositionsArray: true,
		});
	}

	return (
		<EditorInspectorSectionField title="Plane">
			<EditorInspectorNumberField object={proxy} property="size" label="Size" step={0.1} />
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
