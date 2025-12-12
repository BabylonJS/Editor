import { Mesh, CreatePlane, Nullable, Color4, Matrix, ParticleSystem, SolidParticleSystem, Constants, Vector3, Quaternion, Texture } from "babylonjs";
import type { VFXEmitterData } from "../types/emitter";
import type { VFXParseContext } from "../types/context";
import { VFXLogger } from "../loggers/VFXLogger";
import { VFXValueUtils } from "../utils/valueParser";
import type { IVFXMaterialFactory, IVFXGeometryFactory } from "../types/factories";
import { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";
import { VFXParticleSystem } from "../systems/VFXParticleSystem";
import type { VFXParticleEmitterConfig } from "../types/emitterConfig";

/**
 * Factory for creating particle emitters (ParticleSystem and SolidParticleSystem)
 */
export class VFXEmitterFactory {
	private _logger: VFXLogger;
	private _context: VFXParseContext;
	private _materialFactory: IVFXMaterialFactory;
	private _geometryFactory: IVFXGeometryFactory;

	constructor(context: VFXParseContext, materialFactory: IVFXMaterialFactory, geometryFactory: IVFXGeometryFactory) {
		this._context = context;
		this._logger = new VFXLogger("[VFXEmitterFactory]");
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
		const { options, scene } = this._context;

		this._logger.log(`Creating ParticleSystem: ${name}`, options);

		// Parse values for capacity calculation
		const emissionRate = config.emissionOverTime !== undefined ? VFXValueUtils.parseConstantValue(config.emissionOverTime) : 10;
		const duration = config.duration || 5;
		const capacity = Math.ceil(emissionRate * duration * 2);
		const speed = config.startSpeed !== undefined ? VFXValueUtils.parseIntervalValue(config.startSpeed) : { min: 1, max: 1 };
		const size = config.startSize !== undefined ? VFXValueUtils.parseIntervalValue(config.startSize) : { min: 1, max: 1 };
		const startColor = config.startColor !== undefined ? VFXValueUtils.parseConstantColor(config.startColor) : new Color4(1, 1, 1, 1);
		const avgStartSpeed = (speed.min + speed.max) / 2;
		const avgStartSize = (size.min + size.max) / 2;

		// Create instance
		const particleSystem = new VFXParticleSystem(name, capacity, scene, avgStartSpeed, avgStartSize, startColor);

		// Get texture and blend mode
		const texture: Texture | undefined = emitterData.materialId ? this._materialFactory.createTexture(emitterData.materialId) || undefined : undefined;
		const blendMode = emitterData.materialId ? this._getBlendModeFromMaterial(emitterData.materialId) : undefined;

		// Extract rotation matrix
		const rotationMatrix = this._extractRotationMatrix(emitterData.matrix);

		// Configure from config
		particleSystem.configureFromConfig(config, {
			texture,
			blendMode,
			emitterShape: {
				shape: config.shape,
				cumulativeScale: emitterData.cumulativeScale,
				rotationMatrix,
			},
		});

		this._logger.log(`ParticleSystem created: ${name}`, options);
		return particleSystem;
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

		// Apply behaviors
		if (config.behaviors && Array.isArray(config.behaviors) && config.behaviors.length > 0) {
			sps.behaviorConfigs.length = 0;
			sps.behaviorConfigs.push(...config.behaviors);
		}

		particleMesh.dispose();

		this._logger.log(`SolidParticleSystem created: ${name}`, options);
		return sps;
	}

	/**
	 * Calculates capacity for SolidParticleSystem
	 */
	private _calculateSPSCapacity(config: VFXParticleEmitterConfig): number {
		const { options } = this._context;
		const emissionRate = config.emissionOverTime !== undefined ? VFXValueUtils.parseConstantValue(config.emissionOverTime) : 10;
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
	 * Extracts rotation matrix from Three.js matrix array
	 */
	private _extractRotationMatrix(matrix: number[] | undefined): Matrix | null {
		if (!matrix || matrix.length < 16) {
			return null;
		}

		const mat = Matrix.FromArray(matrix);
		mat.transpose();
		return mat.getRotationMatrix();
	}
}
