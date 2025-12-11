import { Vector3, Matrix, Quaternion, Color4 } from "babylonjs";
import { readJSON } from "fs-extra";
import { IFXParticleData, IFXGroupData } from "./properties/types";

interface IThreeJSObject {
	type: string;
	name?: string;
	uuid?: string;
	matrix?: number[];
	visible?: boolean;
	children?: IThreeJSObject[];
	ps?: IQuarksParticleSystem;
}

interface IQuarksParticleSystem {
	version?: string;
	autoDestroy?: boolean;
	looping?: boolean;
	prewarm?: boolean;
	duration?: number;
	shape?: IQuarksShape;
	startLife?: IQuarksValue;
	startSpeed?: IQuarksValue;
	startRotation?: IQuarksValue;
	startSize?: IQuarksValue;
	startColor?: IQuarksColor;
	emissionOverTime?: IQuarksValue;
	emissionOverDistance?: IQuarksValue;
	emissionBursts?: IQuarksBurst[];
	onlyUsedByOther?: boolean;
	instancingGeometry?: string;
	renderOrder?: number;
	renderMode?: number;
	rendererEmitterSettings?: any;
	material?: string;
	layers?: number;
	startTileIndex?: IQuarksValue;
	uTileCount?: number;
	vTileCount?: number;
	blendTiles?: boolean;
	softParticles?: boolean;
	softFarFade?: number;
	softNearFade?: number;
	behaviors?: IQuarksBehavior[];
	worldSpace?: boolean;
}

interface IQuarksShape {
	type: string;
	radius?: number;
	arc?: number;
	thickness?: number;
	angle?: number;
	mode?: number;
	spread?: number;
	speed?: IQuarksValue;
	width?: number;
	height?: number;
	depth?: number;
	boxWidth?: number;
	boxHeight?: number;
	boxDepth?: number;
}

interface IQuarksValue {
	type: string;
	value?: number;
	a?: number;
	b?: number;
	functions?: Array<{
		function: {
			p0: number;
			p1: number;
			p2: number;
			p3: number;
		};
		start: number;
	}>;
}

interface IQuarksColor {
	type: string;
	color?: {
		r: number;
		g: number;
		b: number;
		a?: number;
	} | {
		type: string;
		subType?: string;
		keys?: Array<{
			value: {
				r: number;
				g: number;
				b: number;
			} | number;
			pos: number;
		}>;
	};
	color1?: {
		r: number;
		g: number;
		b: number;
		a?: number;
	};
	color2?: {
		r: number;
		g: number;
		b: number;
		a?: number;
	};
	alpha?: {
		type: string;
		subType?: string;
		keys?: Array<{
			value: number;
			pos: number;
		}>;
	};
	keys?: Array<{
		value: {
			r: number;
			g: number;
			b: number;
		} | number;
		pos: number;
	}>;
}

interface IQuarksBurst {
	time?: number;
	count?: IQuarksValue;
	cycle?: number;
	interval?: number;
	probability?: number;
}

interface IQuarksBehavior {
	type: string;
	[key: string]: any;
}

interface IThreeJSJSON {
	metadata?: {
		version?: number;
		type?: string;
		generator?: string;
	};
	object?: IThreeJSObject;
	materials?: any[];
	textures?: any[];
	images?: any[];
	geometries?: any[];
}

export interface IConvertedNode {
	id: string;
	name: string;
	type: "particle" | "group" | "texture" | "geometry";
	parentId?: string;
	particleData?: IFXParticleData;
	groupData?: IFXGroupData;
	resourceData?: {
		uuid: string;
		path?: string;
		type: "texture" | "geometry";
	};
	children?: IConvertedNode[];
}

export interface IConvertedData {
	nodes: IConvertedNode[];
	resources: IConvertedNode[];
	materials: Array<{
		uuid: string;
		type: string;
		color?: number;
		map?: string;
		blending?: number;
		side?: number;
		transparent?: boolean;
		depthWrite?: boolean;
		opacity?: number;
	}>;
	textures: Array<{
		uuid: string;
		name?: string;
		image?: string;
		imageUrl?: string;
	}>;
	geometries: Array<{
		uuid: string;
		type: string;
		name?: string;
		data?: any;
		[name: string]: any;
	}>;
	images: Array<{
		uuid: string;
		url?: string;
		name?: string;
		data?: string;
		format?: string;
	}>;
}

/**
 * Converts a Three.js JSON file to FX editor node structure for UI tree view
 * Note: Actual particle systems are created by ThreeJSParticleLoader
 */
export async function convertThreeJSJSONToFXEditor(filePath: string): Promise<IConvertedData> {
	const json: IThreeJSJSON = await readJSON(filePath);

	if (!json.object) {
		return { nodes: [], resources: [], materials: [], textures: [], geometries: [], images: [] };
	}

	const convertedNodes: IConvertedNode[] = [];
	const usedResources = new Set<string>(); // Track used texture and geometry UUIDs
	
	// Simple conversion - just create node structure for tree view
	_convertObjectToNodes(json.object, null, convertedNodes, json, usedResources);

	// Add resource nodes for textures and geometries
	const resourceNodes: IConvertedNode[] = [];

	// Extract materials data
	const materialsData: IConvertedData["materials"] = [];
	if (json.materials) {
		json.materials.forEach((material) => {
			if (usedResources.has(material.uuid)) {
				materialsData.push({
					uuid: material.uuid,
					type: material.type || "MeshStandardMaterial",
					color: material.color,
					map: material.map,
					blending: material.blending,
					side: material.side,
					transparent: material.transparent,
					depthWrite: material.depthWrite,
					opacity: material.opacity,
				});
			}
		});
	}

	// Extract textures and images data
	const texturesData: IConvertedData["textures"] = [];
	const imagesData: IConvertedData["images"] = [];
	
	// Store all images first
	if (json.images) {
		json.images.forEach((image) => {
			imagesData.push({
				uuid: image.uuid,
				url: image.url,
				name: image.name,
				data: image.data,
				format: image.format,
			});
		});
	}

	if (json.textures) {
		json.textures.forEach((texture) => {
			if (usedResources.has(texture.uuid)) {
				const image = json.images?.find((img) => img.uuid === texture.image);
				const imagePath = image?.url || image?.name || texture.name || texture.uuid;
				
				texturesData.push({
					uuid: texture.uuid,
					name: texture.name,
					image: texture.image,
					imageUrl: imagePath,
				});

				resourceNodes.push({
					id: `texture-${texture.uuid}`,
					name: texture.name || imagePath || `Texture ${texture.uuid.substring(0, 8)}`,
					type: "texture",
					resourceData: {
						uuid: texture.uuid,
						path: imagePath,
						type: "texture",
					},
				});
			}
		});
	}

	// Extract geometries data
	const geometriesData: IConvertedData["geometries"] = [];
	if (json.geometries) {
		json.geometries.forEach((geometry) => {
			if (usedResources.has(geometry.uuid)) {
				geometriesData.push({
					uuid: geometry.uuid,
					type: geometry.type || "BufferGeometry",
					name: geometry.name,
					data: geometry.data || geometry,
					...geometry,
				});

				resourceNodes.push({
					id: `geometry-${geometry.uuid}`,
					name: geometry.name || `Geometry ${geometry.uuid.substring(0, 8)}`,
					type: "geometry",
					resourceData: {
						uuid: geometry.uuid,
						type: "geometry",
					},
				});
			}
		});
	}

	return { 
		nodes: convertedNodes, 
		resources: resourceNodes, 
		materials: materialsData, 
		textures: texturesData,
		geometries: geometriesData,
		images: imagesData,
	};
}

/**
 * Decomposes a 4x4 transformation matrix into position, rotation (Euler angles), and scale
 * Three.js uses column-major matrices and XYZ order for Euler angles
 */
function _decomposeMatrix(matrixArray: number[]): { position: Vector3; rotation: Vector3; scale: Vector3 } {
	const position = Vector3.Zero();
	const rotationQuat = Quaternion.Identity();
	const scaling = Vector3.Zero();

	console.log("[_decomposeMatrix] Input matrix (column-major):", matrixArray);

	// Three.js matrices are stored in column-major order
	// Try without transposing first - Matrix.FromArray might handle it correctly
	// If this doesn't work, we'll transpose
	const matrix = Matrix.FromArray(matrixArray);
	console.log("[_decomposeMatrix] Matrix after FromArray:", matrix.m);
	
	matrix.decompose(scaling, rotationQuat, position);
	
	console.log("[_decomposeMatrix] Decomposed values:");
	console.log("  Position:", position.x, position.y, position.z);
	console.log("  Scale:", scaling.x, scaling.y, scaling.z);
	console.log("  Quaternion:", rotationQuat.x, rotationQuat.y, rotationQuat.z, rotationQuat.w);

	// Babylon.js toEulerAngles() returns angles in YXZ order (yaw-pitch-roll)
	// Three.js uses XYZ order (roll-pitch-yaw)
	// We'll use Babylon's method and then convert the order
	const eulerYXZ = rotationQuat.toEulerAngles();
	console.log("[_decomposeMatrix] Babylon YXZ Euler (rad):", eulerYXZ.x, eulerYXZ.y, eulerYXZ.z);
	console.log("[_decomposeMatrix] Babylon YXZ Euler (deg):", eulerYXZ.x * 180 / Math.PI, eulerYXZ.y * 180 / Math.PI, eulerYXZ.z * 180 / Math.PI);
	
	// Convert from YXZ to XYZ order
	// YXZ: first Y (yaw), then X (pitch), then Z (roll)
	// XYZ: first X (roll), then Y (pitch), then Z (yaw)
	// We need to recompute from quaternion using XYZ order
	const qx = rotationQuat.x;
	const qy = rotationQuat.y;
	const qz = rotationQuat.z;
	const qw = rotationQuat.w;

	// XYZ order Euler angles from quaternion
	// Roll (X)
	const sinr_cosp = 2 * (qw * qx + qy * qz);
	const cosr_cosp = 1 - 2 * (qx * qx + qy * qy);
	const roll = Math.atan2(sinr_cosp, cosr_cosp);

	// Pitch (Y)
	const sinp = 2 * (qw * qy - qz * qx);
	let pitch: number;
	if (Math.abs(sinp) >= 1) {
		pitch = Math.sign(sinp) * Math.PI / 2;
	} else {
		pitch = Math.asin(sinp);
	}

	// Yaw (Z)
	const siny_cosp = 2 * (qw * qz + qx * qy);
	const cosy_cosp = 1 - 2 * (qy * qy + qz * qz);
	const yaw = Math.atan2(siny_cosp, cosy_cosp);

	console.log("[_decomposeMatrix] XYZ Euler (rad):", roll, pitch, yaw);

	// Store rotation in RADIANS (not degrees) because EditorInspectorNumberField with asDegrees expects radians
	// The component will automatically convert radians to degrees for display
	const rotation = new Vector3(roll, pitch, yaw);

	console.log("[_decomposeMatrix] Final rotation (rad):", rotation.x, rotation.y, rotation.z);
	console.log("[_decomposeMatrix] Final rotation (deg for reference):", rotation.x * 180 / Math.PI, rotation.y * 180 / Math.PI, rotation.z * 180 / Math.PI);

	return {
		position,
		rotation,
		scale: scaling,
	};
}

/**
 * Recursively converts Three.js objects to FX editor nodes (simplified - only for UI tree)
 */
function _convertObjectToNodes(
	obj: IThreeJSObject,
	parentId: string | null,
	convertedNodes: IConvertedNode[],
	json: IThreeJSJSON,
	usedResources: Set<string>
): void {
	if (obj.type === "ParticleEmitter" && obj.ps) {
		// Create simple particle node for tree view
		const nodeId = `particle-${obj.uuid || Date.now()}-${Math.random()}`;
		
		const node: IConvertedNode = {
			id: nodeId,
			name: obj.name || "Particle",
			type: "particle",
			parentId: parentId || undefined,
			// Store minimal particle data - actual creation is done by ThreeJSParticleLoader
			particleData: {
				type: "particle",
				id: nodeId,
				name: obj.name || "Particle",
				visibility: obj.visible !== false,
				position: new Vector3(0, 0, 0),
				rotation: new Vector3(0, 0, 0),
				scale: new Vector3(1, 1, 1),
				emitterShape: { shape: "Box" },
				particleRenderer: {
					renderMode: "Billboard",
					worldSpace: false,
					material: null,
					materialType: "MeshStandardMaterial",
					transparent: true,
					opacity: 1.0,
					side: "Double",
					blending: "Add",
					color: new Color4(1, 1, 1, 1),
					renderOrder: 0,
					uvTile: { column: 1, row: 1, startTileIndex: 0, blendTiles: false },
					texture: null,
					meshPath: null,
					softParticles: false,
				},
				emission: { looping: true, duration: 5, prewarm: false, onlyUsedByOtherSystem: false, emitOverTime: 10, emitOverDistance: 0 },
				bursts: [],
				particleInitialization: {
					startLife: { functionType: "IntervalValue", data: { min: 1, max: 2 } },
					startSize: { functionType: "IntervalValue", data: { min: 0.1, max: 0.2 } },
					startSpeed: { functionType: "IntervalValue", data: { min: 1, max: 2 } },
					startColor: { colorFunctionType: "ConstantColor", data: { color: { r: 1, g: 1, b: 1, a: 1 } } },
					startRotation: { functionType: "IntervalValue", data: { min: 0, max: 360 } },
				},
				behaviors: [],
			},
		};

		// Extract position, rotation, scale from matrix if available
		if (obj.matrix && obj.matrix.length >= 16) {
			const { position, rotation, scale } = _decomposeMatrix(obj.matrix);
			if (node.particleData) {
				node.particleData.position = position;
				node.particleData.rotation = rotation;
				node.particleData.scale = scale;
			}
		}

		// Track used resources
		if (obj.ps) {
			const ps = obj.ps;
			if (ps.material && json.materials) {
				usedResources.add(ps.material);
				const material = json.materials.find((m) => m.uuid === ps.material);
				if (material?.map && json.textures) {
					usedResources.add(material.map);
				}
			}
			if (ps.instancingGeometry) {
				usedResources.add(ps.instancingGeometry);
			}
		}

		// Process children
		if (obj.children) {
			node.children = [];
			obj.children.forEach((child) => {
				_convertObjectToNodes(child, nodeId, node.children!, json, usedResources);
			});
		}

		convertedNodes.push(node);
	} else if (obj.type === "Group") {
		// Convert group
		const nodeId = `group-${obj.uuid || Date.now()}-${Math.random()}`;
		
		const groupData: IFXGroupData = {
			type: "group",
			id: nodeId,
			name: obj.name || "Group",
			visibility: obj.visible !== false,
			position: new Vector3(0, 0, 0),
			rotation: new Vector3(0, 0, 0),
			scale: new Vector3(1, 1, 1),
		};

		// Extract position, rotation, scale from matrix if available
		if (obj.matrix && obj.matrix.length >= 16) {
			const { position, rotation, scale } = _decomposeMatrix(obj.matrix);
			groupData.position = position;
			groupData.rotation = rotation;
			groupData.scale = scale;
		}

		const node: IConvertedNode = {
			id: nodeId,
			name: obj.name || "Group",
			type: "group",
			parentId: parentId || undefined,
			groupData,
			children: [],
		};

		// Process children
		if (obj.children) {
			obj.children.forEach((child) => {
				_convertObjectToNodes(child, nodeId, node.children!, json, usedResources);
			});
		}

		convertedNodes.push(node);
	} else if (obj.children) {
		// Process children of other object types
		obj.children.forEach((child) => {
			_convertObjectToNodes(child, parentId, convertedNodes, json, usedResources);
		});
	}
}



