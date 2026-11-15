import { Logger } from "@babylonjs/core/Misc/logger";
import { Skeleton } from "@babylonjs/core/Bones/skeleton";
import { Ragdoll, RagdollBoneProperties } from "@babylonjs/core/Physics/v2/ragdoll";
import { IPhysicsEnginePluginV2, PhysicsConstraintAxis, PhysicsConstraintAxisLimitMode, PhysicsConstraintType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";

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

	/**
	 * Defines the mass of the physics body created for each bone. Read by the ragdoll but missing from "RagdollBoneProperties".
	 */
	mass?: number;
	/**
	 * Defines the restitution of the physics body created for each bone. Read by the ragdoll but missing from "RagdollBoneProperties".
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

/**
 * Applies the limits ("min" and "max", in degrees) of the hinge joints of the given configuration on the constraints of the
 * given ragdoll. The ragdoll of Babylon.js stores these values but never applies them, leaving its hinges free to rotate.
 *
 * The angles are relative to the pose of the skeleton when the ragdoll was created (typically its rest pose), and a positive
 * angle is a rotation of the child body around "rotationAxis" following the right hand rule.
 * @param ragdoll defines the reference to the ragdoll created using the given configuration.
 * @param runtimeConfiguration defines the configuration used to create the ragdoll.
 * @returns the number of constraints that were limited.
 */
export function applyRagdollJointLimits(ragdoll: Ragdoll, runtimeConfiguration: IRagdollRuntimeConfiguration[]): number {
	const constraints = ragdoll.getConstraints();
	const skeleton = ragdoll["_skeleton"] as Skeleton;
	const rootBone = skeleton?.getChildren()[0];

	// Same order as the ragdoll: one body per bone of each configuration, and one constraint per body but the root one.
	const constrainedConfigurations: IRagdollRuntimeConfiguration[] = [];
	runtimeConfiguration.forEach((configuration) => {
		const bones = configuration["bone"] !== undefined ? [configuration["bone"]] : configuration.bones;
		bones.forEach((bone) => {
			if (bone !== rootBone?.name) {
				constrainedConfigurations.push(configuration);
			}
		});
	});

	if (constrainedConfigurations.length !== constraints.length) {
		Logger.Warn("Failed to apply the ragdoll joint limits: the constraints of the ragdoll don't match its configuration.");
		return 0;
	}

	let count = 0;

	constraints.forEach((constraint, index) => {
		const configuration = constrainedConfigurations[index];
		const joint = configuration.joint ?? PhysicsConstraintType.HINGE;

		if (joint !== PhysicsConstraintType.HINGE || configuration.min === undefined || configuration.max === undefined) {
			return;
		}

		const min = Math.min(configuration.min, configuration.max);
		const max = Math.max(configuration.min, configuration.max);

		// Only the 6DoF constraints expose the limits, but the plugin supports them on every constraint. A hinge rotates
		// around the angular X axis of its constraint, which is the rotation axis.
		const plugin = constraint["_physicsPlugin"] as IPhysicsEnginePluginV2 | undefined;
		if (!plugin) {
			return;
		}

		plugin.setAxisMode(constraint, PhysicsConstraintAxis.ANGULAR_X, PhysicsConstraintAxisLimitMode.LIMITED);
		plugin.setAxisMinLimit(constraint, PhysicsConstraintAxis.ANGULAR_X, (min * Math.PI) / 180);
		plugin.setAxisMaxLimit(constraint, PhysicsConstraintAxis.ANGULAR_X, (max * Math.PI) / 180);

		++count;
	});

	return count;
}
