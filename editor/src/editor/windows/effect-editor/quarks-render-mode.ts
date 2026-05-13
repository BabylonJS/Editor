import { RenderMode, type ParticleSystem as QuarksParticleSystem } from "babylon.quarks";

export type QuarksRenderModeInput = RenderMode | QuarksParticleSystem;

function resolveRenderMode(input: QuarksRenderModeInput): RenderMode {
	return typeof input === "object" ? (input.renderMode as RenderMode) : input;
}

export function isQuarksMeshRenderMode(input: QuarksRenderModeInput): boolean {
	return resolveRenderMode(input) === RenderMode.Mesh;
}

export function isQuarksTrailRenderMode(input: QuarksRenderModeInput): boolean {
	return resolveRenderMode(input) === RenderMode.Trail;
}

/** BillBoard, StretchedBillBoard, HorizontalBillBoard, VerticalBillBoard */
export function isQuarksBillboardFamilyRenderMode(input: QuarksRenderModeInput): boolean {
	const m = resolveRenderMode(input);
	return (
		m === RenderMode.BillBoard ||
		m === RenderMode.StretchedBillBoard ||
		m === RenderMode.HorizontalBillBoard ||
		m === RenderMode.VerticalBillBoard
	);
}

export function isQuarksStretchedBillboardRenderMode(input: QuarksRenderModeInput): boolean {
	return resolveRenderMode(input) === RenderMode.StretchedBillBoard;
}

/**
 * Modes that use the sprite/texture batch path on `ParticleSystem` (texture, blend, soft particles,
 * UV tile / start tile, simple render order). Mesh mode uses materials on the batch mesh instead.
 */
export function usesQuarksNonMeshBatchInspector(input: QuarksRenderModeInput): boolean {
	return !isQuarksMeshRenderMode(input);
}
