import { Vector3, Color4 } from "babylonjs";
import { IFXParticleData } from "./types";

// Mock data storage - in real implementation this would be managed by the editor
const particleDataMap: Map<string | number, IFXParticleData> = new Map();

export function getOrCreateParticleData(nodeId: string | number): IFXParticleData {
	if (!particleDataMap.has(nodeId)) {
		particleDataMap.set(nodeId, {
			id: String(nodeId),
			name: "Particle",
			visibility: true,
			position: new Vector3(0, 0, 0),
			rotation: new Vector3(0, 0, 0),
			scale: new Vector3(1, 1, 1),
			emitterShape: {
				shape: "Box",
				// Box properties
				direction1: new Vector3(0, 1, 0),
				direction2: new Vector3(0, 1, 0),
				minEmitBox: new Vector3(-0.5, -0.5, -0.5),
				maxEmitBox: new Vector3(0.5, 0.5, 0.5),
				// Cone properties
				radius: 1.0,
				angle: 0.785398, // 45 degrees in radians
				radiusRange: 0.0,
				heightRange: 0.0,
				emitFromSpawnPointOnly: false,
				// Cylinder properties
				height: 1.0,
				directionRandomizer: 0.0,
				// Sphere properties
				// Hemispheric properties
				// Mesh properties
				meshPath: null,
			},
			particleRenderer: {
				renderMode: "Billboard",
				worldSpace: false,
				material: null,
				type: "Standard",
				transparent: true,
				opacity: 1.0,
				side: "Double",
				blending: "Add",
				color: new Color4(1, 1, 1, 1),
				renderOrder: 0,
				uvTile: {
					column: 1,
					row: 1,
					startTileIndex: 0,
					blendTiles: false,
				},
				texture: null,
				meshPath: null,
				softParticles: false,
			},
			emission: {
				looping: true,
				duration: 5.0,
				prewarm: false,
				onlyUsedByOtherSystem: false,
				emitOverTime: 10,
				emitOverDistance: 0,
			},
			bursts: [],
			particleInitialization: {
				startLife: { min: 1.0, max: 2.0 },
				startSize: { min: 0.1, max: 0.2 },
				startSpeed: { min: 1.0, max: 2.0 },
				startColor: new Color4(1, 1, 1, 1),
				startRotation: { min: 0, max: 360 },
			},
			behaviors: [],
		});
	}
	return particleDataMap.get(nodeId)!;
}
