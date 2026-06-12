import { Matrix, Mesh, Quaternion, TransformNode, Tools, Vector3 } from "babylonjs";

import { UniqueNumber } from "../tools/tools";

import { assimpMatrixToBabylon } from "./convert";
import { AssimpJSRuntime, IAssimpJSNodeData } from "./types";

/**
 * Marker found in the names of the helper nodes that Assimp inserts when importing FBX files.
 * Assimp decomposes each FBX node's transform into a chain of `<name>_$AssimpFbx$_Translation`, `_PreRotation`,
 * `_Rotation`, `_Scaling`, etc. nodes that sit *between* the real nodes in the hierarchy. Those helper nodes carry the
 * bone offsets at bind time, but the animation channels are consolidated back onto the single real node (and contain
 * the full local transform). Keeping the helpers as separate nodes/bones would therefore apply their transforms twice
 * once an animation plays (the helper + the consolidated channel), collapsing limbs onto the body.
 *
 * To stay consistent between the bind pose and the animations, the helper nodes are collapsed into their owning real
 * node: the real node's local matrix becomes the product of its helper chain, and animations (which target the real
 * node) simply replace it.
 */
const AssimpFbxMarker = "$AssimpFbx$";

function isAssimpHelperNode(name: string): boolean {
	return name.includes(AssimpFbxMarker);
}

/**
 * Builds the Babylon.js node hierarchy from the Assimp node tree.
 *
 * This is the first pass of the import: every *real* Assimp node becomes either a `Mesh` (geometry is built later, once
 * the skeleton is available) or a `TransformNode`. The `$AssimpFbx$` helper nodes are collapsed into the next real
 * descendant (their transforms are accumulated into `pending`). The local transform of each node is converted to
 * Babylon.js' left-handed/column-major convention and the hierarchy is recorded so that skeletons and animations can be
 * resolved afterwards.
 * @param runtime defines the current import runtime.
 * @param nodes defines the Assimp nodes to parse at the current level.
 * @param parent defines the Babylon.js parent (real) node (or null at the root).
 * @param parentName defines the Assimp name of the parent (real) node (or null at the root).
 * @param pending defines the accumulated transform of the `$AssimpFbx$` helper nodes collapsed so far (identity by default).
 */
export function buildNodeGraph(
	runtime: AssimpJSRuntime,
	nodes: IAssimpJSNodeData[],
	parent: TransformNode | null,
	parentName: string | null,
	pending: Matrix = Matrix.Identity()
): void {
	nodes.forEach((data) => {
		const localMatrix = assimpMatrixToBabylon(data.transformation);

		// Helper node: accumulate its transform and keep walking without creating a Babylon node.
		if (isAssimpHelperNode(data.name)) {
			const accumulated = localMatrix.multiply(pending);
			if (data.children?.length) {
				buildNodeGraph(runtime, data.children, parent, parentName, accumulated);
			}
			return;
		}

		// Real node: its effective local transform includes the collapsed helper chain that led to it.
		const effectiveMatrix = localMatrix.multiply(pending);

		let node: TransformNode;

		if (data.meshes?.length) {
			const mesh = new Mesh(data.name, runtime.scene);
			mesh.receiveShadows = true;

			runtime.container.meshes.push(mesh);
			runtime.meshNodes.push({ mesh, data });

			node = mesh;
		} else {
			node = new TransformNode(data.name, runtime.scene);
			runtime.container.transformNodes.push(node);
		}

		node.id = Tools.RandomId();
		node.uniqueId = UniqueNumber.Get();

		// Apply the converted local transform.
		const position = Vector3.Zero();
		const rotation = Quaternion.Identity();
		const scaling = Vector3.One();
		effectiveMatrix.decompose(scaling, rotation, position);

		node.position.copyFrom(position);
		node.rotationQuaternion = rotation;
		node.scaling.copyFrom(scaling);

		node.parent = parent;

		runtime.nodes.set(data.name, { name: data.name, node, localMatrix: effectiveMatrix, parentName });
		runtime.orderedNodeNames.push(data.name);

		if (data.children?.length) {
			buildNodeGraph(runtime, data.children, node, data.name, Matrix.Identity());
		}
	});
}
