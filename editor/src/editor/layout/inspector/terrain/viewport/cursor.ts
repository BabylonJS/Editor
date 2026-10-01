import {
	Color3,
	CreateDisc,
	CreateLines,
	CreateSphere,
	Mesh,
	StandardMaterial,
	UtilityLayerRenderer,
	Vector3,
	VertexBuffer,
	VertexData,
	type LinesMesh,
	type Scene,
} from "babylonjs";

import type { ITerrainFootprint } from "../../../../../tools/terrain/engine/types";

/**
 * Brush cursor of the Terrain tab (§1.14), drawn in a dedicated utility layer (never DefaultUtilityLayer, no pointer handling):
 * outer ring and hardness ring conforming to the relief, rotation tick, centre normal tick, footprint preview (33 × 33 grid, vertex
 * alpha = 0.35 × weight), Flatten / Set height disc, Ramp band with end dots, stroke smoothing line. Every mesh is unpickable and unlit.
 */

/** Segments of the outer and hardness rings. */
export const TERRAIN_CURSOR_RING_SEGMENTS = 96;
/** Colour of the rings when a stroke would be refused (§1.14). */
export const TERRAIN_CURSOR_REFUSED_COLOR = "#7a7a7a";
/** Alpha of the rings when a stroke would be refused. */
export const TERRAIN_CURSOR_REFUSED_ALPHA = 0.6;
/** Alpha of the hardness ring (relative to the outer ring). */
export const TERRAIN_CURSOR_HARDNESS_ALPHA = 0.5;
/** Vertex alpha of the footprint preview per unit of dab weight. */
export const TERRAIN_CURSOR_FOOTPRINT_ALPHA = 0.35;
/** Alpha of the Flatten / Set height disc. */
export const TERRAIN_CURSOR_DISC_ALPHA = 0.2;
/** Lift of the rings above the surface, fraction of the radius (0.5 %). */
export const TERRAIN_CURSOR_LIFT = 0.005;
/** Length of the centre normal tick, fraction of the radius (10 %). */
export const TERRAIN_CURSOR_NORMAL_TICK = 0.1;

export interface ITerrainBrushCursorFrame {
	/** World point of the brush centre on the surface. */
	center: Vector3;
	/** World unit vector of the terrain's local X axis (ring and rotation tick basis). */
	axisX: Vector3;
	/** World unit vector of the terrain's local Z axis. */
	axisZ: Vector3;
	/** World normal of the surface at the centre. */
	normal: Vector3;
	/** World cm. */
	radius: number;
	/** 0..0.95. */
	hardness: number;
	/** Brush rotation (radians, counter-clockwise seen from +Y, §4.1). */
	rotationRadians: number;
	/** Rotation tick for image and square brushes or a rotation ≠ 0. */
	showRotationTick: boolean;
	/** Tool colour (§1.6) or active layer tint (Paint). */
	color: Color3;
	/** Grey rings (#7a7a7a, alpha 0.6) when a stroke would be refused. */
	refused: boolean;
	/** World height of the surface under world (x, z); null outside the terrain. */
	sampleHeight: (x: number, z: number) => number | null;
	footprint: ITerrainFootprint | null;
	/** Flatten / Set height target (world cm), null when none. */
	targetHeightWorld: number | null;
	/** Ramp band A → B during the drag. */
	ramp: { start: Vector3; end: Vector3 } | null;
	/** Stroke smoothing line: pointer point → lazy brush centre. */
	lazyLine: { from: Vector3; to: Vector3 } | null;
}

export class TerrainBrushCursor {
	private readonly _layer: UtilityLayerRenderer;
	private readonly _scene: Scene;

	private readonly _ring: LinesMesh;
	private readonly _hardnessRing: LinesMesh;
	private readonly _rotationTick: LinesMesh;
	private readonly _normalTick: LinesMesh;
	private readonly _lazyLine: LinesMesh;
	private readonly _rampOutline: LinesMesh;
	private readonly _rampCenter: LinesMesh;

	private readonly _ringPositions: Float32Array = new Float32Array((TERRAIN_CURSOR_RING_SEGMENTS + 1) * 3);
	private readonly _hardnessPositions: Float32Array = new Float32Array((TERRAIN_CURSOR_RING_SEGMENTS + 1) * 3);
	/** One array per line: updatable buffers keep a reference to the uploaded data as their CPU copy (context restore). */
	private readonly _rotationTickPositions: Float32Array = new Float32Array(6);
	private readonly _normalTickPositions: Float32Array = new Float32Array(6);
	private readonly _lazyLinePositions: Float32Array = new Float32Array(6);
	private readonly _rampCenterPositions: Float32Array = new Float32Array(6);
	private readonly _rampOutlinePositions: Float32Array = new Float32Array(15);

	private readonly _disc: Mesh;
	private readonly _discMaterial: StandardMaterial;
	private readonly _rampDots: [Mesh, Mesh];
	private readonly _dotMaterial: StandardMaterial;

	private _footprintMesh: Mesh | null = null;
	private _footprintSize: number = 0;
	private _footprintColors: Float32Array | null = null;
	private readonly _footprintMaterial: StandardMaterial;

	private readonly _refusedColor: Color3 = Color3.FromHexString(TERRAIN_CURSOR_REFUSED_COLOR);
	private readonly _tmpDirection: Vector3 = new Vector3();

	private _visible: boolean = false;
	private _disposed: boolean = false;

	/**
	 * Constructor.
	 * @param scene defines the preview scene the cursor is drawn over.
	 */
	public constructor(scene: Scene) {
		this._layer = new UtilityLayerRenderer(scene, false);
		this._layer.utilityLayerScene.postProcessesEnabled = false;
		this._scene = this._layer.utilityLayerScene;

		this._ring = this._createLines("terrain-brush-ring", TERRAIN_CURSOR_RING_SEGMENTS + 1);
		this._hardnessRing = this._createLines("terrain-brush-hardness-ring", TERRAIN_CURSOR_RING_SEGMENTS + 1);
		this._rotationTick = this._createLines("terrain-brush-rotation-tick", 2);
		this._normalTick = this._createLines("terrain-brush-normal-tick", 2);
		this._lazyLine = this._createLines("terrain-brush-lazy-line", 2);
		this._rampOutline = this._createLines("terrain-brush-ramp-band", 5);
		this._rampCenter = this._createLines("terrain-brush-ramp-axis", 2);

		this._discMaterial = this._createMaterial("terrain-brush-disc-material");
		this._discMaterial.alpha = TERRAIN_CURSOR_DISC_ALPHA;
		this._discMaterial.disableDepthWrite = true;

		this._disc = CreateDisc("terrain-brush-target-disc", { radius: 1, tessellation: 64, sideOrientation: Mesh.DOUBLESIDE }, this._scene);
		this._disc.rotation.x = Math.PI * 0.5;
		this._disc.material = this._discMaterial;
		this._configureMesh(this._disc);

		this._dotMaterial = this._createMaterial("terrain-brush-dot-material");
		this._rampDots = [this._createDot("terrain-brush-ramp-start"), this._createDot("terrain-brush-ramp-end")];

		this._footprintMaterial = this._createMaterial("terrain-brush-footprint-material");
		this._footprintMaterial.emissiveColor = Color3.White();
		this._footprintMaterial.disableDepthWrite = true;
	}

	/** The utility layer that renders the cursor. */
	public get utilityLayer(): UtilityLayerRenderer {
		return this._layer;
	}

	/** Whether the cursor is currently drawn. */
	public get isVisible(): boolean {
		return this._visible;
	}

	/**
	 * Updates the cursor (null hides it).
	 * @param frame defines what to draw.
	 */
	public update(frame: ITerrainBrushCursorFrame | null): void {
		if (this._disposed) {
			return;
		}

		if (!frame || !(frame.radius > 0) || !isFiniteVector(frame.center)) {
			this._hide();
			return;
		}

		this._visible = true;

		const color = frame.refused ? this._refusedColor : frame.color;
		const alpha = frame.refused ? TERRAIN_CURSOR_REFUSED_ALPHA : 1;
		const lift = TERRAIN_CURSOR_LIFT * frame.radius;

		// 1. Outer ring and 2. hardness ring, conforming to the relief.
		this._writeRing(this._ringPositions, frame, frame.radius, lift);
		this._showLines(this._ring, this._ringPositions, color, alpha);

		const hardnessRadius = frame.radius * frame.hardness;
		if (hardnessRadius > frame.radius * 1e-3) {
			this._writeRing(this._hardnessPositions, frame, hardnessRadius, lift);
			this._showLines(this._hardnessRing, this._hardnessPositions, color, alpha * TERRAIN_CURSOR_HARDNESS_ALPHA);
		} else {
			this._hardnessRing.setEnabled(false);
		}

		// 3. Rotation tick (centre → brush +X).
		if (frame.showRotationTick) {
			const cos = Math.cos(frame.rotationRadians);
			const sin = Math.sin(frame.rotationRadians);
			const x = frame.center.x + frame.radius * (cos * frame.axisX.x + sin * frame.axisZ.x);
			const z = frame.center.z + frame.radius * (cos * frame.axisX.z + sin * frame.axisZ.z);
			const y = frame.sampleHeight(x, z) ?? frame.center.y;

			this._rotationTickPositions.set([frame.center.x, frame.center.y + lift, frame.center.z, x, y + lift, z]);
			this._showLines(this._rotationTick, this._rotationTickPositions, color, alpha);
		} else {
			this._rotationTick.setEnabled(false);
		}

		// 4. Centre normal tick.
		const normal = isFiniteVector(frame.normal) && frame.normal.lengthSquared() > 0 ? frame.normal : Vector3.UpReadOnly;
		const normalLength = TERRAIN_CURSOR_NORMAL_TICK * frame.radius;
		this._normalTickPositions.set([
			frame.center.x,
			frame.center.y + lift,
			frame.center.z,
			frame.center.x + normal.x * normalLength,
			frame.center.y + lift + normal.y * normalLength,
			frame.center.z + normal.z * normalLength,
		]);
		this._showLines(this._normalTick, this._normalTickPositions, color, alpha);

		// 5. Footprint preview.
		this._updateFootprint(frame.footprint, color);

		// 6. Mode extras.
		this._updateDisc(frame, color);
		this._updateRamp(frame, color, alpha, lift);

		if (frame.lazyLine && isFiniteVector(frame.lazyLine.from) && isFiniteVector(frame.lazyLine.to)) {
			const { from, to } = frame.lazyLine;
			this._lazyLinePositions.set([from.x, from.y + lift, from.z, to.x, to.y + lift, to.z]);
			this._showLines(this._lazyLine, this._lazyLinePositions, color, alpha);
		} else {
			this._lazyLine.setEnabled(false);
		}
	}

	/** Disposes the utility layer and every cursor mesh. */
	public dispose(): void {
		if (this._disposed) {
			return;
		}

		this._disposed = true;
		this._visible = false;

		try {
			this._layer.dispose();
		} catch (e) {
			// The preview scene (and its utility layer) may already be disposed.
		}
	}

	private _hide(): void {
		if (!this._visible) {
			return;
		}

		this._visible = false;

		for (const mesh of [
			this._ring,
			this._hardnessRing,
			this._rotationTick,
			this._normalTick,
			this._lazyLine,
			this._rampOutline,
			this._rampCenter,
			this._disc,
			...this._rampDots,
		]) {
			mesh.setEnabled(false);
		}

		this._footprintMesh?.setEnabled(false);
	}

	private _writeRing(positions: Float32Array, frame: ITerrainBrushCursorFrame, radius: number, lift: number): void {
		let lastY = frame.center.y;

		for (let k = 0; k <= TERRAIN_CURSOR_RING_SEGMENTS; ++k) {
			const angle = (2 * Math.PI * k) / TERRAIN_CURSOR_RING_SEGMENTS;
			const cos = Math.cos(angle);
			const sin = Math.sin(angle);

			const x = frame.center.x + radius * (cos * frame.axisX.x + sin * frame.axisZ.x);
			const z = frame.center.z + radius * (cos * frame.axisX.z + sin * frame.axisZ.z);
			const y = frame.sampleHeight(x, z);

			if (y !== null && Number.isFinite(y)) {
				lastY = y;
			}

			positions[k * 3] = x;
			positions[k * 3 + 1] = lastY + lift;
			positions[k * 3 + 2] = z;
		}
	}

	private _showLines(lines: LinesMesh, positions: Float32Array, color: Color3, alpha: number): void {
		lines.updateVerticesData(VertexBuffer.PositionKind, positions, false, false);
		lines.color.copyFrom(color);
		lines.alpha = alpha;
		lines.setEnabled(true);
	}

	private _updateFootprint(footprint: ITerrainFootprint | null, color: Color3): void {
		const size = footprint?.size ?? 0;

		if (!footprint || size < 2 || footprint.positions.length < size * size * 3 || footprint.weights.length < size * size) {
			this._footprintMesh?.setEnabled(false);
			return;
		}

		if (!this._footprintMesh || this._footprintSize !== size) {
			this._createFootprintMesh(size);
		}

		const colors = this._footprintColors!;
		for (let i = 0; i < size * size; ++i) {
			colors[i * 4] = color.r;
			colors[i * 4 + 1] = color.g;
			colors[i * 4 + 2] = color.b;
			colors[i * 4 + 3] = TERRAIN_CURSOR_FOOTPRINT_ALPHA * Math.min(1, Math.max(0, footprint.weights[i]));
		}

		const mesh = this._footprintMesh!;
		mesh.updateVerticesData(VertexBuffer.PositionKind, footprint.positions.subarray(0, size * size * 3), false, false);
		mesh.updateVerticesData(VertexBuffer.ColorKind, colors, false, false);
		mesh.setEnabled(true);
	}

	private _createFootprintMesh(size: number): void {
		this._footprintMesh?.dispose(false, false);

		const indices: number[] = [];
		for (let j = 0; j < size - 1; ++j) {
			for (let i = 0; i < size - 1; ++i) {
				const a = j * size + i;
				indices.push(a, a + 1, a + size, a + 1, a + size + 1, a + size);
			}
		}

		const vertexData = new VertexData();
		vertexData.positions = new Float32Array(size * size * 3);
		vertexData.colors = new Float32Array(size * size * 4);
		vertexData.indices = indices;

		const mesh = new Mesh("terrain-brush-footprint", this._scene);
		vertexData.applyToMesh(mesh, true);

		mesh.hasVertexAlpha = true;
		mesh.material = this._footprintMaterial;
		this._configureMesh(mesh);

		this._footprintMesh = mesh;
		this._footprintSize = size;
		this._footprintColors = new Float32Array(size * size * 4);
	}

	private _updateDisc(frame: ITerrainBrushCursorFrame, color: Color3): void {
		if (frame.targetHeightWorld === null || !Number.isFinite(frame.targetHeightWorld)) {
			this._disc.setEnabled(false);
			return;
		}

		this._disc.position.set(frame.center.x, frame.targetHeightWorld, frame.center.z);
		this._disc.scaling.set(frame.radius, frame.radius, 1);
		this._discMaterial.emissiveColor.copyFrom(color);
		this._disc.setEnabled(true);
	}

	private _updateRamp(frame: ITerrainBrushCursorFrame, color: Color3, alpha: number, lift: number): void {
		const ramp = frame.ramp;

		if (!ramp || !isFiniteVector(ramp.start) || !isFiniteVector(ramp.end)) {
			this._rampOutline.setEnabled(false);
			this._rampCenter.setEnabled(false);
			this._rampDots[0].setEnabled(false);
			this._rampDots[1].setEnabled(false);
			return;
		}

		// Band of width 2R around A → B (the ramp width is the brush diameter, §1.6).
		const direction = this._tmpDirection.set(ramp.end.x - ramp.start.x, 0, ramp.end.z - ramp.start.z);
		if (direction.lengthSquared() < 1e-8) {
			direction.copyFrom(frame.axisX);
			direction.y = 0;
		}
		direction.normalize();

		const px = -direction.z * frame.radius;
		const pz = direction.x * frame.radius;

		const corners: [number, number][] = [
			[ramp.start.x + px, ramp.start.z + pz],
			[ramp.end.x + px, ramp.end.z + pz],
			[ramp.end.x - px, ramp.end.z - pz],
			[ramp.start.x - px, ramp.start.z - pz],
			[ramp.start.x + px, ramp.start.z + pz],
		];

		corners.forEach(([x, z], index) => {
			const fallback = index === 1 || index === 2 ? ramp.end.y : ramp.start.y;
			this._rampOutlinePositions[index * 3] = x;
			this._rampOutlinePositions[index * 3 + 1] = (frame.sampleHeight(x, z) ?? fallback) + lift;
			this._rampOutlinePositions[index * 3 + 2] = z;
		});

		this._showLines(this._rampOutline, this._rampOutlinePositions, color, alpha);

		this._rampCenterPositions.set([ramp.start.x, ramp.start.y + lift, ramp.start.z, ramp.end.x, ramp.end.y + lift, ramp.end.z]);
		this._showLines(this._rampCenter, this._rampCenterPositions, color, alpha);

		this._dotMaterial.emissiveColor.copyFrom(color);

		const dotScale = 0.08 * frame.radius;
		[ramp.start, ramp.end].forEach((point, index) => {
			const dot = this._rampDots[index];
			dot.position.set(point.x, point.y + lift, point.z);
			dot.scaling.setAll(dotScale);
			dot.setEnabled(true);
		});
	}

	private _createLines(name: string, count: number): LinesMesh {
		const points: Vector3[] = [];
		for (let i = 0; i < count; ++i) {
			points.push(new Vector3(i, 0, 0));
		}

		// useVertexAlpha enables alpha blending of the uniform colour (hardness ring, refused state).
		const lines = CreateLines(name, { points, updatable: true, useVertexAlpha: true }, this._scene);
		this._configureMesh(lines);

		return lines;
	}

	private _createMaterial(name: string): StandardMaterial {
		const material = new StandardMaterial(name, this._scene);
		material.disableLighting = true;
		material.backFaceCulling = false;
		material.diffuseColor = Color3.Black();
		material.specularColor = Color3.Black();
		material.emissiveColor = Color3.White();

		return material;
	}

	private _createDot(name: string): Mesh {
		const dot = CreateSphere(name, { diameter: 1, segments: 8 }, this._scene);
		dot.material = this._dotMaterial;
		this._configureMesh(dot);

		return dot;
	}

	private _configureMesh(mesh: Mesh): void {
		mesh.isPickable = false;
		mesh.alwaysSelectAsActiveMesh = true;
		mesh.doNotSerialize = true;
		mesh.setEnabled(false);
	}
}

function isFiniteVector(vector: Vector3 | null | undefined): vector is Vector3 {
	return !!vector && Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}
