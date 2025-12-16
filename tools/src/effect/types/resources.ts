import { Color3 } from "babylonjs";

/**
 *  Material (converted from Quarks, ready for Babylon.js)
 */
export interface IMaterial {
	uuid: string;
	type?: string;
	color?: Color3; // Converted from hex/array to Color3
	opacity?: number;
	transparent?: boolean;
	depthWrite?: boolean;
	side?: number;
	blending?: number; // Converted to Babylon.js constants
	map?: string; // Texture UUID reference
}

/**
 *  Texture (converted from Quarks, ready for Babylon.js)
 */
export interface ITexture {
	uuid: string;
	image?: string; // Image UUID reference
	wrapU?: number; // Converted to Babylon.js wrap mode
	wrapV?: number; // Converted to Babylon.js wrap mode
	uScale?: number; // From repeat[0]
	vScale?: number; // From repeat[1]
	uOffset?: number; // From offset[0]
	vOffset?: number; // From offset[1]
	uAng?: number; // From rotation
	coordinatesIndex?: number; // From channel
	samplingMode?: number; // Converted from Three.js filters to Babylon.js sampling mode
	generateMipmaps?: boolean;
	flipY?: boolean;
}

/**
 *  Image (converted from Quarks, normalized URL)
 */
export interface IImage {
	uuid: string;
	url: string; // Normalized URL (ready for use)
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
 *  Geometry Data (converted from Quarks, left-handed coordinate system)
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
 *  Geometry (converted from Quarks, ready for Babylon.js)
 */
export interface IGeometry {
	uuid: string;
	type: "PlaneGeometry" | "BufferGeometry";
	// For PlaneGeometry
	width?: number;
	height?: number;
	// For BufferGeometry (already converted to left-handed)
	data?: IGeometryData;
}
