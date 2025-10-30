import { Animation, AssetContainer, Bone, IAnimationKey, Quaternion, TransformNode, Vector3 } from "babylonjs";

import { AssimpJSRuntime } from "./types";

export function parseAnimations(runtime: AssimpJSRuntime): void {
	runtime.data.animations?.forEach((animationData) => {
		animationData.channels.forEach((channelData) => {
			const node = getNodeFromContainerByName(runtime.container, channelData.name);
			if (!node) {
				return;
			}

			// Position
			if (channelData.positionkeys?.length) {
				const animation = new Animation(
					`${animationData.name}-${channelData.name}-position`,
					"position",
					animationData.tickspersecond,
					Animation.ANIMATIONTYPE_VECTOR3,
					Animation.ANIMATIONLOOPMODE_CYCLE
				);
				const keys = new Array<IAnimationKey>(channelData.positionkeys.length);

				channelData.positionkeys.forEach((key, keyIndex) => {
					keys[keyIndex] = {
						frame: key[0],
						value: Vector3.FromArray(key[1]),
					};
				});

				animation.setKeys(keys);

				node.animations.push(animation);
			}

			// Rotation
			if (channelData.rotationkeys?.length) {
				const animation = new Animation(
					`${animationData.name}-${channelData.name}-rotation`,
					"rotationQuaternion",
					animationData.tickspersecond,
					Animation.ANIMATIONTYPE_QUATERNION,
					Animation.ANIMATIONLOOPMODE_CYCLE
				);
				const keys = new Array<IAnimationKey>(channelData.rotationkeys.length);

				channelData.rotationkeys.forEach((key, keyIndex) => {
					keys[keyIndex] = {
						frame: key[0],
						value: key[1].length < 4 ? Vector3.FromArray(key[1]).toQuaternion() : Quaternion.FromArray(key[1]),
					};
				});

				animation.setKeys(keys);

				node.animations.push(animation);
			}

			// Scaling
			if (channelData.scalingkeys?.length) {
				const animation = new Animation(
					`${animationData.name}-${channelData.name}-scaling`,
					"scaling",
					animationData.tickspersecond,
					Animation.ANIMATIONTYPE_VECTOR3,
					Animation.ANIMATIONLOOPMODE_CYCLE
				);
				const keys = new Array<IAnimationKey>(channelData.scalingkeys.length);

				channelData.scalingkeys.forEach((key, keyIndex) => {
					keys[keyIndex] = {
						frame: key[0],
						value: Vector3.FromArray(key[1]),
					};
				});

				animation.setKeys(keys);

				node.animations.push(animation);
			}

			runtime.scene.beginAnimation(node, 0, animationData.duration, true, 1.0);
		});
	});
}

function getNodeFromContainerByName(container: AssetContainer, name: string): TransformNode | Bone | null {
	const transformNode = container.transformNodes.find((t) => t.name === name);
	if (transformNode) {
		return transformNode;
	}

	const mesh = container.meshes.find((m) => m.name === name);
	if (mesh) {
		return mesh;
	}

	for (const skeleton of container.skeletons) {
		const bone = skeleton.bones.find((b) => b.name === name);
		if (bone) {
			return bone;
		}
	}

	return null;
}
