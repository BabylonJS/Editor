import { Vector3, Color4 } from "babylonjs";

export interface IFXGroupData {
	id: string;
	name: string;
	visibility: boolean;
	position: Vector3;
	rotation: Vector3;
	scale: Vector3;
	type: "group";
}

export interface IFXParticleData {
	type: "particle";
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
		materialType: string; // MeshBasicMaterial or MeshStandardMaterial
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
		id?: string;
		time: number;
		count: number;
		cycle: number;
		interval: number;
		probability: number;
	}>;
	particleInitialization: {
		startLife: any; // Function: ConstantValue | IntervalValue | PiecewiseBezier
		startSize: any; // Function: ConstantValue | IntervalValue | PiecewiseBezier
		startSpeed: any; // Function: ConstantValue | IntervalValue | PiecewiseBezier
		startColor: any; // ColorFunction: ConstantColor | ColorRange | Gradient | RandomColor | RandomColorBetweenGradient
		startRotation: any; // Function: ConstantValue | IntervalValue | PiecewiseBezier
	};
	behaviors: Array<{
		id?: string;
		type: string;
		[key: string]: any;
	}>;
}

export type IFXNodeData = IFXParticleData | IFXGroupData;

/**
 * Type guard to check if node data is a group
 */
export function isGroupData(data: IFXNodeData): data is IFXGroupData {
	return data.type === "group";
}

/**
 * Type guard to check if node data is a particle
 */
export function isParticleData(data: IFXNodeData): data is IFXParticleData {
	return data.type === "particle";
}
