import { Vec3 } from "@babylonjs/lite";

import { parseAxis } from "./vector";

/**
 * Defines the properties of a bone of a ragdoll, same as Babylon.js `RagdollBoneProperties`.
 * Babylon Lite has no ragdoll: the configurations made in the editor can be loaded and parsed but no ragdoll can be
 * created from them.
 */
export interface IRagdollBoneProperties {
	rotationAxis?: Vec3;
	joint?: number;
	min?: number;
	max?: number;
	boxOffset?: number;
	boneOffsetAxis?: Vec3;
	size?: number;
	width?: number;
	height?: number;
	depth?: number;
}

export interface IRagDollConfiguration {
	assetRelativePath?: string;

	rootNodeId: string;
	skeletonName?: string;

	scalingFactor: number;

	runtimeConfiguration: IRagdollRuntimeConfiguration[];
}

export interface IRagdollRuntimeConfiguration extends IRagdollBoneProperties {
	name: string;
	bones: string[];

	/**
	 * Defines the mass of the physics body created for each bone.
	 */
	mass?: number;
	/**
	 * Defines the restitution of the physics body created for each bone.
	 */
	restitution?: number;
}

export function parseRagdollConfiguration(configuration: IRagDollConfiguration): IRagDollConfiguration {
	configuration.runtimeConfiguration.forEach((config) => {
		if (config.rotationAxis) {
			config.rotationAxis = parseAxis(config.rotationAxis as any);
		}

		if (config.boneOffsetAxis) {
			config.boneOffsetAxis = parseAxis(config.boneOffsetAxis as any);
		}
	});

	return configuration;
}

export function copyAndParseRagdollConfiguration(configuration: IRagDollConfiguration): IRagDollConfiguration {
	const copy: IRagDollConfiguration = {
		rootNodeId: configuration.rootNodeId,
		skeletonName: configuration.skeletonName,
		scalingFactor: configuration.scalingFactor,
		runtimeConfiguration: configuration.runtimeConfiguration.map((config) => ({
			name: config.name,
			bones: config.bones,
			width: config.width,
			depth: config.depth,
			height: config.height,
			size: config.size,
			joint: config.joint,
			min: config.min,
			max: config.max,
			mass: config.mass ?? 1,
			boxOffset: config.boxOffset,
			restitution: config.restitution ?? 0,
			rotationAxis: (config.rotationAxis as any)?.slice(),
			boneOffsetAxis: (config.boneOffsetAxis as any)?.slice(),
		})),
	};

	return parseRagdollConfiguration(copy);
}
