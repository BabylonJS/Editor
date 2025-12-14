import { Color3, Texture } from "babylonjs";

/**
 * VFX Material (converted from Quarks, ready for Babylon.js)
 */
export interface VFXMaterial {
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
 * VFX Texture (converted from Quarks, ready for Babylon.js)
 */
export interface VFXTexture {
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
 * VFX Image (converted from Quarks, normalized URL)
 */
export interface VFXImage {
	uuid: string;
	url: string; // Normalized URL (ready for use)
}

/**
 * VFX Geometry Attribute Data
 */
export interface VFXGeometryAttribute {
	array: number[];
	itemSize?: number;
}

/**
 * VFX Geometry Index Data
 */
export interface VFXGeometryIndex {
	array: number[];
}

/**
 * VFX Geometry Data (converted from Quarks, left-handed coordinate system)
 */
export interface VFXGeometryData {
	attributes: {
		position?: VFXGeometryAttribute;
		normal?: VFXGeometryAttribute;
		uv?: VFXGeometryAttribute;
		color?: VFXGeometryAttribute;
	};
	index?: VFXGeometryIndex;
}

/**
 * VFX Geometry (converted from Quarks, ready for Babylon.js)
 */
export interface VFXGeometry {
	uuid: string;
	type: "PlaneGeometry" | "BufferGeometry";
	// For PlaneGeometry
	width?: number;
	height?: number;
	// For BufferGeometry (already converted to left-handed)
	data?: VFXGeometryData;
}
