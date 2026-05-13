import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ParticleSystem, QuarksUtil } from "babylon.quarks";

import { getEditorGeometryPreviewMesh, setEditorGeometrySourceLabel } from "./quarks-mesh-geometry";
import { isQuarksMeshRenderMode } from "./quarks-render-mode";

/**
 * After `QuarksLoader.parse`, mesh-mode systems have instancing buffers but no editor reference mesh.
 * Derive a short Geometry-field label from the live emitter node (same graph Babylon.quarks already built).
 */
export function applyQuarksLoadedInspectorHints(root: TransformNode): void {
	if (!root) {
		return;
	}

	QuarksUtil.runOnAllParticleEmitters(root, (emitter) => {
		const system = emitter.system as ParticleSystem;
		if (!isQuarksMeshRenderMode(system)) {
			setEditorGeometrySourceLabel(system, null);
			return;
		}
		if (getEditorGeometryPreviewMesh(system)) {
			return;
		}
		const name = typeof emitter.name === "string" ? emitter.name.trim() : "";
		setEditorGeometrySourceLabel(system, name.length > 0 ? name : "Particle");
	});
}
