import { RagdollBoneProperties } from "@babylonjs/core/Physics/v2/ragdoll";

import { parseAxis } from "./vector";

export interface IRagDollConfiguration {
	assetRelativePath?: string;

	rootNodeId: string;
	skeletonName?: string;

	scalingFactor: number;

	runtimeConfiguration: IRagdollRuntimeConfiguration[];
}

export interface IRagdollRuntimeConfiguration extends RagdollBoneProperties {
	name: string;
	bones: string[];
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
			boxOffset: config.boxOffset,
			rotationAxis: (config.rotationAxis as any)?.slice(),
			boneOffsetAxis: (config.boneOffsetAxis as any)?.slice(),
		})),
	};

	return parseRagdollConfiguration(copy);
}
