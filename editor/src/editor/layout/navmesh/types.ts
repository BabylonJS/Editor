import { INavMeshParametersV2 } from "babylonjs-addons/navigation/types";

export interface INavMeshConfiguration {
	navMeshParameters: INavMeshParametersV2;

	staticMeshes: INavMeshStaticMeshConfiguration[];
	obstacleMeshes: INavMeshObstacleConfiguration[];
}

export interface INavMeshStaticMeshConfiguration {
	id: string;
	enabled: boolean;
}

export interface INavMeshObstacleConfiguration {
	id: string;
	enabled: boolean;
	type: "box" | "cylinder";

	position?: number[];
	extent?: number[];
	angle?: number;
	radius?: number;
	height?: number;
}
