import { Bone, Matrix, Quaternion, TransformNode, Vector3 } from "babylonjs";

import { isBone } from "../tools/guards/nodes";

import { parseMesh } from "./mesh";
import { AssimpJSRuntime, IAssimpJSNodeData } from "./types";

export function parseNodes(runtime: AssimpJSRuntime, nodes: IAssimpJSNodeData[], parent: TransformNode | null): void {
	nodes.forEach((n) => {
		let node: TransformNode | null = null;

		if (n.meshes) {
			node = parseMesh(runtime, n);
		}

		if (!node) {
			node = new TransformNode(n.name, runtime.scene);
			runtime.container.transformNodes.push(node);

			// Search for bone
			for (const skeleton of runtime.container.skeletons) {
				const bone = skeleton.bones.find((b) => b.name === n.name);
				if (!bone) {
					continue;
				}

				bone.linkTransformNode(node);

				if (parent) {
					const parentBone = skeleton.bones.find((b) => b.name === parent.name);
					if (parentBone) {
						bone.setParent(parentBone);
					}
				}

				break;
			}
		}

		if (n.transformation) {
			parseNodeTransform(node, n.transformation);
		}

		if (!isBone(node)) {
			node.parent = parent;
		}

		if (n.children) {
			parseNodes(runtime, n.children, node);
		}
	});
}

export function parseNodeTransform(node: TransformNode | Bone, transformation: number[]): void {
	const position = Vector3.Zero();
	const rotation = Quaternion.Identity();
	const scaling = Vector3.Zero();

	const matrix = Matrix.FromArray(transformation);
	matrix.decompose(scaling, rotation, position);

	node.position = position;
	node.rotationQuaternion = rotation;
	node.scaling = scaling;
}
