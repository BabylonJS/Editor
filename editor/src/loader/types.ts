import { AssetContainer, Matrix, Mesh, PBRMaterial, Scene, Skeleton, TransformNode, VertexData } from "babylonjs";

/**
 * Defines the data associated to a node that has been parsed into a Babylon.js node.
 * Stored so that skeletons and animations can be resolved once the entire hierarchy is available.
 */
export interface IAssimpParsedNode {
	name: string;
	/**
	 * The Babylon.js node created for this Assimp node (a `Mesh` for mesh nodes, a `TransformNode` otherwise).
	 */
	node: TransformNode;
	/**
	 * The local transformation matrix, already converted to Babylon.js' left-handed/column-major convention.
	 */
	localMatrix: Matrix;
	/**
	 * The name of the parent node in the Assimp hierarchy, or `null` for the root node.
	 */
	parentName: string | null;
}

/**
 * Defines a mesh node whose geometry is built once the skeleton (if any) is available.
 */
export interface IAssimpMeshNode {
	mesh: Mesh;
	data: IAssimpJSNodeData;
}

export type AssimpJSRuntime = {
	data: IAssimpJSRootData;
	scene: Scene;
	rootUrl: string;
	container: AssetContainer;
	geometries: Record<number, VertexData>;
	materials: Record<number, PBRMaterial>;

	/**
	 * All parsed nodes indexed by their Assimp name.
	 */
	nodes: Map<string, IAssimpParsedNode>;
	/**
	 * Names of the parsed nodes in depth-first order (parents always appear before their children).
	 */
	orderedNodeNames: string[];
	/**
	 * Mesh nodes whose geometry is built in a second pass, once the skeleton is available.
	 */
	meshNodes: IAssimpMeshNode[];

	/**
	 * The skeleton shared by all skinned meshes of this file, or `null` if the file has no bones.
	 */
	skeleton: Skeleton | null;
	/**
	 * Maps a bone name to its index in `skeleton.bones` (used to fill the meshes' matrices indices).
	 */
	boneIndexByName: Map<string, number>;
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
