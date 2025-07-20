import { AssetContainer, PBRMaterial, Scene, VertexData } from "babylonjs";

export type AssimpJSRuntime = {
	data: IAssimpJSRootData;
	scene: Scene;
	rootUrl: string;
	container: AssetContainer;
	geometries: Record<number, VertexData>;
	materials: Record<number, PBRMaterial>;
};

export interface IAssimpJSNodeData {
	name: string;

	meshes?: number[];
	transformation: number[];

	children?: IAssimpJSNodeData[];
}

export interface IAssimpJSBoneData {
	name: string;
	offsetmatrix: number[];
	weights: [number, number][];
}

export interface IAssimpJSMeshData {
	vertices: number[];
	faces: number[][];

	materialindex?: number;

	name?: string;
	normals?: number[];
	texturecoords?: number[][];

	bones?: IAssimpJSBoneData[];
}

export interface IAssimpJSMaterialData {
	properties: IAssimpJSMaterialPropertyData[];
}

export interface IAssimpJSMaterialPropertyData {
	key: string;
	type: number;
	index: number;
	semantic: number;
	value: string | number | number[];
}

export interface IAssimpJSTextureData {
	data: unknown;
	formathint: string;
}

export interface IAssimpJSAnimationChannelData {
	name: string;

	scalingkeys: [number, number[]][];
	rotationkeys: [number, number[]][];
	positionkeys: [number, number[]][];

	poststate?: number;
	prestate?: number;
}

export interface IAssimpJSAnimationData {
	name: string;
	duration: number;
	tickspersecond: number;
	channels: IAssimpJSAnimationChannelData[];
}

export interface IAssimpJSRootData {
	meshes?: IAssimpJSMeshData[];
	textures?: IAssimpJSTextureData[];
	materials?: IAssimpJSMaterialData[];
	animations?: IAssimpJSAnimationData[];

	rootnode: IAssimpJSNodeData;
}
