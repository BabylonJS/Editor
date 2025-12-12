import { Vector3, Quaternion, Matrix, Color4, SolidParticleSystem, SolidParticle, TransformNode } from "babylonjs";
import type { VFXParticleEmitterConfig, VFXEmissionBurst } from "../types/emitterConfig";
import type { VFXValueParser } from "../parsers/VFXValueParser";
import { VFXLogger } from "../loggers/VFXLogger";
import type { VFXLoaderOptions } from "../types/loader";
import type { VFXPerSolidParticleBehaviorFunction, VFXPerParticleContext } from "../types/VFXBehaviorFunction";

/**
 * Emission state matching three.quarks EmissionState structure
 */
interface EmissionState {
	time: number;
	waitEmiting: number;
	travelDistance: number;
	previousWorldPos?: Vector3;
	burstIndex: number;
	burstWaveIndex: number;
	burstParticleIndex: number;
	burstParticleCount: number;
	isBursting: boolean;
}

/**
 * Extended SolidParticleSystem implementing three.quarks Mesh renderMode (renderMode = 2) logic
 * This class replicates the exact behavior of three.quarks ParticleSystem with renderMode = Mesh
 */
export class VFXSolidParticleSystem extends SolidParticleSystem {
	private _emissionState: EmissionState;
	private _config: VFXParticleEmitterConfig;
	private _valueParser: VFXValueParser;
	private _perParticleBehaviors: VFXPerSolidParticleBehaviorFunction[];
	private _parentGroup: TransformNode | null;
	private _vfxTransform: { position: Vector3; rotation: Quaternion; scale: Vector3 } | null;
	private _logger: VFXLogger | null;
	private _options: VFXLoaderOptions | undefined;
	private _name: string;
	private _duration: number;
	private _looping: boolean;
	private _emitEnded: boolean;
	private _normalMatrix: Matrix;
	private _tempVec: Vector3;
	private _tempVec2: Vector3;
	private _tempQuat: Quaternion;

	constructor(
		name: string,
		scene: any,
		config: VFXParticleEmitterConfig,
		valueParser: VFXValueParser,
		options?: {
			updatable?: boolean;
			isPickable?: boolean;
			enableDepthSort?: boolean;
			particleIntersection?: boolean;
			useModelMaterial?: boolean;
			parentGroup?: TransformNode | null;
			vfxTransform?: { position: Vector3; rotation: Quaternion; scale: Vector3 } | null;
			logger?: VFXLogger | null;
			loaderOptions?: VFXLoaderOptions;
		}
	) {
		super(name, scene, options);

		this._name = name;
		this._config = config;
		this._valueParser = valueParser;
		this._perParticleBehaviors = [];
		this._parentGroup = options?.parentGroup ?? null;
		this._vfxTransform = options?.vfxTransform ?? null;
		this._logger = options?.logger ?? null;
		this._options = options?.loaderOptions;
		this._duration = config.duration || 5;
		this._looping = config.looping !== false;
		this._emitEnded = false;
		this._normalMatrix = new Matrix();
		this._tempVec = Vector3.Zero();
		this._tempVec2 = Vector3.Zero();
		this._tempQuat = Quaternion.Identity();

		this.updateParticle = this._updateParticle.bind(this);

		this._emissionState = {
			time: 0,
			waitEmiting: 0,
			travelDistance: 0,
			burstIndex: 0,
			burstWaveIndex: 0,
			burstParticleIndex: 0,
			burstParticleCount: 0,
			isBursting: false,
		};
	}

	private _findDeadParticle(): SolidParticle | null {
		for (let j = 0; j < this.nbParticles; j++) {
			if (!this.particles[j].alive) {
				return this.particles[j];
			}
		}
		return null;
	}

	private _resetParticle(particle: SolidParticle): void {
		particle.age = 0;
		particle.alive = true;
		particle.isVisible = true;
		particle.position.setAll(0);
		particle.velocity.setAll(0);
		particle.rotation.setAll(0);
		particle.scaling.setAll(1);
		if (particle.color) {
			particle.color.set(1, 1, 1, 1);
		} else {
			particle.color = new Color4(1, 1, 1, 1);
		}

		if (!particle.props) {
			particle.props = {};
		}
		particle.props.speedModifier = 1.0;
	}

	private _initializeParticleColor(particle: SolidParticle): void {
		const config = this._config;
		const valueParser = this._valueParser;

		if (!particle.color) {
			particle.color = new Color4(1, 1, 1, 1);
		}

		if (config.startColor !== undefined) {
			const startColor = valueParser.parseConstantColor(config.startColor);
			particle.props!.startColor = startColor.clone();
			particle.color.copyFrom(startColor);
		} else {
			const defaultColor = new Color4(1, 1, 1, 1);
			particle.props!.startColor = defaultColor.clone();
			particle.color.copyFrom(defaultColor);
		}
	}

	private _initializeParticleSpeed(particle: SolidParticle): void {
		const config = this._config;
		const valueParser = this._valueParser;

		if (config.startSpeed !== undefined) {
			const normalizedTime = this._emissionState.time / this._duration;
			particle.props!.startSpeed = valueParser.parseValue(config.startSpeed, normalizedTime);
		} else {
			particle.props!.startSpeed = 0;
		}
	}

	private _initializeParticleLife(particle: SolidParticle): void {
		const config = this._config;
		const valueParser = this._valueParser;

		if (config.startLife !== undefined) {
			const normalizedTime = this._emissionState.time / this._duration;
			particle.lifeTime = valueParser.parseValue(config.startLife, normalizedTime);
		} else {
			particle.lifeTime = 1;
		}
	}

	private _initializeParticleSize(particle: SolidParticle): void {
		const config = this._config;
		const valueParser = this._valueParser;

		if (config.startSize !== undefined) {
			const normalizedTime = this._emissionState.time / this._duration;
			const sizeValue = valueParser.parseValue(config.startSize, normalizedTime);
			particle.props!.startSize = sizeValue;
			particle.scaling.setAll(sizeValue);
		} else {
			particle.props!.startSize = 1;
			particle.scaling.setAll(1);
		}
	}

	private _spawn(count: number): void {
		const emissionState = this._emissionState;

		const emitterMatrix = this._getEmitterMatrix();
		const translation = this._tempVec;
		const quaternion = this._tempQuat;
		const scale = this._tempVec2;
		emitterMatrix.decompose(scale, quaternion, translation);
		emitterMatrix.toNormalMatrix(this._normalMatrix);

		for (let i = 0; i < count; i++) {
			emissionState.burstParticleIndex = i;

			const particle = this._findDeadParticle();
			if (!particle) {
				continue;
			}

			this._resetParticle(particle);
			this._initializeParticleColor(particle);
			this._initializeParticleSpeed(particle);
			this._initializeParticleLife(particle);
			this._initializeParticleSize(particle);

			this._initializeEmitterShape(particle, emissionState);
		}
	}

	private _initializeSphereShape(particle: SolidParticle, radius: number, arc: number, thickness: number, startSpeed: number): void {
		const u = Math.random();
		const v = Math.random();
		const rand = 1 - thickness + Math.random() * thickness;
		const theta = u * arc;
		const phi = Math.acos(2.0 * v - 1.0);
		const sinTheta = Math.sin(theta);
		const cosTheta = Math.cos(theta);
		const sinPhi = Math.sin(phi);
		const cosPhi = Math.cos(phi);

		particle.position.set(sinPhi * cosTheta, sinPhi * sinTheta, cosPhi);
		particle.velocity.copyFrom(particle.position);
		particle.velocity.scaleInPlace(startSpeed);
		particle.position.scaleInPlace(radius * rand);
	}

	private _initializeConeShape(particle: SolidParticle, radius: number, arc: number, thickness: number, angle: number, startSpeed: number): void {
		const u = Math.random();
		const rand = 1 - thickness + Math.random() * thickness;
		const theta = u * arc;
		const r = Math.sqrt(rand);
		const sinTheta = Math.sin(theta);
		const cosTheta = Math.cos(theta);

		particle.position.set(r * cosTheta, r * sinTheta, 0);
		const coneAngle = angle * r;
		particle.velocity.set(0, 0, Math.cos(coneAngle));
		particle.velocity.addInPlace(particle.position.scale(Math.sin(coneAngle)));
		particle.velocity.scaleInPlace(startSpeed);
		particle.position.scaleInPlace(radius);
	}

	private _initializePointShape(particle: SolidParticle, startSpeed: number): void {
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2.0 * Math.random() - 1.0);
		const direction = new Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi));
		particle.position.setAll(0);
		particle.velocity.copyFrom(direction);
		particle.velocity.scaleInPlace(startSpeed);
	}

	private _initializeDefaultShape(particle: SolidParticle, startSpeed: number): void {
		particle.position.setAll(0);
		particle.velocity.set(0, 1, 0);
		particle.velocity.scaleInPlace(startSpeed);
	}

	private _initializeEmitterShape(particle: SolidParticle, emissionState: EmissionState): void {
		const config = this._config;
		const startSpeed = particle.props?.startSpeed ?? 0;

		if (!config.shape) {
			this._initializeDefaultShape(particle, startSpeed);
			return;
		}

		const shapeType = config.shape.type?.toLowerCase();
		const radius = config.shape.radius ?? 1;
		const arc = config.shape.arc ?? Math.PI * 2;
		const thickness = config.shape.thickness ?? 1;
		const angle = config.shape.angle ?? Math.PI / 6;

		if (shapeType === "sphere") {
			this._initializeSphereShape(particle, radius, arc, thickness, startSpeed);
		} else if (shapeType === "cone") {
			this._initializeConeShape(particle, radius, arc, thickness, angle, startSpeed);
		} else if (shapeType === "point") {
			this._initializePointShape(particle, startSpeed);
		} else {
			this._initializeDefaultShape(particle, startSpeed);
		}
	}

	private _getEmitterMatrix(): Matrix {
		const matrix = Matrix.Identity();
		if (this.mesh) {
			this.mesh.computeWorldMatrix(true);
			matrix.copyFrom(this.mesh.getWorldMatrix());
		}
		return matrix;
	}

	private _handleEmissionLooping(): void {
		const emissionState = this._emissionState;

		if (emissionState.time > this._duration) {
			if (this._looping) {
				emissionState.time -= this._duration;
				emissionState.burstIndex = 0;
			} else if (!this._emitEnded) {
				this._emitEnded = true;
			}
		}
	}

	private _spawnFromWaitEmiting(): void {
		const emissionState = this._emissionState;
		const totalSpawn = Math.ceil(emissionState.waitEmiting);
		if (totalSpawn > 0) {
			this._spawn(totalSpawn);
			emissionState.waitEmiting -= totalSpawn;
		}
	}

	private _spawnBursts(): void {
		const emissionState = this._emissionState;
		const config = this._config;
		const valueParser = this._valueParser;

		if (!config.emissionBursts || !Array.isArray(config.emissionBursts)) {
			return;
		}

		while (emissionState.burstIndex < config.emissionBursts.length && this._getBurstTime(config.emissionBursts[emissionState.burstIndex]) <= emissionState.time) {
			const burst = config.emissionBursts[emissionState.burstIndex];
			const burstCount = valueParser.parseConstantValue(burst.count);
			emissionState.isBursting = true;
			emissionState.burstParticleCount = burstCount;
			this._spawn(burstCount);
			emissionState.isBursting = false;
			emissionState.burstIndex++;
		}
	}

	private _accumulateEmission(delta: number): void {
		const emissionState = this._emissionState;
		const config = this._config;
		const valueParser = this._valueParser;

		if (this._emitEnded) {
			return;
		}

		const emissionRate = config.emissionOverTime !== undefined ? valueParser.parseConstantValue(config.emissionOverTime) : 10;
		emissionState.waitEmiting += delta * emissionRate;

		if (config.emissionOverDistance !== undefined && this.mesh && this.mesh.position) {
			const emitPerMeter = valueParser.parseConstantValue(config.emissionOverDistance);
			if (emitPerMeter > 0 && emissionState.previousWorldPos) {
				const distance = Vector3.Distance(emissionState.previousWorldPos, this.mesh.position);
				emissionState.travelDistance += distance;
				if (emissionState.travelDistance * emitPerMeter > 0) {
					const count = Math.floor(emissionState.travelDistance * emitPerMeter);
					emissionState.travelDistance -= count / emitPerMeter;
					emissionState.waitEmiting += count;
				}
			}
			if (!emissionState.previousWorldPos) {
				emissionState.previousWorldPos = Vector3.Zero();
			}
			emissionState.previousWorldPos.copyFrom(this.mesh.position);
		}
	}

	private _emit(delta: number): void {
		this._handleEmissionLooping();
		this._spawnFromWaitEmiting();
		this._spawnBursts();
		this._accumulateEmission(delta);

		this._emissionState.time += delta;
	}

	private _getBurstTime(burst: VFXEmissionBurst): number {
		return this._valueParser.parseConstantValue(burst.time);
	}

	private _setupMeshProperties(): void {
		const config = this._config;

		if (!this.mesh) {
			if (this._logger) {
				this._logger.warn(`  SPS mesh is null in initParticles!`, this._options);
			}
			return;
		}

		if (this._logger) {
			this._logger.log(`  initParticles called for SPS: ${this._name}`, this._options);
			this._logger.log(`  SPS mesh exists: ${this.mesh.name}`, this._options);
		}

		if (config.renderOrder !== undefined) {
			this.mesh.renderingGroupId = config.renderOrder;
			if (this._logger) {
				this._logger.log(`  Set SPS mesh renderingGroupId: ${config.renderOrder}`, this._options);
			}
		}

		if (config.layers !== undefined) {
			this.mesh.layerMask = config.layers;
			if (this._logger) {
				this._logger.log(`  Set SPS mesh layerMask: ${config.layers}`, this._options);
			}
		}

		if (this._parentGroup) {
			this.mesh.setParent(this._parentGroup, false, true);
			if (this._logger) {
				this._logger.log(`  Set SPS mesh parent to: ${this._parentGroup.name}`, this._options);
			}
		} else if (this._logger) {
			this._logger.log(`  No parent group to set for SPS mesh`, this._options);
		}

		if (this._vfxTransform) {
			this.mesh.position.copyFrom(this._vfxTransform.position);
			this.mesh.rotationQuaternion = this._vfxTransform.rotation.clone();
			this.mesh.scaling.copyFrom(this._vfxTransform.scale);

			if (this._logger) {
				const rot = this.mesh.rotationQuaternion;
				this._logger.log(
					`  Applied VFX transform to SPS mesh: pos=(${this._vfxTransform.position.x.toFixed(2)}, ${this._vfxTransform.position.y.toFixed(2)}, ${this._vfxTransform.position.z.toFixed(2)}), rot=(${rot ? rot.x.toFixed(4) : 0}, ${rot ? rot.y.toFixed(4) : 0}, ${rot ? rot.z.toFixed(4) : 0}, ${rot ? rot.w.toFixed(4) : 1}), scale=(${this._vfxTransform.scale.x.toFixed(2)}, ${this._vfxTransform.scale.y.toFixed(2)}, ${this._vfxTransform.scale.z.toFixed(2)})`,
					this._options
				);
			}
		} else if (this._logger) {
			this._logger.log(`  No VFX transform to apply to SPS mesh`, this._options);
		}
	}

	private _initializeDeadParticles(): void {
		for (let i = 0; i < this.nbParticles; i++) {
			const particle = this.particles[i];
			particle.alive = false;
			particle.isVisible = false;
			particle.age = 0;
			particle.lifeTime = Infinity;
			particle.position.setAll(0);
			particle.velocity.setAll(0);
			particle.rotation.setAll(0);
			particle.scaling.setAll(1);
			if (particle.color) {
				particle.color.set(1, 1, 1, 1);
			} else {
				particle.color = new Color4(1, 1, 1, 1);
			}
		}
	}

	private _resetEmissionState(): void {
		this._emissionState.time = 0;
		this._emissionState.waitEmiting = 0;
		this._emissionState.travelDistance = 0;
		this._emissionState.burstIndex = 0;
		this._emissionState.burstWaveIndex = 0;
		this._emissionState.burstParticleIndex = 0;
		this._emissionState.burstParticleCount = 0;
		this._emissionState.isBursting = false;
		if (this.mesh && this.mesh.position) {
			this._emissionState.previousWorldPos = this.mesh.position.clone();
		}
		this._emitEnded = false;
	}

	public override initParticles(): void {
		this._setupMeshProperties();
		this._initializeDeadParticles();
		this._resetEmissionState();
	}

	public setPerParticleBehaviors(functions: VFXPerSolidParticleBehaviorFunction[]): void {
		this._perParticleBehaviors = functions;
	}

	public override beforeUpdateParticles(start?: number, stop?: number, update?: boolean): void {
		super.beforeUpdateParticles(start, stop, update);

		if (!this._started || this._stopped) {
			return;
		}

		const deltaTime = this._scaledUpdateSpeed || 0.016;

		this._emit(deltaTime);
		this._emissionState.time += deltaTime;
	}

	private _updateParticle(particle: SolidParticle): SolidParticle {
		if (!particle.alive) {
			particle.isVisible = false;

			if (this._positions32 && particle._model) {
				const shape = particle._model._shape;
				const startIdx = particle._pos;
				for (let pt = 0; pt < shape.length; pt++) {
					const idx = startIdx + pt * 3;
					this._positions32[idx] = 0;
					this._positions32[idx + 1] = 0;
					this._positions32[idx + 2] = 0;
				}
			}

			return particle;
		}

		if (particle.age < 0) {
			return particle;
		}

		const lifeRatio = particle.age / particle.lifeTime;
		const startSpeed = particle.props?.startSpeed ?? 0;
		const startSize = particle.props?.startSize ?? 1;
		const startColor = particle.props?.startColor ?? new Color4(1, 1, 1, 1);

		const context: VFXPerParticleContext = {
			lifeRatio,
			startSpeed,
			startSize,
			startColor: { r: startColor.r, g: startColor.g, b: startColor.b, a: startColor.a },
			updateSpeed: this.updateSpeed,
			valueParser: this._valueParser,
		};

		for (const behaviorFn of this._perParticleBehaviors) {
			behaviorFn(particle, context);
		}

		const speedModifier = particle.props?.speedModifier ?? 1.0;
		particle.position.addInPlace(particle.velocity.scale(this.updateSpeed * speedModifier));

		return particle;
	}
}
