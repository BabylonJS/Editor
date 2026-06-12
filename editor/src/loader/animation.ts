import { Animation, AnimationGroup, IAnimationKey, TransformNode } from "babylonjs";

import { convertPositionKey, convertRotationKey, convertScalingKey } from "./convert";
import { AssimpJSRuntime, IAssimpJSAnimationChannelData } from "./types";

/**
 * Parses the animations of the file into Babylon.js `AnimationGroup`s.
 *
 * Each Assimp animation becomes one `AnimationGroup`. Every channel targets a node by name and animates its
 * `position`, `rotationQuaternion` and `scaling`. Because bones are linked to their transform nodes (see
 * `skeleton.ts`), animating the transform nodes drives the skeleton as well — so skinned and non-skinned animations
 * are handled the exact same way, and a node animation does not require the file to have a skeleton at all.
 *
 * Key times are expressed in Assimp ticks, which map directly to Babylon frames; setting the animation frame rate to
 * `tickspersecond` plays the animation back at the correct real-time speed.
 * @param runtime defines the current import runtime.
 */
export function parseAnimations(runtime: AssimpJSRuntime): void {
	runtime.data.animations?.forEach((animationData) => {
		const group = new AnimationGroup(animationData.name || "animation", runtime.scene);

		const fps = animationData.tickspersecond || 30;

		let from = Number.POSITIVE_INFINITY;
		let to = Number.NEGATIVE_INFINITY;

		animationData.channels.forEach((channelData) => {
			const node = runtime.nodes.get(channelData.name)?.node;
			if (!node) {
				return;
			}

			const range = addChannelAnimations(group, node, channelData, fps);
			if (range) {
				from = Math.min(from, range.from);
				to = Math.max(to, range.to);
			}
		});

		if (!group.targetedAnimations.length) {
			group.dispose();
			return;
		}

		// Normalize so the whole group shares the same playable range.
		if (!Number.isFinite(from)) {
			from = 0;
		}
		to = Math.max(to, animationData.duration || from);
		group.normalize(from, to);

		runtime.container.animationGroups.push(group);
	});
}

/**
 * Creates the position/rotation/scaling animations for a single channel and adds them to the animation group targeting
 * the given node. Returns the `[from, to]` frame range covered by the channel, or null if it has no keys.
 */
function addChannelAnimations(group: AnimationGroup, node: TransformNode, channelData: IAssimpJSAnimationChannelData, fps: number): { from: number; to: number } | null {
	let from = Number.POSITIVE_INFINITY;
	let to = Number.NEGATIVE_INFINITY;
	let hasKeys = false;

	const track = (frame: number): void => {
		from = Math.min(from, frame);
		to = Math.max(to, frame);
		hasKeys = true;
	};

	// Position
	if (channelData.positionkeys?.length) {
		const animation = new Animation(`${node.name}.position`, "position", fps, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);

		const keys = channelData.positionkeys.map<IAnimationKey>((key) => {
			track(key[0]);
			return { frame: key[0], value: convertPositionKey(key[1]) };
		});

		animation.setKeys(keys);
		group.addTargetedAnimation(animation, node);
	}

	// Rotation
	if (channelData.rotationkeys?.length) {
		const animation = new Animation(`${node.name}.rotationQuaternion`, "rotationQuaternion", fps, Animation.ANIMATIONTYPE_QUATERNION, Animation.ANIMATIONLOOPMODE_CYCLE);

		const keys = channelData.rotationkeys.map<IAnimationKey>((key) => {
			track(key[0]);
			return { frame: key[0], value: convertRotationKey(key[1]) };
		});

		animation.setKeys(keys);
		group.addTargetedAnimation(animation, node);
	}

	// Scaling
	if (channelData.scalingkeys?.length) {
		const animation = new Animation(`${node.name}.scaling`, "scaling", fps, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);

		const keys = channelData.scalingkeys.map<IAnimationKey>((key) => {
			track(key[0]);
			return { frame: key[0], value: convertScalingKey(key[1]) };
		});

		animation.setKeys(keys);
		group.addTargetedAnimation(animation, node);
	}

	return hasKeys ? { from, to } : null;
}
