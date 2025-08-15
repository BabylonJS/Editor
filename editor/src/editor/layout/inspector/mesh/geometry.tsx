import { Mesh } from "babylonjs";

import { Editor } from "../../../main";

import { BoxMeshGeometryInspector } from "./geometry/box";
import { GroundMeshGeometryInspector } from "./geometry/ground";
import { SphereMeshGeometryInspector } from "./geometry/sphere";

export interface IMeshGeometryInspectorProps {
	object: Mesh;
	editor: Editor;
}

export function MeshGeometryInspector(props: IMeshGeometryInspectorProps) {
	if (props.object.metadata?.type === "Box") {
		return <BoxMeshGeometryInspector {...props} />;
	}

	if (props.object.metadata?.type === "Sphere") {
		return <SphereMeshGeometryInspector {...props} />;
	}

	if (props.object.metadata?.type === "Ground") {
		return <GroundMeshGeometryInspector {...props} />;
	}

	return null;
}
