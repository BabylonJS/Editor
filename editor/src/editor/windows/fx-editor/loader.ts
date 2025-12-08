import { Vector3, Color4, Matrix, Quaternion } from "babylonjs";
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
}

/**
 * Converts a Three.js JSON file (from quarks) to FX editor format
 */
export async function convertThreeJSJSONToFXEditor(filePath: string): Promise<IConvertedData> {
	const json: IThreeJSJSON = await readJSON(filePath);

	if (!json.object) {
		return { nodes: [], resources: [], materials: [], textures: [] };
	}

	const convertedNodes: IConvertedNode[] = [];
	const usedResources = new Set<string>(); // Track used texture and geometry UUIDs
	
	_convertObject(json.object, null, convertedNodes, json, usedResources);

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

	// Extract textures data
	const texturesData: IConvertedData["textures"] = [];
	if (json.textures && json.images) {
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

	// Add geometries
	if (json.geometries) {
		json.geometries.forEach((geometry) => {
			if (usedResources.has(geometry.uuid)) {
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

	return { nodes: convertedNodes, resources: resourceNodes, materials: materialsData, textures: texturesData };
}

/**
 * Decomposes a 4x4 transformation matrix into position, rotation (Euler angles), and scale
 */
function _decomposeMatrix(matrixArray: number[]): { position: Vector3; rotation: Vector3; scale: Vector3 } {
	const position = Vector3.Zero();
	const rotationQuat = Quaternion.Identity();
	const scaling = Vector3.Zero();

	const matrix = Matrix.FromArray(matrixArray);
	matrix.decompose(scaling, rotationQuat, position);

	// Convert Quaternion to Euler angles (in degrees)
	const rotation = rotationQuat.toEulerAngles();
	rotation.scaleInPlace(180 / Math.PI); // Convert radians to degrees

	return {
		position,
		rotation,
		scale: scaling,
	};
}

/**
 * Recursively converts Three.js objects to FX editor nodes
 */
function _convertObject(
	obj: IThreeJSObject,
	parentId: string | null,
	convertedNodes: IConvertedNode[],
	json: IThreeJSJSON,
	usedResources: Set<string>
): void {
	if (obj.type === "ParticleEmitter" && obj.ps) {
		// Convert particle emitter
		const nodeId = `particle-${obj.uuid || Date.now()}-${Math.random()}`;
		const particleData = _convertParticleSystem(obj.ps, obj.name || "Particle", json);
		particleData.id = nodeId;
		particleData.name = obj.name || "Particle";

		// Extract position, rotation, scale from matrix if available
		if (obj.matrix && obj.matrix.length >= 16) {
			const { position, rotation, scale } = _decomposeMatrix(obj.matrix);
			particleData.position = position;
			particleData.rotation = rotation;
			particleData.scale = scale;
		}

		const node: IConvertedNode = {
			id: nodeId,
			name: obj.name || "Particle",
			type: "particle",
			parentId: parentId || undefined,
			particleData,
		};

		// Track used resources
		if (particleData.particleRenderer.texture?.uuid) {
			usedResources.add(particleData.particleRenderer.texture.uuid);
		}
		if (particleData.particleRenderer.material?.uuid) {
			usedResources.add(particleData.particleRenderer.material.uuid);
			// Also track texture from material
			if (json.materials) {
				const material = json.materials.find((m) => m.uuid === particleData.particleRenderer.material?.uuid);
				if (material?.map && json.textures) {
					usedResources.add(material.map);
				}
			}
		}
		if (particleData.particleRenderer.meshPath) {
			usedResources.add(particleData.particleRenderer.meshPath);
		}
		if (particleData.emitterShape.meshPath) {
			usedResources.add(particleData.emitterShape.meshPath);
		}

		// Process children
		if (obj.children) {
			node.children = [];
			obj.children.forEach((child) => {
				_convertObject(child, nodeId, node.children!, json, usedResources);
			});
		}

		convertedNodes.push(node);
	} else if (obj.type === "Group") {
		// Convert group
		const nodeId = `group-${obj.uuid || Date.now()}-${Math.random()}`;
		
		// Create group data with default values
		const groupData: IFXGroupData = {
			type: "group",
			id: nodeId,
			name: obj.name || "Group",
			visibility: obj.visible !== false, // Three.js uses 'visible' property
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
				_convertObject(child, nodeId, node.children!, json, usedResources);
			});
		}

		convertedNodes.push(node);
	} else if (obj.children) {
		// Process children of other object types
		obj.children.forEach((child) => {
			_convertObject(child, parentId, convertedNodes, json, usedResources);
		});
	}
}

/**
 * Converts a quarks particle system to FX editor particle data
 */
function _convertParticleSystem(ps: IQuarksParticleSystem, name: string, json: IThreeJSJSON): IFXParticleData {
	// Convert emitter shape
	const emitterShape = _convertEmitterShape(ps.shape);

	// Convert particle renderer
	const particleRenderer = _convertParticleRenderer(ps, json);

	// Convert emission
	const emission = {
		looping: ps.looping ?? true,
		duration: ps.duration ?? 5.0,
		prewarm: ps.prewarm ?? false,
		onlyUsedByOtherSystem: ps.onlyUsedByOther ?? false,
		emitOverTime: _extractConstantValue(ps.emissionOverTime) ?? 10,
		emitOverDistance: _extractConstantValue(ps.emissionOverDistance) ?? 0,
	};

	// Convert bursts
	const bursts = (ps.emissionBursts || []).map((burst, index) => ({
		id: `burst-${Date.now()}-${index}`,
		time: burst.time ?? 0,
		count: _extractConstantValue(burst.count) ?? 1,
		cycle: burst.cycle ?? 1,
		interval: burst.interval ?? 0,
		probability: burst.probability ?? 1.0,
	}));

	// Convert particle initialization
	const particleInitialization = {
		startLife: _convertQuarksValueToFunction(ps.startLife) ?? {
			functionType: "IntervalValue",
			data: { min: 1.0, max: 2.0 },
		},
		startSize: _convertQuarksValueToFunction(ps.startSize) ?? {
			functionType: "IntervalValue",
			data: { min: 0.1, max: 0.2 },
		},
		startSpeed: _convertQuarksValueToFunction(ps.startSpeed) ?? {
			functionType: "IntervalValue",
			data: { min: 1.0, max: 2.0 },
		},
		startColor: _convertQuarksColorToColorFunction(ps.startColor) ?? {
			colorFunctionType: "ConstantColor",
			data: { color: new Color4(1, 1, 1, 1) },
		},
		startRotation: _convertQuarksValueToFunction(ps.startRotation) ?? {
			functionType: "IntervalValue",
			data: { min: 0, max: 360 },
		},
	};

	// Convert behaviors
	const behaviors = (ps.behaviors || []).map((behavior, index) => ({
		id: `behavior-${Date.now()}-${index}`,
		type: _convertBehaviorType(behavior.type),
		..._convertBehavior(behavior),
	}));

	return {
		type: "particle",
		id: "",
		name,
		visibility: true,
		position: new Vector3(0, 0, 0),
		rotation: new Vector3(0, 0, 0),
		scale: new Vector3(1, 1, 1),
		emitterShape,
		particleRenderer,
		emission,
		bursts,
		particleInitialization,
		behaviors,
	};
}

/**
 * Converts quarks emitter shape to FX editor format
 */
function _convertEmitterShape(shape?: IQuarksShape): IFXParticleData["emitterShape"] {
	if (!shape) {
		return { shape: "Box" };
	}

	const shapeType = shape.type?.toLowerCase() || "box";

	switch (shapeType) {
		case "cone":
			return {
				shape: "Cone",
				radius: shape.radius ?? 1.0,
				angle: shape.angle ?? 0.785398,
				radiusRange: shape.thickness ?? 0.0,
				heightRange: 0.0,
				emitFromSpawnPointOnly: shape.mode === 1,
			};

		case "box":
			return {
				shape: "Box",
				direction1: new Vector3(0, 1, 0),
				direction2: new Vector3(0, 1, 0),
				minEmitBox: new Vector3(
					-(shape.boxWidth ?? shape.width ?? 1.0) / 2,
					-(shape.boxHeight ?? shape.height ?? 1.0) / 2,
					-(shape.boxDepth ?? shape.depth ?? 1.0) / 2
				),
				maxEmitBox: new Vector3(
					(shape.boxWidth ?? shape.width ?? 1.0) / 2,
					(shape.boxHeight ?? shape.height ?? 1.0) / 2,
					(shape.boxDepth ?? shape.depth ?? 1.0) / 2
				),
			};

		case "sphere":
			return {
				shape: "Sphere",
				radius: shape.radius ?? 1.0,
			};

		case "hemisphere":
		case "hemispheric":
			return {
				shape: "Hemispheric",
				radius: shape.radius ?? 1.0,
			};

		case "cylinder":
			return {
				shape: "Cylinder",
				radius: shape.radius ?? 1.0,
				height: shape.height ?? 1.0,
				directionRandomizer: 0.0,
			};

		case "point":
			return {
				shape: "Point",
			};

		default:
			return { shape: "Box" };
	}
}

/**
 * Converts quarks particle renderer to FX editor format
 */
function _convertParticleRenderer(ps: IQuarksParticleSystem, json: IThreeJSJSON): IFXParticleData["particleRenderer"] {
	// Convert render mode
	const renderModeMap: Record<number, string> = {
		0: "Billboard",
		1: "Stretched Billboard",
		2: "Mesh",
		3: "Trail",
	};
	const renderMode = renderModeMap[ps.renderMode ?? 0] || "Billboard";

	// Extract texture from material if available
	let texture: any = null;
	if (ps.material && json.materials) {
		const material = json.materials.find((m) => m.uuid === ps.material);
		if (material && material.map && json.textures) {
			const textureData = json.textures.find((t) => t.uuid === material.map);
			if (textureData && textureData.image && json.images) {
				const image = json.images.find((img) => img.uuid === textureData.image);
				// Store image path or data for later processing
				texture = {
					uuid: textureData.uuid,
					image: image,
				};
			}
		}
	}

	// Extract start tile index
	const startTileIndex = _extractConstantValue(ps.startTileIndex) ?? 0;

	// Extract material type from material if available
	// In quarks, materials can be MeshBasicMaterial or MeshStandardMaterial
	let materialType = "MeshStandardMaterial"; // Default
	if (ps.material && json.materials) {
		const material = json.materials.find((m) => m.uuid === ps.material);
		if (material && material.type) {
			// Map quarks material types to our format
			const materialTypeMap: Record<string, string> = {
				MeshBasicMaterial: "MeshBasicMaterial",
				MeshStandardMaterial: "MeshStandardMaterial",
				// Fallback for other material types
				"MeshLambertMaterial": "MeshStandardMaterial",
				"MeshPhongMaterial": "MeshStandardMaterial",
			};
			materialType = materialTypeMap[material.type] || "MeshStandardMaterial";
		}
	}

	return {
		renderMode,
		worldSpace: ps.worldSpace ?? false,
		material: ps.material ? { uuid: ps.material } : null,
		materialType,
		transparent: true,
		opacity: 1.0,
		side: "Double",
		blending: "Add",
		color: new Color4(1, 1, 1, 1),
		renderOrder: ps.renderOrder ?? 0,
		uvTile: {
			column: ps.uTileCount ?? 1,
			row: ps.vTileCount ?? 1,
			startTileIndex,
			blendTiles: ps.blendTiles ?? false,
		},
		texture,
		meshPath: ps.instancingGeometry || null, // Store geometry UUID for now
		softParticles: ps.softParticles ?? false,
	};
}

/**
 * Converts quarks behavior to FX editor format
 */
function _convertBehavior(behavior: IQuarksBehavior): any {
	const converted: any = {};

	switch (behavior.type) {
		case "ForceOverLife":
			const x = _convertQuarksValueToFunction(behavior.x) || {
				functionType: "ConstantValue",
				data: { value: 0 },
			};
			const y = _convertQuarksValueToFunction(behavior.y) || {
				functionType: "ConstantValue",
				data: { value: 0 },
			};
			const z = _convertQuarksValueToFunction(behavior.z) || {
				functionType: "ConstantValue",
				data: { value: 0 },
			};
			return {
				force: {
					functionType: "Vector3Function",
					data: {
						x,
						y,
						z,
					},
				},
			};

		case "SizeOverLife":
			// Convert size value using _convertQuarksValueToFunction
			const sizeFunction = _convertQuarksValueToFunction(behavior.size) || {
				functionType: "ConstantValue",
				data: { value: 1 },
			};
			return {
				size: sizeFunction,
			};

		case "RotationOverLife":
			const angularVelocity = _convertQuarksValueToFunction(behavior.angularVelocity) || {
				functionType: "IntervalValue",
				data: { min: 0, max: 0 },
			};
			return {
				angularVelocity,
			};

		case "ColorOverLife":
			// Convert color function from quarks format to our format
			const colorFunction = _convertQuarksColorToColorFunction(behavior.color) || {
				colorFunctionType: "ConstantColor",
				data: { color: new Color4(1, 1, 1, 1) },
			};
			return {
				color: colorFunction,
			};

		case "ColorBySpeed":
			// Convert color function from quarks format to our format
			const colorBySpeedFunction = _convertQuarksColorToColorFunction(behavior.color) || {
				colorFunctionType: "ConstantColor",
				data: { color: new Color4(1, 1, 1, 1) },
			};
			return {
				color: colorBySpeedFunction,
			};

		case "ApplyForce":
			const magnitude = _convertQuarksValueToFunction(behavior.magnitude) || {
				functionType: "ConstantValue",
				data: { value: 1 },
			};
			return {
				magnitude,
				direction: behavior.direction
					? new Vector3(behavior.direction.x || 0, behavior.direction.y || 0, behavior.direction.z || 0)
					: new Vector3(0, 1, 0),
			};

		case "Noise":
			const frequency = _convertQuarksValueToFunction(behavior.frequency) || {
				functionType: "ConstantValue",
				data: { value: 1 },
			};
			const power = _convertQuarksValueToFunction(behavior.power) || {
				functionType: "ConstantValue",
				data: { value: 1 },
			};
			const positionAmount = _convertQuarksValueToFunction(behavior.positionAmount) || {
				functionType: "ConstantValue",
				data: { value: 1 },
			};
			const rotationAmount = _convertQuarksValueToFunction(behavior.rotationAmount) || {
				functionType: "ConstantValue",
				data: { value: 1 },
			};
			return {
				frequency,
				power,
				positionAmount,
				rotationAmount,
			};

		case "GravityForce":
			const gravity = _convertQuarksValueToFunction(behavior.gravity) || {
				functionType: "ConstantValue",
				data: { value: -9.81 },
			};
			return {
				gravity,
			};

		case "TurbulenceField":
			const strength = _convertQuarksValueToFunction(behavior.strength) || {
				functionType: "ConstantValue",
				data: { value: 1 },
			};
			const size = _convertQuarksValueToFunction(behavior.size) || {
				functionType: "ConstantValue",
				data: { value: 1 },
			};
			return {
				strength,
				size,
			};

		default:
			// Copy all properties as-is for unknown behaviors
			Object.keys(behavior).forEach((key) => {
				if (key !== "type") {
					converted[key] = behavior[key];
				}
			});
			return converted;
	}
}

/**
 * Converts quarks behavior type name to FX editor format
 */
function _convertBehaviorType(quarksType: string): string {
	const typeMap: Record<string, string> = {
		ForceOverLife: "ForceOverLife",
		SizeOverLife: "SizeOverLife",
		RotationOverLife: "RotationOverLife",
		ColorOverLife: "ColorOverLife",
		ColorBySpeed: "ColorBySpeed",
		ApplyForce: "ApplyForce",
		Noise: "Noise",
		GravityForce: "GravityForce",
		TurbulenceField: "TurbulenceField",
	};

	return typeMap[quarksType] || quarksType;
}

/**
 * Converts quarks value to function format
 */
function _convertQuarksValueToFunction(value?: IQuarksValue): any | null {
	if (!value) {
		return null;
	}

	if (value.type === "ConstantValue" && value.value !== undefined) {
		return {
			functionType: "ConstantValue",
			data: { value: value.value },
		};
	}

	if (value.type === "IntervalValue" && value.a !== undefined && value.b !== undefined) {
		return {
			functionType: "IntervalValue",
			data: { min: value.a, max: value.b },
		};
	}

	if (value.type === "PiecewiseBezier" && value.functions && value.functions.length > 0) {
		// Use the first function segment
		const firstSegment = value.functions[0];
		return {
			functionType: "PiecewiseBezier",
			data: {
				function: firstSegment.function || { p0: 0, p1: 1.0 / 3, p2: (1.0 / 3) * 2, p3: 1 },
			},
		};
	}

	return null;
}

/**
 * Converts quarks color to color function format
 */
function _convertQuarksColorToColorFunction(color?: IQuarksColor): any | null {
	if (!color) {
		return null;
	}

	if (color.type === "ConstantColor" && color.color && typeof color.color === "object" && "r" in color.color) {
		const colorObj = color.color as { r: number; g: number; b: number; a?: number };
		return {
			colorFunctionType: "ConstantColor",
			data: {
				color: new Color4(colorObj.r ?? 1, colorObj.g ?? 1, colorObj.b ?? 1, colorObj.a ?? 1),
			},
		};
	}

	if (color.type === "ColorRange" && color.color1 && color.color2) {
		return {
			colorFunctionType: "ColorRange",
			data: {
				colorA: new Color4(color.color1.r ?? 0, color.color1.g ?? 0, color.color1.b ?? 0, color.color1.a ?? 1),
				colorB: new Color4(color.color2.r ?? 1, color.color2.g ?? 1, color.color2.b ?? 1, color.color2.a ?? 1),
			},
		};
	}

	if (color.type === "Gradient") {
		// Convert quarks Gradient to our Gradient format
		// Gradient has color and alpha as CLinearFunction objects with keys
		const colorKeys: any[] = [];
		const alphaKeys: any[] = [];

		// Extract color keys from color.color.keys (CLinearFunction)
		if (color.color && typeof color.color === "object" && "keys" in color.color && Array.isArray(color.color.keys)) {
			colorKeys.push(
				...color.color.keys.map((key: any) => {
					if (typeof key.value === "object" && key.value.r !== undefined) {
						return {
							color: new Vector3(key.value.r ?? 0, key.value.g ?? 0, key.value.b ?? 0),
							position: key.pos ?? 0,
						};
					}
					return {
						color: new Vector3(0, 0, 0),
						position: key.pos ?? 0,
					};
				})
			);
		}

		// Extract alpha keys from color.alpha.keys (CLinearFunction)
		if (color.alpha && typeof color.alpha === "object" && "keys" in color.alpha && Array.isArray(color.alpha.keys)) {
			alphaKeys.push(
				...color.alpha.keys.map((key: any) => ({
					value: typeof key.value === "number" ? key.value : 1,
					position: key.pos ?? 0,
				}))
			);
		}

		// Fallback to default if no keys found
		if (colorKeys.length === 0) {
			colorKeys.push(
				{ color: new Vector3(0, 0, 0), position: 0 },
				{ color: new Vector3(1, 1, 1), position: 1 }
			);
		}
		if (alphaKeys.length === 0) {
			alphaKeys.push(
				{ value: 1, position: 0 },
				{ value: 1, position: 1 }
			);
		}

		const convertedGradient: any = {
			colorFunctionType: "Gradient",
			data: {
				colorKeys,
				alphaKeys,
			},
		};
		return convertedGradient;
	}

	// RandomColor - similar to ColorRange but selects random from range
	if (color.type === "RandomColor" && color.color1 && color.color2) {
		return {
			colorFunctionType: "RandomColor",
			data: {
				colorA: new Color4(color.color1.r ?? 0, color.color1.g ?? 0, color.color1.b ?? 0, color.color1.a ?? 1),
				colorB: new Color4(color.color2.r ?? 1, color.color2.g ?? 1, color.color2.b ?? 1, color.color2.a ?? 1),
			},
		};
	}

	return null;
}

/**
 * Extracts constant value from quarks value
 */
function _extractConstantValue(value?: IQuarksValue): number | null {
	if (!value) {
		return null;
	}
	if (value.type === "ConstantValue" && value.value !== undefined) {
		return value.value;
	}
	return null;
}


