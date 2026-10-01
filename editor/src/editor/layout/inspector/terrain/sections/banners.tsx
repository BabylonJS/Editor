import { ReactNode } from "react";

import { LuLoader, LuTriangleAlert } from "react-icons/lu";

import { Mesh } from "babylonjs";

import { Editor } from "../../../../main";

import { Badge } from "../../../../../ui/shadcn/ui/badge";
import { Progress } from "../../../../../ui/shadcn/ui/progress";

import { showConfirm } from "../../../../../ui/dialog";

import { getDefaultTerrainSubdivisions } from "../../../../../tools/terrain/core/settings";

import { setTerrainPhysicsShapeToMesh } from "../../../../../tools/terrain/engine/dependents";
import { getTerrainPlugin } from "../../../../../tools/terrain/engine/info";
import { ensureTerrainUniqueMaterial, getTerrainRememberedMaterial, restoreTerrainMaterial } from "../../../../../tools/terrain/engine/material";
import { makeTerrainGeometryUnique, resizeTerrain, setTerrainMeshVisible } from "../../../../../tools/terrain/engine/structure";
import { ITerrainInfo } from "../../../../../tools/terrain/engine/types";
import { getTerrainBusyInfo } from "../../../../../tools/terrain/engine/yield";

import { runTerrainOperation } from "../operation";

import { TerrainActionLink } from "../components/action-link";

/** Features of the terrain material disabled when the material needs more textures than the GPU allows. */
const budgetFeatures = {
	normals: "layer normals",
	weights1: "layers 5–8",
	albedo: "layer colors",
	terrain: "terrain layers",
};

interface ITerrainBanner {
	message: ReactNode;
	/** Errors are drawn with a red icon. */
	error?: boolean;
	/** Actions that fix the issue. */
	actions?: Record<string, () => unknown>;
}

export interface ITerrainBannersProps {
	editor: Editor;
	mesh: Mesh;
	info: ITerrainInfo;
}

/**
 * Banners of the edited terrain: the progress of the running operation, then one banner per issue of the terrain (read-only, shared
 * geometry or material, hidden, textures that can't be loaded...) with the actions that fix it.
 */
export function TerrainBanners(props: ITerrainBannersProps) {
	const { editor, mesh, info } = props;

	const plugin = getTerrainPlugin(mesh);
	const warnings = info.warnings;
	const operation = getTerrainBusyInfo();

	async function handleResetWeights() {
		const confirmed = await showConfirm("Reset the painted layers?", "Layer 1 covers the whole terrain again. This can be undone.");
		if (confirmed) {
			runTerrainOperation(editor, mesh, { type: "fill-layer", layerId: plugin!.data.layers[0].id });
		}
	}

	const banners: ITerrainBanner[] = [];

	if (warnings.includes("newer-version")) {
		banners.push({ message: "Created with a newer editor version: read-only." });
	}

	if (warnings.includes("unsupported-resolution")) {
		const subdivisions = getDefaultTerrainSubdivisions(info.width, info.height, info.subdivisions);

		banners.push({
			message: `This terrain has ${info.subdivisions} subdivisions; terrains support 2 to 1024: read-only.`,
			actions: { [`Resample to ${subdivisions}`]: () => resizeTerrain(editor, mesh, { subdivisions }) },
		});
	}

	if (warnings.includes("shared-geometry")) {
		banners.push({
			message: `Shares its geometry with ${mesh.geometry!.meshes.length - 1} other mesh(es).`,
			actions: { "Make unique": () => makeTerrainGeometryUnique(editor, mesh) },
		});
	}

	if (warnings.includes("shared-material")) {
		banners.push({
			message: `Terrain material shared by ${mesh.getScene().meshes.filter((other) => other.material === mesh.material).length} meshes.`,
			actions: { "Make unique": () => ensureTerrainUniqueMaterial(editor, mesh) },
		});
	}

	if (warnings.includes("hidden")) {
		banners.push({ message: `“${mesh.name}” is hidden: strokes are disabled.`, actions: { Show: () => setTerrainMeshVisible(editor, mesh) } });
	}

	if (warnings.includes("tilted")) {
		banners.push({ message: "Tilted terrain: heights are measured along its local Y axis." });
	}

	if (warnings.includes("box-physics")) {
		banners.push({ message: "Physics uses a box: bodies won't follow the relief.", actions: { "Use mesh shape": () => setTerrainPhysicsShapeToMesh(editor, mesh) } });
	}

	if (warnings.includes("material-unassigned")) {
		banners.push({
			message: `Terrain material “${getTerrainRememberedMaterial(mesh)?.name}” is no longer assigned: its painted layers are not shown.`,
			actions: { Restore: () => restoreTerrainMaterial(editor, mesh) },
		});
	}

	if (plugin) {
		const engine = mesh.getScene().getEngine();
		if (!engine.isWebGPU && engine.version < 2) {
			banners.push({ message: "Terrain layers need WebGL2 or WebGPU." });
		}

		const budget = plugin.budgetInfo;
		if (budget.dropped.length) {
			banners.push({
				message: `GPU texture budget exceeded: ${budget.dropped.map((feature) => budgetFeatures[feature]).join(", ")} disabled.`,
				error: true,
			});
		}

		if (plugin.weightMapsState === "error") {
			banners.push({
				message: `The painted layers couldn't be loaded (${plugin.lastError ?? "unknown error"}).`,
				error: true,
				actions: { Retry: () => plugin.reloadWeightMaps(), "Reset weights": () => handleResetWeights() },
			});
		}

		if (plugin.layerTexturesState === "error") {
			banners.push({ message: "Some layer textures couldn't be loaded.", error: true, actions: { Rebuild: () => plugin.rebuildLayerTextures() } });
		}
	}

	return (
		<>
			{operation && (
				<div className="flex flex-col gap-1 w-full p-2 rounded-md bg-secondary">
					<div className="text-xs">
						{operation.label}… {Math.round(operation.progress * 100)} %
					</div>
					<Progress value={operation.progress * 100} />
				</div>
			)}

			{(plugin?.weightMapsState === "loading" || plugin?.layerTexturesState === "loading") && (
				<Badge variant="secondary" className="flex items-center gap-2 w-full font-normal">
					<LuLoader className="w-4 h-4 animate-spin" /> Loading terrain textures…
				</Badge>
			)}

			{banners.map((banner, index) => (
				<Badge key={index} variant="secondary" className="flex items-start gap-2 w-full font-normal whitespace-normal text-left">
					<LuTriangleAlert className={`w-4 h-4 mt-0.5 shrink-0 ${banner.error ? "stroke-red-500" : "stroke-amber-500"}`} />

					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 break-words">
						{banner.message}

						{Object.entries(banner.actions ?? {}).map(([label, action]) => (
							<TerrainActionLink key={label} disabled={!!operation} onClick={() => action()}>
								{label}
							</TerrainActionLink>
						))}
					</div>
				</Badge>
			))}
		</>
	);
}
