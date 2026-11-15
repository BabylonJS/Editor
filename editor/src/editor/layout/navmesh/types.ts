import { INavMeshParametersV2 } from "babylonjs-addons/navigation/types";

export interface INavMeshConfiguration {
	navMeshParameters: INavMeshParametersV2;
	useLowestLods?: boolean;
	isolatedAreas?: INavMeshIsolatedAreasConfiguration;

	staticMeshes: INavMeshStaticMeshConfiguration[];
	obstacleMeshes: INavMeshObstacleConfiguration[];
}

export interface INavMeshIsolatedAreasConfiguration {
	remove: boolean;
	minimumArea: number;
	referenceNodeId?: string;
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
