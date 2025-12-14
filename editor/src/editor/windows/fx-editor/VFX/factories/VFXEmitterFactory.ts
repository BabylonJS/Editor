import { ParticleSystem, Vector3, Matrix } from "babylonjs";
import type { VFXShape } from "../types/shapes";
import type { VFXSolidParticleSystem } from "../systems/VFXSolidParticleSystem";

/**
 * Factory for creating emitters for particle systems
 * Handles both ParticleSystem and SolidParticleSystem emitter creation
 */
export class VFXEmitterFactory {
	/**
	 * Create emitter for ParticleSystem
	 * Applies emitter shape to the particle system
	 */
	public createParticleSystemEmitter(particleSystem: ParticleSystem, shape: VFXShape | undefined, cumulativeScale: Vector3, rotationMatrix: Matrix | null): void {
		if (!shape || !shape.type) {
			this._createPointEmitter(particleSystem, Vector3.Zero(), Vector3.Zero());
			return;
		}

		const shapeType = shape.type.toLowerCase();
		const shapeHandlers: Record<string, (shape: VFXShape, scale: Vector3, rotation: Matrix | null) => void> = {
			cone: this._createConeEmitter.bind(this, particleSystem),
			sphere: this._createSphereEmitter.bind(this, particleSystem),
			point: this._createPointEmitter.bind(this, particleSystem),
			box: this._createBoxEmitter.bind(this, particleSystem),
			hemisphere: this._createHemisphereEmitter.bind(this, particleSystem),
			cylinder: this._createCylinderEmitter.bind(this, particleSystem),
		};

		const handler = shapeHandlers[shapeType];
		if (handler) {
			handler(shape, cumulativeScale, rotationMatrix);
		} else {
			this._createDefaultPointEmitter(particleSystem, rotationMatrix);
		}
	}

	/**
	 * Create emitter for SolidParticleSystem
	 * Creates emitter using system's create*Emitter methods (similar to ParticleSystem)
	 */
	public createSolidParticleSystemEmitter(sps: VFXSolidParticleSystem, shape: VFXShape | undefined): void {
		if (!shape || !shape.type) {
			sps.createPointEmitter();
			return;
		}

		const shapeType = shape.type.toLowerCase();
		const radius = shape.radius ?? 1;
		const arc = shape.arc ?? Math.PI * 2;
		const thickness = shape.thickness ?? 1;
		const angle = shape.angle ?? Math.PI / 6;

		switch (shapeType) {
			case "sphere":
				sps.createSphereEmitter(radius, arc, thickness);
				break;
			case "cone":
				sps.createConeEmitter(radius, arc, thickness, angle);
				break;
			case "point":
				sps.createPointEmitter();
				break;
			default:
				sps.createPointEmitter();
				break;
		}
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
	 * Creates cone emitter for ParticleSystem
	 */
	private _createConeEmitter(particleSystem: ParticleSystem, shape: VFXShape, scale: Vector3, rotationMatrix: Matrix | null): void {
		const radius = ((shape as any).radius || 1) * ((scale.x + scale.z) / 2);
		const angle = (shape as any).angle !== undefined ? (shape as any).angle : Math.PI / 4;
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			particleSystem.createDirectedConeEmitter(radius, angle, rotatedDir, rotatedDir);
		} else {
			particleSystem.createConeEmitter(radius, angle);
		}
	}

	/**
	 * Creates sphere emitter for ParticleSystem
	 */
	private _createSphereEmitter(particleSystem: ParticleSystem, shape: VFXShape, scale: Vector3, rotationMatrix: Matrix | null): void {
		const radius = ((shape as any).radius || 1) * ((scale.x + scale.y + scale.z) / 3);
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			particleSystem.createDirectedSphereEmitter(radius, rotatedDir, rotatedDir);
		} else {
			particleSystem.createSphereEmitter(radius);
		}
	}

	/**
	 * Creates point emitter for ParticleSystem
	 */
	private _createPointEmitter(particleSystem: ParticleSystem, direction: Vector3, minDirection: Vector3): void {
		particleSystem.createPointEmitter(direction, minDirection);
	}

	/**
	 * Creates box emitter for ParticleSystem
	 */
	private _createBoxEmitter(particleSystem: ParticleSystem, shape: VFXShape, scale: Vector3, rotationMatrix: Matrix | null): void {
		const boxSize = ((shape as any).size || [1, 1, 1]).map((s: number, i: number) => s * [scale.x, scale.y, scale.z][i]);
		const minBox = new Vector3(-boxSize[0] / 2, -boxSize[1] / 2, -boxSize[2] / 2);
		const maxBox = new Vector3(boxSize[0] / 2, boxSize[1] / 2, boxSize[2] / 2);
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			particleSystem.createBoxEmitter(rotatedDir, rotatedDir, minBox, maxBox);
		} else {
			particleSystem.createBoxEmitter(Vector3.Zero(), Vector3.Zero(), minBox, maxBox);
		}
	}

	/**
	 * Creates hemisphere emitter for ParticleSystem
	 */
	private _createHemisphereEmitter(particleSystem: ParticleSystem, shape: VFXShape, scale: Vector3, _rotationMatrix: Matrix | null): void {
		const radius = ((shape as any).radius || 1) * ((scale.x + scale.y + scale.z) / 3);
		particleSystem.createHemisphericEmitter(radius);
	}

	/**
	 * Creates cylinder emitter for ParticleSystem
	 */
	private _createCylinderEmitter(particleSystem: ParticleSystem, shape: VFXShape, scale: Vector3, rotationMatrix: Matrix | null): void {
		const radius = ((shape as any).radius || 1) * ((scale.x + scale.z) / 2);
		const height = ((shape as any).height || 1) * scale.y;
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			particleSystem.createDirectedCylinderEmitter(radius, height, 1, rotatedDir, rotatedDir);
		} else {
			particleSystem.createCylinderEmitter(radius, height);
		}
	}

	/**
	 * Creates default point emitter for ParticleSystem
	 */
	private _createDefaultPointEmitter(particleSystem: ParticleSystem, rotationMatrix: Matrix | null): void {
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			this._createPointEmitter(particleSystem, rotatedDir, rotatedDir);
		} else {
			this._createPointEmitter(particleSystem, Vector3.Zero(), Vector3.Zero());
		}
	}
}
