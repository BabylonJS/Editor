import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Engine } from "@babylonjs/core/Engines/engine";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PositionGizmo } from "@babylonjs/core/Gizmos/positionGizmo";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";

/**
 * Draws a position gizmo and a thin torus on the selected Quarks group / emitter transform in the effect preview scene.
 * All Babylon types must come from `@babylonjs/core` (same module as the preview Scene), not from the `babylonjs` bundle.
 */
export class EffectEditorPreviewSelection {
	private readonly _scene: Scene;
	private readonly _utilityLayer: UtilityLayerRenderer;
	private readonly _positionGizmo: PositionGizmo;
	private _ring: Mesh | null = null;

	public constructor(scene: Scene) {
		this._scene = scene;
		this._utilityLayer = new UtilityLayerRenderer(scene);
		this._utilityLayer.utilityLayerScene.postProcessesEnabled = false;

		this._positionGizmo = new PositionGizmo(this._utilityLayer);
		this._positionGizmo.scaleRatio = 2.5;
		this._positionGizmo.planarGizmoEnabled = true;

		this._softenPlanarMaterials();
	}

	/** Attaches gizmo and selection ring to the given transform, or clears both when null. */
	public attachTo(node: TransformNode | null): void {
		this._disposeRing();

		this._positionGizmo.attachedNode = node;

		if (!node) {
			return;
		}

		const mat = new StandardMaterial("effectEditorSelectionRingMat", this._scene);
		mat.disableLighting = true;
		mat.emissiveColor = new Color3(0.35, 0.85, 1);
		mat.alpha = 1;
		mat.depthFunction = Engine.ALWAYS;
		mat.disableDepthWrite = true;

		const ring = MeshBuilder.CreateTorus("effectEditorSelectionRing", { diameter: 1.1, thickness: 0.06, tessellation: 48 }, this._scene);
		ring.material = mat;
		ring.parent = node;
		ring.position.y = 0.12;
		ring.isPickable = false;

		this._ring = ring;
	}

	public dispose(): void {
		this._disposeRing();
		this._positionGizmo.attachedNode = null;
		this._positionGizmo.dispose();
		this._utilityLayer.dispose();
	}

	private _softenPlanarMaterials(): void {
		try {
			const pg = this._positionGizmo as unknown as {
				xPlaneGizmo: { _coloredMaterial: { alpha: number }; _hoverMaterial: { alpha: number } };
				yPlaneGizmo: { _coloredMaterial: { alpha: number }; _hoverMaterial: { alpha: number } };
				zPlaneGizmo: { _coloredMaterial: { alpha: number }; _hoverMaterial: { alpha: number } };
			};
			pg.xPlaneGizmo._coloredMaterial.alpha = 0.35;
			pg.xPlaneGizmo._hoverMaterial.alpha = 1;
			pg.yPlaneGizmo._coloredMaterial.alpha = 0.35;
			pg.yPlaneGizmo._hoverMaterial.alpha = 1;
			pg.zPlaneGizmo._coloredMaterial.alpha = 0.35;
			pg.zPlaneGizmo._hoverMaterial.alpha = 1;
		} catch {
			// Internal gizmo material layout may differ between Babylon versions.
		}
	}

	private _disposeRing(): void {
		this._ring?.dispose();
		this._ring = null;
	}
}
