import { FBXReaderNode } from "fbx-parser";
import { TransformNode, Tools, Vector3, Bone, Quaternion } from "babylonjs";

import { FBXUtils } from "../utils";

export interface IFBXTransformData {
	eulerOrder: string;

	inheritType?: number;

	scaling?: Vector3;

	preRotation?: Vector3;
	rotation?: Vector3;
	postRotation?: Vector3;

	translation?: Vector3;
}

export class FBXTransform {
	/**
	 * Parses the transformation data of the given model.
	 * @param model defines the reference to the model to parse its transformation data.
	 * @param node defines the reference to the Model FBX node.
	 */
	public static ParseTransform(model: TransformNode | Bone, node: FBXReaderNode): void {
		// Apply transforms
		const propertiesNode = node.node("Properties70");
		if (propertiesNode) {
			const transformData: IFBXTransformData = {
				eulerOrder: "ZYX",
			};

			const properties = propertiesNode.nodes("P");

			properties.forEach((p) => {
				const type = p.prop(0, "string");

				const x = p.prop(4, "number") ?? 0;
				const y = p.prop(5, "number") ?? 0;
				const z = p.prop(6, "number") ?? 0;

				switch (type) {
					case "RotationOrder":
						transformData.eulerOrder = p.prop(4, "string") ?? transformData.eulerOrder;
						break;

					case "InheritType":
						transformData.inheritType = p.prop(4, "number");
						break;

					case "Lcl Translation":
						transformData.translation = new Vector3(-x, y, z);
						break;

					case "PreRotation":
						transformData.preRotation = new Vector3(Tools.ToRadians(x), Tools.ToRadians(y), Tools.ToRadians(z));
						break;
					case "Lcl Rotation":
						transformData.rotation = new Vector3(Tools.ToRadians(x), Tools.ToRadians(y), Tools.ToRadians(z));
						break;
					case "PostRotation":
						transformData.postRotation = new Vector3(Tools.ToRadians(x), Tools.ToRadians(y), Tools.ToRadians(z));
						break;
					case "RotationOffset":
						// TODO.
						break;
					case "RotationPivot":
						// TODO.
						break;

					case "Lcl Scaling":
						transformData.scaling = new Vector3(x, y, z);
						break;
					case "ScalingOffset":
						// TODO.
						break;
					case "ScalingPivot":
						// TODO.
						break;
				}
			});

			model.metadata ??= {};
			model.metadata.transformData = transformData;
		}
	}

	/**
	 * Applies the transformation data of the given model.
	 * @param model defines the reference to the model to apply its transformation data.
	 */
	public static ApplyTransform(model: TransformNode | Bone): void {
		const transformData = model.metadata?.transformData as IFBXTransformData;
		if (!transformData) {
			return;
		}

		const scaling = transformData.scaling ?? model.scaling;
		const translation = transformData.translation ?? model.position;

		let finalRotation = Quaternion.Identity();
		
		if (transformData.rotation) {
			finalRotation = FBXUtils.GetFinalRotationQuaternionFromVector(transformData.rotation);
		}

		if (transformData.preRotation) {
			const pre = FBXUtils.GetFinalRotationQuaternionFromVector(transformData.preRotation);
			finalRotation = pre.multiply(finalRotation);
		}
		
		if (transformData.postRotation) {
			const post = FBXUtils.GetFinalRotationQuaternionFromVector(transformData.postRotation);
			finalRotation = finalRotation.multiply(Quaternion.Inverse(post));
		}

		// if (!model.parent) {
		// 	finalRotation = FBXUtils.GetFinalRotationQuaternion(finalRotation);
		// } else {
		// 	finalRotation.x = -finalRotation.x;
		// 	finalRotation.w = -finalRotation.w;
		// }

		// Set
		model.scaling = scaling;
		model.position = translation;
		model.rotationQuaternion = finalRotation;

		delete model.metadata.transformData;
	}

	/**
	 * Returns the transform data of the given model.
	 * @param model defines the reference to the model to get its transform data.
	 */
	public static GetTransformData(model: TransformNode | Bone): IFBXTransformData {
		const transformData = model.metadata?.transformData as IFBXTransformData;
		if (!transformData) {
			return {
				eulerOrder: "ZYX",
			};
		}

		return transformData;
	}
}
