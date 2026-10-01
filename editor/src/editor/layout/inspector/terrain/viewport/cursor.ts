import { Color3, CreateDisc, CreateLines, LinesMesh, Mesh, Scene, StandardMaterial, UtilityLayerRenderer, Vector3, VertexBuffer } from "babylonjs";

const ringSegments = 96;

export interface ITerrainBrushCursorFrame {
	/** World position of the center of the brush on the terrain. */
	center: Vector3;
	/** World cm. */
	radius: number;
	/** Part of the radius where the brush has its full strength (0..0.95). */
	hardness: number;
	color: Color3;
	/** Returns the height (world cm) of the terrain at the given world position, null outside of the terrain. */
	sampleHeight: (x: number, z: number) => number | null;
	/** Height (world cm) reached by the flatten and set height tools, drawn as a disc. */
	targetHeight: number | null;
	/** Start and end of the ramp being drawn. */
	ramp: { start: Vector3; end: Vector3 } | null;
}

/**
 * Cursor of the brush of the terrain tool, drawn over the preview in its own utility layer: a ring that follows the relief, a ring where
 * the full strength of the brush ends, the disc of the height reached by the flatten and set height tools and the line of the ramp.
 */
export class TerrainBrushCursor {
	private _layer: UtilityLayerRenderer;

	private _ring: LinesMesh;
	private _hardnessRing: LinesMesh;
	private _rampLine: LinesMesh;
	private _disc: Mesh;

	public constructor(scene: Scene) {
		this._layer = new UtilityLayerRenderer(scene, false);
		this._layer.utilityLayerScene.postProcessesEnabled = false;

		this._ring = this._createLines("terrain-brush-ring", ringSegments + 1);
		this._hardnessRing = this._createLines("terrain-brush-hardness-ring", ringSegments + 1);
		this._rampLine = this._createLines("terrain-brush-ramp", 2);

		const material = new StandardMaterial("terrain-brush-disc", this._layer.utilityLayerScene);
		material.disableLighting = true;
		material.backFaceCulling = false;
		material.disableDepthWrite = true;
		material.alpha = 0.2;

		this._disc = CreateDisc("terrain-brush-disc", { radius: 1, tessellation: 64 }, this._layer.utilityLayerScene);
		this._disc.rotation.x = Math.PI * 0.5;
		this._disc.material = material;
		this._disc.isPickable = false;
		this._disc.alwaysSelectAsActiveMesh = true;
	}

	/**
	 * Updates the cursor: null hides it.
	 */
	public update(frame: ITerrainBrushCursorFrame | null): void {
		this._ring.setEnabled(frame !== null);
		this._hardnessRing.setEnabled(frame !== null && frame.hardness > 0);
		this._disc.setEnabled(frame !== null && frame.targetHeight !== null);
		this._rampLine.setEnabled(frame !== null && frame.ramp !== null);

		if (!frame) {
			return;
		}

		// The rings are lifted above the terrain so they are not hidden by it.
		const lift = frame.radius * 0.005;

		this._updateRing(this._ring, frame, frame.radius, lift, 1);

		if (frame.hardness > 0) {
			this._updateRing(this._hardnessRing, frame, frame.radius * frame.hardness, lift, 0.5);
		}

		if (frame.targetHeight !== null) {
			this._disc.position.set(frame.center.x, frame.targetHeight, frame.center.z);
			this._disc.scaling.set(frame.radius, frame.radius, 1);
			(this._disc.material as StandardMaterial).emissiveColor.copyFrom(frame.color);
		}

		if (frame.ramp) {
			const { start, end } = frame.ramp;
			this._updateLines(this._rampLine, [start.x, start.y + lift, start.z, end.x, end.y + lift, end.z], frame.color, 1);
		}
	}

	public dispose(): void {
		this._layer.dispose();
	}

	private _updateRing(ring: LinesMesh, frame: ITerrainBrushCursorFrame, radius: number, lift: number, alpha: number): void {
		const positions: number[] = [];

		for (let index = 0; index <= ringSegments; ++index) {
			const angle = (index / ringSegments) * Math.PI * 2;
			const x = frame.center.x + Math.cos(angle) * radius;
			const z = frame.center.z + Math.sin(angle) * radius;

			positions.push(x, (frame.sampleHeight(x, z) ?? frame.center.y) + lift, z);
		}

		this._updateLines(ring, positions, frame.color, alpha);
	}

	private _updateLines(lines: LinesMesh, positions: number[], color: Color3, alpha: number): void {
		lines.updateVerticesData(VertexBuffer.PositionKind, positions);
		lines.color.copyFrom(color);
		lines.alpha = alpha;
	}

	private _createLines(name: string, count: number): LinesMesh {
		const points = Array.from({ length: count }, (_, index) => new Vector3(index, 0, 0));

		// The vertex alpha blends the color of the lines with their alpha.
		const lines = CreateLines(name, { points, updatable: true, useVertexAlpha: true }, this._layer.utilityLayerScene);
		lines.isPickable = false;

		// The bounding box of the lines is not updated with their positions: the lines must never be culled.
		lines.alwaysSelectAsActiveMesh = true;

		return lines;
	}
}
