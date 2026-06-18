import { Scene, Animation, AnimationGroup, Vector2, Vector3, Color3, Quaternion } from "babylonjs";

import { IMCPActionOptions } from "../action";
import { resolveNode, coerceValueForExistingProperty } from "../tools/resolve";

/**
 * Lists the scene's animation groups (imported clips + authored ones).
 */
export function listAnimationGroups(scene: Scene): any {
	return {
		groups: scene.animationGroups.map((group) => ({
			name: group.name,
			from: group.from,
			to: group.to,
			isPlaying: group.isPlaying,
			targetedAnimationCount: group.targetedAnimations.length,
		})),
	};
}

/**
 * Plays an animation group in the editor preview (e.g. to preview a character's idle clip).
 */
export function playAnimationGroup(scene: Scene, data: any, options: IMCPActionOptions): any {
	const group = scene.getAnimationGroupByName(data.name);

	if (!group) {
		throw new Error(`Animation group not found: ${data.name}`);
	}

	const loop = data.loop ?? true;

	if (data.from !== undefined || data.to !== undefined) {
		group.start(loop, data.speed, data.from ?? group.from, data.to ?? group.to);
	} else {
		group.play(loop);

		if (data.speed !== undefined) {
			group.speedRatio = data.speed;
		}
	}

	// Reflect the playing state in the scene's Animation Groups inspector.
	options.editor.layout.inspector.setEditedObject(scene);
	options.editor.layout.inspector.forceUpdate();

	return {
		playing: true,
		name: group.name,
	};
}

/**
 * Stops a playing animation group, or all groups when no name is provided.
 */
export function stopAnimationGroup(scene: Scene, data: any, options: IMCPActionOptions): any {
	if (data.name) {
		const group = scene.getAnimationGroupByName(data.name);

		if (!group) {
			throw new Error(`Animation group not found: ${data.name}`);
		}

		group.stop();
	} else {
		scene.animationGroups.forEach((group) => group.stop());
	}

	// Reflect the stopped state in the scene's Animation Groups inspector.
	options.editor.layout.inspector.setEditedObject(scene);
	options.editor.layout.inspector.forceUpdate();

	return {
		stopped: true,
	};
}

/**
 * Resolves the loop mode constant from the contract's "cycle"|"constant"|"relative" string.
 */
function resolveLoopMode(loopMode?: string): number {
	switch (loopMode) {
		case "constant":
			return Animation.ANIMATIONLOOPMODE_CONSTANT;
		case "relative":
			return Animation.ANIMATIONLOOPMODE_RELATIVE;
		case "cycle":
		default:
			return Animation.ANIMATIONLOOPMODE_CYCLE;
	}
}

/**
 * Walks the given dotted path on the target object and returns the resolved value, or
 * `undefined` if any segment along the path is null/undefined.
 */
function resolvePathValue(target: any, path: string): any {
	const parts = path.split(".");

	let current = target;
	for (const part of parts) {
		if (current === null || current === undefined) {
			return undefined;
		}
		current = current[part];
	}

	return current;
}

/**
 * Infers the Babylon `ANIMATIONTYPE_*` constant from the resolved current value at the target property,
 * falling back to the shape of the first key's value when the path cannot be resolved.
 */
function resolveDataType(currentValue: any, firstKeyValue: any): number {
	if (currentValue instanceof Vector2) {
		return Animation.ANIMATIONTYPE_VECTOR2;
	}
	if (currentValue instanceof Vector3) {
		return Animation.ANIMATIONTYPE_VECTOR3;
	}
	if (currentValue instanceof Color3) {
		return Animation.ANIMATIONTYPE_COLOR3;
	}
	if (currentValue instanceof Quaternion) {
		return Animation.ANIMATIONTYPE_QUATERNION;
	}
	if (typeof currentValue === "number") {
		return Animation.ANIMATIONTYPE_FLOAT;
	}

	// Fall back to the shape of the first key's value.
	if (typeof firstKeyValue === "number") {
		return Animation.ANIMATIONTYPE_FLOAT;
	}
	if (Array.isArray(firstKeyValue) && firstKeyValue.length === 3) {
		return Animation.ANIMATIONTYPE_VECTOR3;
	}

	throw new Error("Unable to infer the animation data type from the target property or the provided keys.");
}

/**
 * Coerces the given key value to match the resolved animation data type.
 */
function coerceKeyValue(value: any, currentValue: any, dataType: number): any {
	if (currentValue !== undefined) {
		return coerceValueForExistingProperty(currentValue, value);
	}

	if (Array.isArray(value)) {
		switch (dataType) {
			case Animation.ANIMATIONTYPE_VECTOR2:
				return new Vector2(value[0] ?? 0, value[1] ?? 0);
			case Animation.ANIMATIONTYPE_VECTOR3:
				return new Vector3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
			case Animation.ANIMATIONTYPE_COLOR3:
				return new Color3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
			case Animation.ANIMATIONTYPE_QUATERNION:
				return new Quaternion(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0, value[3] ?? 1);
		}
	}

	return value;
}

/**
 * Authors a keyframe `AnimationGroup` targeting a node property (e.g. a door opening animates `rotation.y`).
 * Builds a Babylon `Animation` from the provided keys, wraps it in a named `AnimationGroup` and adds it to the scene.
 */
export function createAnimation(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	const currentValue = resolvePathValue(node, data.targetProperty);
	const dataType = resolveDataType(currentValue, data.keys?.[0]?.value);

	const framesPerSecond = data.framesPerSecond ?? 60;
	const loopMode = resolveLoopMode(data.loopMode);

	const animation = new Animation(data.name, data.targetProperty, framesPerSecond, dataType, loopMode);

	animation.setKeys(
		(data.keys ?? []).map((key: any) => ({
			frame: key.frame,
			value: coerceKeyValue(key.value, currentValue, dataType),
		}))
	);

	// Dispose any existing group with the same name so re-authoring a clip replaces it.
	const existingGroup = scene.getAnimationGroupByName(data.name);
	existingGroup?.dispose();

	const group = new AnimationGroup(data.name, scene);
	group.addTargetedAnimation(animation, node);

	// The scene's Animation Groups inspector seeds its list from `scene.animationGroups` on mount, so
	// set the scene as the edited object to make the new group appear (a bare forceUpdate would not re-pull it).
	options.editor.layout.inspector.setEditedObject(scene);
	options.editor.layout.inspector.forceUpdate();

	return {
		name: group.name,
		from: group.from,
		to: group.to,
		targetedAnimationCount: group.targetedAnimations.length,
	};
}

/**
 * Removes an animation group from the scene (disposes it).
 */
export function deleteAnimationGroup(scene: Scene, data: any, options: IMCPActionOptions): any {
	const group = scene.getAnimationGroupByName(data.name);

	if (!group) {
		throw new Error(`Animation group not found: ${data.name}`);
	}

	group.dispose();

	// Re-seed the scene's Animation Groups inspector so the removed group disappears from the list.
	options.editor.layout.inspector.setEditedObject(scene);
	options.editor.layout.inspector.forceUpdate();

	return {
		deleted: true,
	};
}
