import { Mesh, Ray, Scene } from "babylonjs";
import { getTerrainMaterialPlugin, getTerrainWeightMapCount, TerrainDebugView, type TerrainMaterialPlugin } from "babylonjs-editor-tools";

import { isTerrainMesh } from "../../guards/nodes";

import { ITerrainImage, TerrainOverlay } from "../core/types";
import { computeTerrainLayerCoverage } from "../core/weights";

import { pickTerrainMesh } from "./sampling";
import { TerrainTransform } from "./transform";
import { getTerrainWeightsVersion } from "./events";
import { getTerrainEligibility } from "./eligibility";
import { getTerrainHeightView } from "./registry";
import { getTerrainHeightImage } from "./operations";
import { getTerrainWeightMapDirtyFlags, TerrainWeightsBinding } from "./weights-binding";
import { ITerrainInfo, ITerrainLayerInfo, ITerrainMaterialEntry, ITerrainOverlayOptions, ITerrainPick, ITerrainPickOptions } from "./types";

/** Coverage of the layers of each terrain material, cached until the next change of its weights. */
const coverageCache = new WeakMap<TerrainMaterialPlugin, { version: number; maps: Uint8Array; coverage: number[] }>();

/**
 * Returns the information shown about a terrain (Terrain tab, MCP tools): grid, heights, layers, weights, material and memory.
 * Throws when the mesh is not a terrain with a valid grid.
 * @param mesh defines the terrain.
 */
export function getTerrainMeshInfo(mesh: Mesh): ITerrainInfo {
	const view = getTerrainHeightView(mesh);
	if (!view) {
		throw new Error(`"${mesh.name}" is not a terrain with a valid grid.`);
	}

	const eligibility = getTerrainEligibility(mesh);
	const transform = TerrainTransform.FromMesh(mesh);
	const grid = view.grid;

	const plugin = getTerrainMaterialPlugin(mesh.material as any);
	const coverage = plugin ? getPluginLayerCoverage(plugin) : null;
	const layers: ITerrainLayerInfo[] =
		plugin?.data.layers.map((layer, index) => ({
			id: layer.id,
			index,
			name: layer.name,
			albedo: layer.albedo,
			normal: layer.normal,
			tileSize: [layer.tileSize[0], layer.tileSize[1]],
			coverage: coverage?.[index] ?? null,
		})) ?? [];

	const vertices = grid.columns * grid.rows;
	const indexCount = mesh.getTotalIndices();
	const triangles = Math.floor(indexCount / 3);

	const dirty = plugin ? getTerrainWeightMapDirtyFlags(plugin) : [false, false];
	const weightMapCount = plugin ? getTerrainWeightMapCount(plugin.data.layers.length) : 0;
	const weightMapSize = plugin?.data.weightMapSize ?? 0;
	const weightBytes = weightMapSize * weightMapSize * 4 * weightMapCount;
	const layerTextureBytes = plugin ? plugin.data.layers.length * plugin.data.layerTextureSize * plugin.data.layerTextureSize * 4 * 2 : 0;

	return {
		mesh,
		id: mesh.id,
		name: mesh.name,
		readOnly: eligibility.eligible && eligibility.readOnly,
		subdivisions: grid.subdivisions,
		width: grid.width,
		height: grid.height,
		cellX: grid.cellX,
		cellZ: grid.cellZ,
		worldHeightRange: [transform.localToWorldHeight(view.heightRange.min), transform.localToWorldHeight(view.heightRange.max)],
		holes: view.holeCount,
		vertices,
		triangles,
		material: mesh.material ? { id: mesh.material.id, name: mesh.material.name, isTerrainMaterial: !!plugin } : null,
		layers,
		weightMapSize: plugin ? plugin.data.weightMapSize : null,
		layerTextureSize: plugin ? plugin.data.layerTextureSize : null,
		weightMapsState: plugin ? plugin.weightMapsState : null,
		layerTexturesState: plugin ? plugin.layerTexturesState : null,
		weightsDirty: dirty[0] || dirty[1],
		budget: plugin ? plugin.budgetInfo : null,
		memory: {
			// §1.12: heights + positions + normals + indices + weight maps.
			cpuBytes: vertices * (4 + 12 + 12) + indexCount * 4 + weightBytes,
			// Vertex buffers + index buffer + weight maps with mips + both layer arrays with mips.
			gpuBytes: vertices * 32 + indexCount * 4 + Math.round((weightBytes * 4) / 3) + Math.round((layerTextureBytes * 4) / 3),
			geometryFileBytes: vertices * 32 + triangles * 12,
		},
		warnings: eligibility.eligible ? eligibility.warnings.slice() : [],
	};
}

/**
 * Returns the terrain material plugin of the mesh, null when its material is not a terrain material.
 * @param mesh defines the terrain.
 */
export function getTerrainPlugin(mesh: Mesh): TerrainMaterialPlugin | null {
	return getTerrainMaterialPlugin(mesh.material as any);
}

/**
 * Returns the coverage of each layer of the terrain material (0..1), null without terrain material or loaded weights.
 * @param mesh defines the terrain.
 */
export function getTerrainLayerCoverage(mesh: Mesh): number[] | null {
	const plugin = getTerrainMaterialPlugin(mesh.material as any);
	return plugin ? getPluginLayerCoverage(plugin) : null;
}

/**
 * Returns the (S+1) x (S+1) image of the heights of the terrain, normalized to [minWorld, maxWorld]. Throws when the mesh is not a terrain
 * with a valid grid.
 * @param mesh defines the terrain.
 */
export function getTerrainMeshHeightImage(mesh: Mesh): { image: ITerrainImage; minWorld: number; maxWorld: number } {
	const view = getTerrainHeightView(mesh);
	if (!view) {
		throw new Error(`"${mesh.name}" is not a terrain with a valid grid.`);
	}

	const transform = TerrainTransform.FromMesh(mesh);
	return getTerrainHeightImage({
		grid: view.grid,
		heights: view.heights,
		localToWorldHeight: (localY) => transform.localToWorldHeight(localY),
		worldToLocalHeight: (worldY) => transform.worldToLocalHeight(worldY),
	});
}

/**
 * Returns the terrain materials of the scene with the meshes bound to them and their weight maps to save.
 * @param scene defines the scene.
 */
export function listTerrainMaterials(scene: Scene): ITerrainMaterialEntry[] {
	const entries: ITerrainMaterialEntry[] = [];

	for (const material of scene.materials) {
		const plugin = getTerrainMaterialPlugin(material as any);
		if (!plugin) {
			continue;
		}

		entries.push({
			material,
			plugin,
			meshes: scene.meshes.filter((mesh) => mesh.material === material && mesh.getClassName() !== "InstancedMesh") as Mesh[],
			weightMapCount: getTerrainWeightMapCount(plugin.data.layers.length),
			dirty: getTerrainWeightMapDirtyFlags(plugin),
		});
	}

	return entries;
}

/**
 * Shows an overlay of the Terrain tab on the terrain material (editor-only debug views: layer weights, active layer, contours, slope, grid).
 * @param mesh defines the terrain.
 * @param overlay defines the overlay to show ("none" hides it).
 * @param options defines the active layer, the contour interval and the opacity.
 */
export function setTerrainOverlay(mesh: Mesh, overlay: TerrainOverlay, options: ITerrainOverlayOptions = {}): void {
	const plugin = getTerrainMaterialPlugin(mesh.material as any);
	if (!plugin) {
		return;
	}

	const layerIndex = options.activeLayerId ? plugin.data.layers.findIndex((layer) => layer.id === options.activeLayerId) : -1;
	const grid = getTerrainHeightView(mesh)?.grid;

	plugin.setDebugOptions({
		view: getTerrainDebugView(overlay),
		activeLayer: Math.max(0, layerIndex),
		...(options.contourInterval !== undefined ? { contourInterval: options.contourInterval } : {}),
		...(options.opacity !== undefined ? { opacity: options.opacity } : {}),
		...(grid ? { gridSubdivisions: grid.subdivisions } : {}),
	});
}

/**
 * Returns the nearest terrain hit by the ray: options.mesh only when given, else every terrain of the scene. Never makes its buffers
 * updatable.
 * @param scene defines the scene of the terrains.
 * @param ray defines the world ray.
 * @param options defines the mesh to pick, whether only eligible terrains are picked (default true) and whether holes are solid.
 */
export function pickTerrain(scene: Scene | null, ray: Ray, options: ITerrainPickOptions = {}): ITerrainPick | null {
	const eligibleOnly = options.eligibleOnly ?? true;
	const candidates = options.mesh ? [options.mesh] : ((scene?.meshes.filter((mesh) => isTerrainMesh(mesh)) ?? []) as Mesh[]);

	let best: ITerrainPick | null = null;

	for (const mesh of candidates) {
		if (mesh.isDisposed() || !mesh.isEnabled() || !mesh.isVisible) {
			continue;
		}

		if (eligibleOnly && !getTerrainEligibility(mesh).eligible) {
			continue;
		}

		const hit = pickTerrainMesh(mesh, ray, { solidHoles: options.solidHoles ?? false });
		if (hit && (!best || hit.distance < best.distance)) {
			best = hit;
		}
	}

	return best;
}

/** Coverage per layer (§4.10.9), cached until the next weights change notification of the plugin; null when the weights are not loaded. */
function getPluginLayerCoverage(plugin: TerrainMaterialPlugin): number[] | null {
	if (plugin.weightMapsState !== "ready" && !plugin.getWeightMap(0)) {
		return null;
	}

	const weights = TerrainWeightsBinding.acquire(plugin).weights;
	if (!weights) {
		return null;
	}

	const version = getTerrainWeightsVersion(plugin);
	const cached = coverageCache.get(plugin);
	if (cached && cached.version === version && cached.maps === weights.maps.maps[0]) {
		return cached.coverage.slice();
	}

	const coverage = computeTerrainLayerCoverage(weights.maps).slice(0, plugin.data.layers.length);
	coverageCache.set(plugin, { version, maps: weights.maps.maps[0], coverage });

	return coverage.slice();
}

function getTerrainDebugView(overlay: TerrainOverlay): TerrainDebugView {
	switch (overlay) {
		case "layer-weights":
			return TerrainDebugView.LayerWeights;
		case "active-layer":
			return TerrainDebugView.ActiveLayer;
		case "contours":
			return TerrainDebugView.Contours;
		case "slope":
			return TerrainDebugView.Slope;
		case "grid":
			return TerrainDebugView.Grid;
		default:
			return TerrainDebugView.None;
	}
}
