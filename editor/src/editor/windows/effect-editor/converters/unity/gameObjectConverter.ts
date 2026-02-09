import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Tools } from "@babylonjs/core/Misc/tools";
import type { IGroup, IEmitter, IParticleSystemConfig } from "babylonjs-editor-tools/src/effect/types";
import { getComponentByType, convertVector3 } from "./utils";
import { convertParticleSystem } from "./particleSystemConverter";

/**
 * Intermediate format for convertGameObject (before conversion to IData format)
 */
export interface IIntermediateGameObject {
	type: "emitter" | "group";
	name: string;
	position: [number, number, number];
	scale: [number, number, number];
	rotation: [number, number, number, number];
	emitter?: IParticleSystemConfig;
	renderMode?: number;
	materialId?: string; // GUID of material from ParticleSystemRenderer
	children?: IIntermediateGameObject[];
}

/**
 * Convert Unity GameObject hierarchy to our IGroup/IEmitter structure
 */
export function convertGameObject(gameObject: any, components: Map<string, any>): IIntermediateGameObject {
	// Get Transform component
	const transform = getComponentByType(gameObject, "Transform", components);

	const position = transform ? convertVector3(transform.m_LocalPosition) : ([0, 0, 0] as [number, number, number]);
	const scale = transform ? convertVector3(transform.m_LocalScale) : ([1, 1, 1] as [number, number, number]);
	const rotation = transform
		? ([parseFloat(transform.m_LocalRotation.x), parseFloat(transform.m_LocalRotation.y), parseFloat(transform.m_LocalRotation.z), parseFloat(transform.m_LocalRotation.w)] as [
				number,
				number,
				number,
				number,
			])
		: ([0, 0, 0, 1] as [number, number, number, number]);

	// Check if this GameObject has a ParticleSystem component
	const ps = getComponentByType(gameObject, "ParticleSystem", components);

	if (ps) {
		// It's a particle emitter
		const renderer = getComponentByType(gameObject, "ParticleSystemRenderer", components);
		const emitterConfig = convertParticleSystem(ps, renderer);

		// Determine render mode from renderer
		let renderMode = 0; // Default: BillBoard
		let materialId: string | undefined;
		if (renderer) {
			const m_RenderMode = parseInt(renderer.m_RenderMode || "0");
			switch (m_RenderMode) {
				case 0:
					renderMode = 0; // BillBoard
					break;
				case 1:
					renderMode = 1; // StretchedBillBoard
					break;
				case 2:
					renderMode = 2; // HorizontalBillBoard
					break;
				case 3:
					renderMode = 3; // VerticalBillBoard
					break;
				case 4:
					renderMode = 4; // Mesh
					break;
			}

			// Extract material GUID from renderer
			if (renderer.m_Materials && Array.isArray(renderer.m_Materials) && renderer.m_Materials.length > 0) {
				const materialRef = renderer.m_Materials[0];
				if (materialRef && materialRef.guid) {
					materialId = materialRef.guid;
				}
			}
		}

		const emitter: IIntermediateGameObject = {
			type: "emitter",
			name: gameObject.m_Name || "ParticleSystem",
			position,
			scale,
			rotation,
			emitter: emitterConfig,
			renderMode,
			materialId,
		};

		return emitter;
	} else {
		// It's a group (container)
		const group: IIntermediateGameObject = {
			type: "group",
			name: gameObject.m_Name || "Group",
			position,
			scale,
			rotation,
			children: [],
		};

		// Recursively convert children
		if (transform && transform.m_Children) {
			for (const childRef of transform.m_Children) {
				const childTransform = components.get(childRef.fileID);
				if (childTransform && childTransform.Transform) {
					const childGORef = childTransform.Transform.m_GameObject;
					const childGOId = childGORef?.fileID || childGORef;
					const childGO = components.get(childGOId);

					if (childGO && childGO.GameObject) {
						if (!group.children) {
							group.children = [];
						}
						group.children.push(convertGameObject(childGO.GameObject, components));
					}
				}
			}
		}

		return group;
	}
}

/**
 * Convert convertGameObject result to IGroup or IEmitter format
 * Recursively processes children
 */
export function convertToIDataFormat(converted: IIntermediateGameObject): IGroup | IEmitter | null {
	if (!converted) {
		return null;
	}

	const uuid = Tools.RandomId();

	if (converted.type === "group") {
		// Convert children recursively
		const children: (IGroup | IEmitter)[] = [];
		if (converted.children && Array.isArray(converted.children)) {
			for (const child of converted.children) {
				const childConverted = convertToIDataFormat(child);
				if (childConverted) {
					children.push(childConverted);
				}
			}
		}

		const group: IGroup = {
			uuid,
			name: converted.name,
			transform: {
				position: new Vector3(converted.position[0], converted.position[1], converted.position[2]),
				rotation: new Quaternion(converted.rotation[0], converted.rotation[1], converted.rotation[2], converted.rotation[3]),
				scale: new Vector3(converted.scale[0], converted.scale[1], converted.scale[2]),
			},
			children: children,
		};
		return group;
	} else {
		if (!converted.emitter) {
			console.warn("Emitter config is missing for", converted.name);
			return null;
		}
		const emitter: IEmitter = {
			uuid,
			name: converted.name,
			transform: {
				position: new Vector3(converted.position[0], converted.position[1], converted.position[2]),
				rotation: new Quaternion(converted.rotation[0], converted.rotation[1], converted.rotation[2], converted.rotation[3]),
				scale: new Vector3(converted.scale[0], converted.scale[1], converted.scale[2]),
			},
			config: converted.emitter,
			systemType: converted.renderMode === 4 ? "solid" : "base", // Mesh = solid, others = base
			materialId: converted.materialId, // Link material to emitter
		};
		return emitter;
	}
}
