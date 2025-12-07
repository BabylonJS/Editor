import { Vector3, Color4 } from "babylonjs";

export interface IFXParticleData {
	id: string;
	name: string;
	visibility: boolean;
	position: Vector3;
	rotation: Vector3;
	scale: Vector3;
	emitterShape: {
		shape: string;
		[key: string]: any;
	};
	particleRenderer: {
		renderMode: string;
		worldSpace: boolean;
		material: any;
		type: string;
		transparent: boolean;
		opacity: number;
		side: string;
		blending: string;
		color: Color4;
		renderOrder: number;
		uvTile: {
			column: number;
			row: number;
			startTileIndex: number;
			blendTiles: boolean;
		};
		texture: any;
		meshPath: string | null;
		softParticles: boolean;
	};
	emission: {
		looping: boolean;
		duration: number;
		prewarm: boolean;
		onlyUsedByOtherSystem: boolean;
		emitOverTime: number;
		emitOverDistance: number;
	};
	bursts: Array<{
		time: number;
		count: number;
		cycle: number;
		interval: number;
		probability: number;
	}>;
	particleInitialization: {
		startLife: { min: number; max: number };
		startSize: { min: number; max: number };
		startSpeed: { min: number; max: number };
		startColor: Color4;
		startRotation: { min: number; max: number };
	};
	behaviors: Array<{
		type: string;
		[key: string]: any;
	}>;
}
