import { Mesh } from "babylonjs";

import { Editor } from "../../../main";

import { BoxMeshGeometryInspector } from "./geometry/box";
import { PlaneMeshGeometryInspector } from "./geometry/plane";
import { TorusMeshGeometryInspector } from "./geometry/torus";
import { GroundMeshGeometryInspector } from "./geometry/ground";
import { SphereMeshGeometryInspector } from "./geometry/sphere";
import { CapsuleMeshGeometryInspector } from "./geometry/capsule";
import { CylinderMeshGeometryInspector } from "./geometry/cylinder";
import { TorusKnotMeshGeometryInspector } from "./geometry/torus-knot";

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

	if (props.object.metadata?.type === "Plane") {
		return <PlaneMeshGeometryInspector {...props} />;
	}

	if (props.object.metadata?.type === "Capsule") {
		return <CapsuleMeshGeometryInspector {...props} />;
	}

	if (props.object.metadata?.type === "Cylinder") {
		return <CylinderMeshGeometryInspector {...props} />;
	}

	if (props.object.metadata?.type === "Torus") {
		return <TorusMeshGeometryInspector {...props} />;
	}

	if (props.object.metadata?.type === "TorusKnot") {
		return <TorusKnotMeshGeometryInspector {...props} />;
	}

	return null;
}
