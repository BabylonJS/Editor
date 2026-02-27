import { Color3 } from "@babylonjs/core/Maths/math.color";

/**
 *  Material
 */
export interface IMaterial {
	uuid: string;
	type?: string;
	color?: Color3;
	opacity?: number;
	transparent?: boolean;
	depthWrite?: boolean;
	side?: number;
	blending?: number;
	map?: string; // Texture UUID reference
}

/**
 *  Texture
 */
export interface ITexture {
	uuid: string;
	image?: string; // Image UUID reference
	wrapU?: number;
	wrapV?: number;
	uScale?: number; // From repeat[0]
	vScale?: number; // From repeat[1]
	uOffset?: number; // From offset[0]
	vOffset?: number; // From offset[1]
	uAng?: number; // From rotation
	coordinatesIndex?: number; // From channel
	samplingMode?: number;
	generateMipmaps?: boolean;
	flipY?: boolean;
}

/**
 *  Image
 */
export interface IImage {
	uuid: string;
	url: string;
}

/**
 *  Geometry Attribute Data
 */
export interface IGeometryAttribute {
	array: number[];
	itemSize?: number;
}

/**
 *  Geometry Index Data
 */
export interface IGeometryIndex {
	array: number[];
}

/**
 *  Geometry Data
 */
export interface IGeometryData {
	attributes: {
		position?: IGeometryAttribute;
		normal?: IGeometryAttribute;
		uv?: IGeometryAttribute;
		color?: IGeometryAttribute;
	};
	index?: IGeometryIndex;
}

/**
 *  Geometry
 */
export interface IGeometry {
	uuid: string;
	type: "PlaneGeometry" | "BufferGeometry";
	// For PlaneGeometry
	width?: number;
	height?: number;
	// For BufferGeometry
	data?: IGeometryData;
}
