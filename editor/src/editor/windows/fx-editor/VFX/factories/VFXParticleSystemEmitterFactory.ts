import { ParticleSystem, Vector3, Matrix } from "babylonjs";
import type { VFXShape } from "../types/shapes";

/**
 * Factory for creating shape emitters for ParticleSystem
 * Creates emitters based on VFX shape configuration
 */
export class VFXParticleSystemEmitterFactory {
	private _particleSystem: ParticleSystem;

	constructor(particleSystem: ParticleSystem) {
		this._particleSystem = particleSystem;
	}

	/**
	 * Create emitter shape based on VFX shape configuration
	 */
	public createEmitter(shape: VFXShape | undefined, cumulativeScale: Vector3, rotationMatrix: Matrix | null): void {
		if (!shape || !shape.type) {
			this._createPointEmitter(Vector3.Zero(), Vector3.Zero());
			return;
		}

		const shapeType = shape.type.toLowerCase();
		const shapeHandlers: Record<string, (shape: VFXShape, scale: Vector3, rotation: Matrix | null) => void> = {
			cone: this._createConeEmitter.bind(this),
			sphere: this._createSphereEmitter.bind(this),
			point: this._createPointEmitter.bind(this),
			box: this._createBoxEmitter.bind(this),
			hemisphere: this._createHemisphereEmitter.bind(this),
			cylinder: this._createCylinderEmitter.bind(this),
		};

		const handler = shapeHandlers[shapeType];
		if (handler) {
			handler(shape, cumulativeScale, rotationMatrix);
		} else {
			this._createDefaultPointEmitter(rotationMatrix);
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
	 * Creates cone emitter
	 */
	private _createConeEmitter(shape: VFXShape, scale: Vector3, rotationMatrix: Matrix | null): void {
		const radius = ((shape as any).radius || 1) * ((scale.x + scale.z) / 2);
		const angle = (shape as any).angle !== undefined ? (shape as any).angle : Math.PI / 4;
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			this._particleSystem.createDirectedConeEmitter(radius, angle, rotatedDir, rotatedDir);
		} else {
			this._particleSystem.createConeEmitter(radius, angle);
		}
	}

	/**
	 * Creates sphere emitter
	 */
	private _createSphereEmitter(shape: VFXShape, scale: Vector3, rotationMatrix: Matrix | null): void {
		const radius = ((shape as any).radius || 1) * ((scale.x + scale.y + scale.z) / 3);
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			this._particleSystem.createDirectedSphereEmitter(radius, rotatedDir, rotatedDir);
		} else {
			this._particleSystem.createSphereEmitter(radius);
		}
	}

	/**
	 * Creates point emitter
	 */
	private _createPointEmitter(direction: Vector3, minDirection: Vector3): void {
		this._particleSystem.createPointEmitter(direction, minDirection);
	}

	/**
	 * Creates box emitter
	 */
	private _createBoxEmitter(shape: VFXShape, scale: Vector3, rotationMatrix: Matrix | null): void {
		const boxSize = ((shape as any).size || [1, 1, 1]).map((s: number, i: number) => s * [scale.x, scale.y, scale.z][i]);
		const minBox = new Vector3(-boxSize[0] / 2, -boxSize[1] / 2, -boxSize[2] / 2);
		const maxBox = new Vector3(boxSize[0] / 2, boxSize[1] / 2, boxSize[2] / 2);
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			this._particleSystem.createBoxEmitter(rotatedDir, rotatedDir, minBox, maxBox);
		} else {
			this._particleSystem.createBoxEmitter(Vector3.Zero(), Vector3.Zero(), minBox, maxBox);
		}
	}

	/**
	 * Creates hemisphere emitter
	 */
	private _createHemisphereEmitter(shape: VFXShape, scale: Vector3, _rotationMatrix: Matrix | null): void {
		const radius = ((shape as any).radius || 1) * ((scale.x + scale.y + scale.z) / 3);
		this._particleSystem.createHemisphericEmitter(radius);
	}

	/**
	 * Creates cylinder emitter
	 */
	private _createCylinderEmitter(shape: VFXShape, scale: Vector3, rotationMatrix: Matrix | null): void {
		const radius = ((shape as any).radius || 1) * ((scale.x + scale.z) / 2);
		const height = ((shape as any).height || 1) * scale.y;
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			this._particleSystem.createDirectedCylinderEmitter(radius, height, 1, rotatedDir, rotatedDir);
		} else {
			this._particleSystem.createCylinderEmitter(radius, height);
		}
	}

	/**
	 * Creates default point emitter
	 */
	private _createDefaultPointEmitter(rotationMatrix: Matrix | null): void {
		const defaultDir = new Vector3(0, 1, 0);
		const rotatedDir = this._applyRotationToDirection(defaultDir, rotationMatrix);

		if (rotationMatrix) {
			this._createPointEmitter(rotatedDir, rotatedDir);
		} else {
			this._createPointEmitter(Vector3.Zero(), Vector3.Zero());
		}
	}
}
