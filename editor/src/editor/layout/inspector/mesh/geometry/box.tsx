import { Mesh, CreateBoxVertexData } from "babylonjs";

import { Editor } from "../../../../main";

import { EditorInspectorListField } from "../../fields/list";
import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";

import { getProxy } from "./proxy";

export interface IBoxMeshGeometryInspectorProps {
	object: Mesh;
	editor: Editor;
}

export function BoxMeshGeometryInspector(props: IBoxMeshGeometryInspectorProps) {
	const proxy = getProxy(props.object.metadata, () => {
		handleUpdateGeometry();
	});

	function handleUpdateGeometry() {
		props.object.geometry?.setAllVerticesData(
			CreateBoxVertexData({
				width: props.object.metadata.width,
				height: props.object.metadata.height,
				depth: props.object.metadata.depth,
				sideOrientation: props.object.metadata.sideOrientation,
			}),
			false
		);

		props.object.refreshBoundingInfo({
			updatePositionsArray: true,
		});
	}

	return (
		<EditorInspectorSectionField title="Box">
			<EditorInspectorNumberField object={proxy} property="width" label="Width" step={0.1} />
			<EditorInspectorNumberField object={proxy} property="height" label="Height" step={0.1} />
			<EditorInspectorNumberField object={proxy} property="depth" label="Depth" step={0.1} />
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
