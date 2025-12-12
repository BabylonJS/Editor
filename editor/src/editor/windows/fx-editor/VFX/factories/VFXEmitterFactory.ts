import { Mesh, CreatePlane, Nullable, Color4, Matrix, ParticleSystem, SolidParticleSystem, Constants, Vector3, Quaternion } from "babylonjs";
import type { VFXEmitterData } from "../types/emitter";
import type { VFXParseContext } from "../types/context";
import { VFXLogger } from "../loggers/VFXLogger";
import { VFXValueParser } from "../parsers/VFXValueParser";
import type { IVFXMaterialFactory, IVFXGeometryFactory } from "../types/factories";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import type { VFXBehavior, VFXEmissionBurst } from "../types";
import type { VFXParticleEmitterConfig } from "../types/emitterConfig";

/**
 * Parsed values for particle system creation
 */
type ParsedParticleValues = {
	emissionRate: number;
	duration: number;
	capacity: number;
	lifeTime: { min: number; max: number };
	speed: { min: number; max: number };
	avgStartSpeed: number;
	size: { min: number; max: number };
	avgStartSize: number;
	startColor: Color4;
};

/**
 * Factory for creating particle emitters (ParticleSystem and SolidParticleSystem)
 */
export class VFXEmitterFactory {
	private _logger: VFXLogger;
	private _context: VFXParseContext;
	private _valueParser: VFXValueParser;
	private _materialFactory: IVFXMaterialFactory;
	private _geometryFactory: IVFXGeometryFactory;

	constructor(context: VFXParseContext, valueParser: VFXValueParser, materialFactory: IVFXMaterialFactory, geometryFactory: IVFXGeometryFactory) {
		this._context = context;
		this._logger = new VFXLogger("[VFXEmitterFactory]");
		this._valueParser = valueParser;
		this._materialFactory = materialFactory;
		this._geometryFactory = geometryFactory;
	}

	/**
	 * Create a particle emitter from emitter data
	 */
	public createEmitter(emitterData: VFXEmitterData): Nullable<ParticleSystem | SolidParticleSystem> {
		const { options } = this._context;

		// Use systemType from emitter data (determined during conversion)
		const systemType = emitterData.vfxEmitter?.systemType || "base";
		this._logger.log(`Using ${systemType === "solid" ? "SolidParticleSystem" : "ParticleSystem"}`, options);

		if (systemType === "solid") {
			return this._createSolidParticleSystem(emitterData);
		} else {
			return this._createParticleSystem(emitterData);
		}
	}

	/**
	 * Create a ParticleSystem (billboard-based particles)
	 */
	private _createParticleSystem(emitterData: VFXEmitterData): Nullable<ParticleSystem> {
		const { name, config } = emitterData;
		const { options } = this._context;

		this._logger.log(`Creating ParticleSystem: ${name}`, options);

		const parsedValues = this._parseParticleSystemValues(config);
		const particleSystem = this._createParticleSystemInstance(name, parsedValues);

		this._configureBasicProperties(particleSystem, parsedValues);
		this._configureRotation(particleSystem, config);
		this._configureSpriteTiles(particleSystem, config);
		this._configureRendering(particleSystem, config);
		this._setEmitterShape(particleSystem, config.shape, emitterData.cumulativeScale, emitterData.matrix);
		this._applyTextureAndBlendMode(particleSystem, emitterData.materialId);
		this._applyEmissionBurstsIfNeeded(particleSystem, config, parsedValues.emissionRate, parsedValues.duration);
		this._applyBehaviorsIfNeeded(particleSystem, config.behaviors);
		this._configureWorldSpace(particleSystem, config);
		this._configureLooping(particleSystem, config, parsedValues.duration);
		this._configureRenderMode(particleSystem, config);
		this._configureSoftParticlesAndAutoDestroy(particleSystem, config);

		this._logger.log(`ParticleSystem created: ${name}`, options);
		return particleSystem;
	}

	/**
	 * Parses all particle system values from config
	 */
	private _parseParticleSystemValues(config: VFXParticleEmitterConfig): ParsedParticleValues {
		const emissionRate = config.emissionOverTime !== undefined ? this._valueParser.parseConstantValue(config.emissionOverTime) : 10;
		const duration = config.duration || 5;
		const capacity = Math.ceil(emissionRate * duration * 2);

		const lifeTime = config.startLife !== undefined ? this._valueParser.parseIntervalValue(config.startLife) : { min: 1, max: 1 };
		const speed = config.startSpeed !== undefined ? this._valueParser.parseIntervalValue(config.startSpeed) : { min: 1, max: 1 };
		const size = config.startSize !== undefined ? this._valueParser.parseIntervalValue(config.startSize) : { min: 1, max: 1 };
		const startColor = config.startColor !== undefined ? this._valueParser.parseConstantColor(config.startColor) : new Color4(1, 1, 1, 1);

		this._logParsedValues(emissionRate, duration, capacity, lifeTime, speed, size, startColor);

		return {
			emissionRate,
			duration,
			capacity,
			lifeTime,
			speed,
			avgStartSpeed: (speed.min + speed.max) / 2,
			size,
			avgStartSize: (size.min + size.max) / 2,
			startColor,
		};
	}

	/**
	 * Logs parsed particle system values
	 */
	private _logParsedValues(
		emissionRate: number,
		duration: number,
		capacity: number,
		lifeTime: { min: number; max: number },
		speed: { min: number; max: number },
		size: { min: number; max: number },
		startColor: Color4
	): void {
		const { options } = this._context;
		this._logger.log(`  Emission rate: ${emissionRate}, Duration: ${duration}, Capacity: ${capacity}`, options);
		this._logger.log(`  Life time: ${lifeTime.min} - ${lifeTime.max}`, options);
		this._logger.log(`  Speed: ${speed.min} - ${speed.max}`, options);
		this._logger.log(`  Size: ${size.min} - ${size.max}`, options);
		this._logger.log(`  Start color: R=${startColor.r}, G=${startColor.g}, B=${startColor.b}, A=${startColor.a}`, options);
	}

	/**
	 * Creates ParticleSystem instance
	 */
	private _createParticleSystemInstance(name: string, values: ParsedParticleValues): VFXParticleSystem {
		const { scene } = this._context;
		return new VFXParticleSystem(name, values.capacity, scene, values.avgStartSpeed, values.avgStartSize, values.startColor);
	}

	/**
	 * Configures basic particle system properties
	 */
	private _configureBasicProperties(particleSystem: ParticleSystem, values: ParsedParticleValues): void {
		particleSystem.targetStopDuration = values.duration;
		particleSystem.emitRate = values.emissionRate;
		particleSystem.manualEmitCount = -1;

		particleSystem.minLifeTime = values.lifeTime.min;
		particleSystem.maxLifeTime = values.lifeTime.max;

		particleSystem.minEmitPower = values.speed.min;
		particleSystem.maxEmitPower = values.speed.max;
		particleSystem.minSize = values.size.min;
		particleSystem.maxSize = values.size.max;

		particleSystem.color1 = values.startColor;
		particleSystem.color2 = values.startColor;
		particleSystem.colorDead = new Color4(values.startColor.r, values.startColor.g, values.startColor.b, 0);
	}

	/**
	 * Configures rotation settings
	 */
	private _configureRotation(particleSystem: ParticleSystem, config: VFXParticleEmitterConfig): void {
		if (!config.startRotation) {
			return;
		}

		if (this._isEulerRotation(config.startRotation)) {
			if (config.startRotation.angleZ !== undefined) {
				const angleZ = this._valueParser.parseIntervalValue(config.startRotation.angleZ);
				particleSystem.minInitialRotation = angleZ.min;
				particleSystem.maxInitialRotation = angleZ.max;
			}
		} else {
			const rotation = this._valueParser.parseIntervalValue(config.startRotation as any);
			particleSystem.minInitialRotation = rotation.min;
			particleSystem.maxInitialRotation = rotation.max;
		}
	}

	/**
	 * Checks if rotation is Euler type
	 */
	private _isEulerRotation(rotation: any): rotation is { type: "Euler"; angleZ?: any } {
		return typeof rotation === "object" && rotation !== null && "type" in rotation && rotation.type === "Euler";
	}

	/**
	 * Configures sprite tiles for animation sheets
	 */
	private _configureSpriteTiles(particleSystem: ParticleSystem, config: VFXParticleEmitterConfig): void {
		if (config.uTileCount === undefined || config.vTileCount === undefined) {
			return;
		}

		if (config.uTileCount > 1 || config.vTileCount > 1) {
			particleSystem.isAnimationSheetEnabled = true;
			particleSystem.spriteCellWidth = config.uTileCount;
			particleSystem.spriteCellHeight = config.vTileCount;

			if (config.startTileIndex !== undefined) {
				const startTile = this._valueParser.parseConstantValue(config.startTileIndex);
				particleSystem.startSpriteCellID = Math.floor(startTile);
				particleSystem.endSpriteCellID = Math.floor(startTile);
			}
		}
	}

	/**
	 * Configures rendering properties (render order and layers)
	 */
	private _configureRendering(particleSystem: ParticleSystem, config: VFXParticleEmitterConfig): void {
		if (config.renderOrder !== undefined) {
			particleSystem.renderingGroupId = config.renderOrder;
		}
		if (config.layers !== undefined) {
			particleSystem.layerMask = config.layers;
		}
	}

	/**
	 * Applies texture and blend mode from material
	 */
	private _applyTextureAndBlendMode(particleSystem: ParticleSystem, materialId: string | undefined): void {
		if (!materialId) {
			return;
		}

		const texture = this._materialFactory.createTexture(materialId);
		if (!texture) {
			return;
		}

		particleSystem.particleTexture = texture;
		const blendMode = this._getBlendModeFromMaterial(materialId);
		if (blendMode !== undefined) {
			particleSystem.blendMode = blendMode;
		}
	}

	/**
	 * Gets blend mode from material blending value
	 */
	private _getBlendModeFromMaterial(materialId: string): number | undefined {
		const { jsonData } = this._context;
		const material = jsonData.materials?.find((m: any) => m.uuid === materialId);

		if (material?.blending === undefined) {
			return undefined;
		}

		const blendModeMap: Record<number, number> = {
			0: Constants.ALPHA_DISABLE, // NoBlending
			1: Constants.ALPHA_COMBINE, // NormalBlending
			2: Constants.ALPHA_ADD, // AdditiveBlending
		};

		return blendModeMap[material.blending];
	}

	/**
	 * Applies emission bursts if configured
	 */
	private _applyEmissionBurstsIfNeeded(particleSystem: ParticleSystem, config: VFXParticleEmitterConfig, emissionRate: number, duration: number): void {
		if (config.emissionBursts && Array.isArray(config.emissionBursts) && config.emissionBursts.length > 0) {
			this._applyEmissionBursts(particleSystem, config.emissionBursts, emissionRate, duration);
		}
	}

	/**
	 * Applies behaviors if configured
	 */
	private _applyBehaviorsIfNeeded(particleSystem: ParticleSystem, behaviors: VFXBehavior[] | undefined): void {
		if (behaviors && Array.isArray(behaviors) && behaviors.length > 0) {
			this._applyBehaviorsToPS(particleSystem, behaviors);
		}
	}

	/**
	 * Configures world space setting
	 */
	private _configureWorldSpace(particleSystem: ParticleSystem, config: VFXParticleEmitterConfig): void {
		if (config.worldSpace !== undefined) {
			particleSystem.isLocal = !config.worldSpace;
			const { options } = this._context;
			this._logger.log(`  World space: ${config.worldSpace}`, options);
		}
	}

	/**
	 * Configures looping setting
	 */
	private _configureLooping(particleSystem: ParticleSystem, config: VFXParticleEmitterConfig, duration: number): void {
		if (config.looping !== undefined) {
			particleSystem.targetStopDuration = config.looping ? 0 : duration;
			const { options } = this._context;
			this._logger.log(`  Looping: ${config.looping}`, options);
		}
	}

	/**
	 * Configures render mode
	 */
	private _configureRenderMode(particleSystem: ParticleSystem, config: VFXParticleEmitterConfig): void {
		if (config.renderMode === undefined) {
			return;
		}

		const { options } = this._context;
		const renderModeMap: Record<number, () => void> = {
			0: () => {
				particleSystem.isBillboardBased = true;
				this._logger.log(`  Render mode: Billboard`, options);
			},
			1: () => {
				particleSystem.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
				this._logger.log(`  Render mode: Stretched Billboard`, options);
			},
		};

		const handler = renderModeMap[config.renderMode];
		if (handler) {
			handler();
		}
	}

	/**
	 * Configures soft particles and auto destroy settings
	 */
	private _configureSoftParticlesAndAutoDestroy(particleSystem: ParticleSystem, config: VFXParticleEmitterConfig): void {
		const { options } = this._context;

		if (config.softParticles !== undefined) {
			this._logger.log(`  Soft particles: ${config.softParticles} (not fully supported)`, options);
		}

		if (config.autoDestroy !== undefined) {
			particleSystem.disposeOnStop = config.autoDestroy;
			this._logger.log(`  Auto destroy: ${config.autoDestroy}`, options);
		}
	}

	/**
	 * Create a SolidParticleSystem (mesh-based particles)
	 */
	private _createSolidParticleSystem(emitterData: VFXEmitterData): Nullable<SolidParticleSystem> {
		const { name, config } = emitterData;
		const { options } = this._context;

		this._logger.log(`Creating SolidParticleSystem: ${name}`, options);

		const capacity = this._calculateSPSCapacity(config);
		const vfxTransform = this._getVFXTransform(emitterData);
		const sps = this._createSPSInstance(name, config, emitterData, vfxTransform);

		const particleMesh = this._createOrLoadParticleMesh(name, config, emitterData);
		if (!particleMesh) {
			return null;
		}

		this._addShapeToSPS(sps, particleMesh, capacity);
		this._configureSPSBillboard(sps, config);
		this._applyBehaviors(sps, config.behaviors || []);

		particleMesh.dispose();

		this._logger.log(`SolidParticleSystem created: ${name}`, options);
		return sps;
	}

	/**
	 * Calculates capacity for SolidParticleSystem
	 */
	private _calculateSPSCapacity(config: VFXParticleEmitterConfig): number {
		const { options } = this._context;
		const emissionRate = config.emissionOverTime !== undefined ? this._valueParser.parseConstantValue(config.emissionOverTime) : 10;
		const particleLifetime = config.duration || 5;
		const isLooping = config.looping !== false;

		if (isLooping) {
			const capacity = Math.max(Math.ceil(emissionRate * particleLifetime), 1);
			this._logger.log(`  Looping system: Emission rate: ${emissionRate} particles/sec, Particle lifetime: ${particleLifetime} sec, Capacity: ${capacity}`, options);
			return capacity;
		} else {
			const capacity = Math.ceil(emissionRate * particleLifetime * 2);
			this._logger.log(`  Non-looping system: Emission rate: ${emissionRate} particles/sec, Particle lifetime: ${particleLifetime} sec, Capacity: ${capacity}`, options);
			return capacity;
		}
	}

	/**
	 * Gets VFX transform from emitter data
	 */
	private _getVFXTransform(emitterData: VFXEmitterData): { position: Vector3; rotation: Quaternion; scale: Vector3 } | null {
		const vfxEmitter = emitterData.vfxEmitter;
		return vfxEmitter?.transform || null;
	}

	/**
	 * Creates SolidParticleSystem instance
	 */
	private _createSPSInstance(
		name: string,
		config: VFXParticleEmitterConfig,
		emitterData: VFXEmitterData,
		vfxTransform: { position: Vector3; rotation: Quaternion; scale: Vector3 } | null
	): VFXSolidParticleSystem {
		const { scene, options } = this._context;
		const sps = new VFXSolidParticleSystem(name, scene, config, {
			updatable: true,
			isPickable: false,
			enableDepthSort: false,
			particleIntersection: false,
			useModelMaterial: true,
			parentGroup: emitterData.parentGroup,
			vfxTransform,
			logger: this._logger,
			loaderOptions: options,
		});
		// Set parent after creation (will apply to mesh)
		if (emitterData.parentGroup) {
			sps.parent = emitterData.parentGroup;
		}
		return sps;
	}

	/**
	 * Creates or loads particle mesh for SPS
	 */
	private _createOrLoadParticleMesh(name: string, config: VFXParticleEmitterConfig, emitterData: VFXEmitterData): Nullable<Mesh> {
		const { scene, options } = this._context;
		let particleMesh = this._loadParticleGeometry(config, emitterData, name);

		if (!particleMesh) {
			particleMesh = this._createDefaultPlaneMesh(name, scene);
			this._applyMaterialToMesh(particleMesh, emitterData.materialId, name);
		} else {
			this._ensureMaterialApplied(particleMesh, emitterData.materialId, name);
		}

		if (!particleMesh) {
			this._logger.warn(`  Cannot add shape to SPS: particleMesh is null`, options);
		}

		return particleMesh;
	}

	/**
	 * Loads particle geometry if specified
	 */
	private _loadParticleGeometry(config: VFXParticleEmitterConfig, emitterData: VFXEmitterData, name: string): Nullable<Mesh> {
		const { options } = this._context;

		if (!config.instancingGeometry) {
			return null;
		}

		this._logger.log(`  Loading geometry: ${config.instancingGeometry}`, options);
		const mesh = this._geometryFactory.createMesh(config.instancingGeometry, emitterData.materialId, name + "_shape");
		if (!mesh) {
			this._logger.warn(`  Failed to load geometry ${config.instancingGeometry}, will create default plane`, options);
		}

		return mesh;
	}

	/**
	 * Creates default plane mesh
	 */
	private _createDefaultPlaneMesh(name: string, scene: any): Mesh {
		const { options } = this._context;
		this._logger.log(`  Creating default plane geometry`, options);
		return CreatePlane(name + "_shape", { width: 1, height: 1 }, scene);
	}

	/**
	 * Applies material to mesh
	 */
	private _applyMaterialToMesh(mesh: Mesh | null, materialId: string | undefined, name: string): void {
		if (!mesh || !materialId) {
			return;
		}

		const material = this._materialFactory.createMaterial(materialId, name);
		if (material) {
			mesh.material = material;
		}
	}

	/**
	 * Ensures material is applied to mesh if missing
	 */
	private _ensureMaterialApplied(mesh: Mesh, materialId: string | undefined, name: string): void {
		if (materialId && !mesh.material) {
			this._applyMaterialToMesh(mesh, materialId, name);
		}
	}

	/**
	 * Adds shape to SPS
	 */
	private _addShapeToSPS(sps: SolidParticleSystem, particleMesh: Mesh, capacity: number): void {
		const { options } = this._context;
		this._logger.log(`  Adding shape to SPS: mesh name=${particleMesh.name}, hasMaterial=${!!particleMesh.material}`, options);
		sps.addShape(particleMesh, capacity);
	}

	/**
	 * Configures billboard mode for SPS
	 */
	private _configureSPSBillboard(sps: SolidParticleSystem, config: VFXParticleEmitterConfig): void {
		if (config.renderMode === 0 || config.renderMode === 1) {
			sps.billboard = true;
		}
	}

	/**
	 * Set the emitter shape based on Three.js shape configuration
	 */
	private _setEmitterShape(particleSystem: ParticleSystem, shape: any, cumulativeScale: Vector3, matrix?: number[]): void {
		if (!shape || !shape.type) {
			particleSystem.createPointEmitter(Vector3.Zero(), Vector3.Zero());
			return;
		}

		const rotationMatrix = this._extractRotationMatrix(matrix);
		const shapeHandler = this._getShapeHandler(shape.type.toLowerCase());

		if (shapeHandler) {
			shapeHandler(particleSystem, shape, cumulativeScale, rotationMatrix);
		} else {
			this._createDefaultPointEmitter(particleSystem, rotationMatrix);
		}
	}

	/**
	 * Extracts rotation matrix from Three.js matrix array
	 */
	private _extractRotationMatrix(matrix: number[] | undefined): Matrix | null {
		if (!matrix || matrix.length < 16) {
			return null;
		}

		const { options } = this._context;
		const mat = Matrix.FromArray(matrix);
		mat.transpose();
		const rotationMatrix = mat.getRotationMatrix();
		this._logger.log(`  Extracted rotation from matrix`, options);
		return rotationMatrix;
	}

	/**
	 * Gets shape handler function for given shape type
	 */
	private _getShapeHandler(shapeType: string): ((ps: ParticleSystem, shape: any, scale: Vector3, rotation: Matrix | null) => void) | null {
		const shapeHandlers: Record<string, (ps: ParticleSystem, shape: any, scale: Vector3, rotation: Matrix | null) => void> = {
			cone: this._createConeEmitter.bind(this),
			sphere: this._createSphereEmitter.bind(this),
			point: this._createPointEmitter.bind(this),
			box: this._createBoxEmitter.bind(this),
			hemisphere: this._createHemisphereEmitter.bind(this),
			cylinder: this._createCylinderEmitter.bind(this),
		};

		return shapeHandlers[shapeType] || null;
	}

	/**
	 * Applies rotation to default direction vector
	 */
	private _applyRotationToDirection(defaultDir: Vector3, rotationMatrix: Matrix | null): Vector3 {
		if (!rotationMatrix) {
			return defaultDir;
		}

		const rotatedDir = Vector3.Zero();
		Vector3.TransformNormalToRef(defaultDir, rotationMatrix, rotatedDir);
		return rotatedDir;
	}

	/**
	 * Creates cone emitter
	 */
	private _createConeEmitter(particleSystem: ParticleSystem, shape: any, scale: Vector3, rotationMatrix: Matrix | null): void {
		const { options } = this._context;
		const radius = (shape.radius || 1) * ((scale.x + scale.z) / 2);
		const angle = shape.angle !== undefined ? shape.angle : Math.PI / 4;
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			particleSystem.createDirectedConeEmitter(radius, angle, rotatedDir, rotatedDir);
			this._logger.log(
				`  Created directed cone emitter with rotated direction: (${rotatedDir.x.toFixed(2)}, ${rotatedDir.y.toFixed(2)}, ${rotatedDir.z.toFixed(2)})`,
				options
			);
		} else {
			particleSystem.createConeEmitter(radius, angle);
		}
	}

	/**
	 * Creates sphere emitter
	 */
	private _createSphereEmitter(particleSystem: ParticleSystem, shape: any, scale: Vector3, rotationMatrix: Matrix | null): void {
		const { options } = this._context;
		const radius = (shape.radius || 1) * ((scale.x + scale.y + scale.z) / 3);
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			particleSystem.createDirectedSphereEmitter(radius, rotatedDir, rotatedDir);
			this._logger.log(
				`  Created directed sphere emitter with rotated direction: (${rotatedDir.x.toFixed(2)}, ${rotatedDir.y.toFixed(2)}, ${rotatedDir.z.toFixed(2)})`,
				options
			);
		} else {
			particleSystem.createSphereEmitter(radius);
		}
	}

	/**
	 * Creates point emitter
	 */
	private _createPointEmitter(particleSystem: ParticleSystem, _shape: any, _scale: Vector3, rotationMatrix: Matrix | null): void {
		const { options } = this._context;
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			particleSystem.createPointEmitter(rotatedDir, rotatedDir);
			this._logger.log(`  Created point emitter with rotated direction: (${rotatedDir.x.toFixed(2)}, ${rotatedDir.y.toFixed(2)}, ${rotatedDir.z.toFixed(2)})`, options);
		} else {
			particleSystem.createPointEmitter(Vector3.Zero(), Vector3.Zero());
		}
	}

	/**
	 * Creates box emitter
	 */
	private _createBoxEmitter(particleSystem: ParticleSystem, shape: any, scale: Vector3, rotationMatrix: Matrix | null): void {
		const { options } = this._context;
		const boxSize = (shape.size || [1, 1, 1]).map((s: number, i: number) => s * [scale.x, scale.y, scale.z][i]);
		const minBox = new Vector3(-boxSize[0] / 2, -boxSize[1] / 2, -boxSize[2] / 2);
		const maxBox = new Vector3(boxSize[0] / 2, boxSize[1] / 2, boxSize[2] / 2);
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			particleSystem.createBoxEmitter(rotatedDir, rotatedDir, minBox, maxBox);
			this._logger.log(`  Created box emitter with rotated direction: (${rotatedDir.x.toFixed(2)}, ${rotatedDir.y.toFixed(2)}, ${rotatedDir.z.toFixed(2)})`, options);
		} else {
			particleSystem.createBoxEmitter(Vector3.Zero(), Vector3.Zero(), minBox, maxBox);
		}
	}

	/**
	 * Creates hemisphere emitter
	 */
	private _createHemisphereEmitter(particleSystem: ParticleSystem, shape: any, scale: Vector3, _rotationMatrix: Matrix | null): void {
		const radius = (shape.radius || 1) * ((scale.x + scale.y + scale.z) / 3);
		particleSystem.createHemisphericEmitter(radius);
	}

	/**
	 * Creates cylinder emitter
	 */
	private _createCylinderEmitter(particleSystem: ParticleSystem, shape: any, scale: Vector3, rotationMatrix: Matrix | null): void {
		const { options } = this._context;
		const radius = (shape.radius || 1) * ((scale.x + scale.z) / 2);
		const height = (shape.height || 1) * scale.y;
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			particleSystem.createDirectedCylinderEmitter(radius, height, 1, rotatedDir, rotatedDir);
			this._logger.log(
				`  Created directed cylinder emitter with rotated direction: (${rotatedDir.x.toFixed(2)}, ${rotatedDir.y.toFixed(2)}, ${rotatedDir.z.toFixed(2)})`,
				options
			);
		} else {
			particleSystem.createCylinderEmitter(radius, height);
		}
	}

	/**
	 * Creates default point emitter
	 */
	private _createDefaultPointEmitter(particleSystem: ParticleSystem, rotationMatrix: Matrix | null): void {
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			particleSystem.createPointEmitter(rotatedDir, rotatedDir);
		} else {
			particleSystem.createPointEmitter(Vector3.Zero(), Vector3.Zero());
		}
	}

	/**
	 * Apply emission bursts via emit rate gradients
	 */
	private _applyEmissionBursts(particleSystem: ParticleSystem, bursts: VFXEmissionBurst[], baseEmitRate: number, duration: number): void {
		for (const burst of bursts) {
			if (burst.time === undefined || burst.count === undefined) {
				continue;
			}

			const burstTime = this._valueParser.parseConstantValue(burst.time);
			const burstCount = this._valueParser.parseConstantValue(burst.count);
			const timeRatio = Math.min(Math.max(burstTime / duration, 0), 1);
			const windowSize = 0.02;
			const burstEmitRate = burstCount / windowSize;

			const beforeTime = Math.max(0, timeRatio - windowSize);
			const afterTime = Math.min(1, timeRatio + windowSize);

			particleSystem.addEmitRateGradient(beforeTime, baseEmitRate);
			particleSystem.addEmitRateGradient(timeRatio, burstEmitRate);
			particleSystem.addEmitRateGradient(afterTime, baseEmitRate);
		}
	}

	/**
	 * Apply behaviors to ParticleSystem
	 * Simply sets behaviorConfigs - the system will apply them automatically via proxy
	 */
	private _applyBehaviors(particleSystem: VFXParticleSystem | VFXSolidParticleSystem, behaviors: VFXBehavior[]): void {
		if (!particleSystem || !particleSystem.behaviorConfigs) {
			return;
		}
		particleSystem.behaviorConfigs.length = 0;
		particleSystem.behaviorConfigs.push(...(behaviors || []));
	}
}
