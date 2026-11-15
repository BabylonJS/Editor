import { IVector3Like, Mesh } from "babylonjs";
import { CreateNavMeshResult, INavMeshParametersV2 } from "babylonjs-addons/navigation/types";
import { CreateTileCacheNavMeshConfig, GenerateNavMesh, GetPositionsAndIndices } from "babylonjs-addons";

import { Detour, FloatArray, NavMesh, NavMeshQuery, Recast, Vector3Tuple, markConvexPolyArea } from "@recast-navigation/core";
import { tileCacheGeneratorConfigDefaults } from "@recast-navigation/generators";

import { generateTileCache } from "./generator";

export interface IIsolatedAreasRemovalOptions {
	/**
	 * Defines the surface under which an isolated walkable area is removed. The largest walkable area is always kept.
	 */
	minimumArea: number;
	/**
	 * Defines, when set, the position of the walkable area to keep: only this area is kept, whatever the surface of the others.
	 */
	referencePosition: IVector3Like | null;
}

export interface INavMeshGenerationProgress {
	/**
	 * Defines the label of the step being processed.
	 */
	label: string;
	/**
	 * Defines the progress of the step, from 0 to 1.
	 */
	progress: number;
}

interface INavMeshPolygon {
	surface: number;
	links: number[];
	vertices: Vector3Tuple[];
	tileBorderEdges: boolean[];
	isOffMeshConnection: boolean;
}

interface IWalkableArea {
	surface: number;
	refs: Set<number>;
	polygons: INavMeshPolygon[];
}

/**
 * Generates the navmesh like the navigation plugin does, using "generateTileCache" from "./generator" to build the tile cache
 * (see why there). When options are given and the navmesh has isolated walkable areas to remove (the roof of a car, the top of
 * a table, a closed corner, etc.), it is generated again with the polygons of these areas marked as unwalkable before the tile
 * cache layers are built, so the saved binaries don't contain them either.
 * @throws Error if a reference position is given but no walkable area is found around it.
 */
export async function generateNavMesh(
	meshes: Mesh[],
	parameters: INavMeshParametersV2,
	options: IIsolatedAreasRemovalOptions | null,
	onProgress?: (progress: INavMeshGenerationProgress) => void
): Promise<CreateNavMeshResult> {
	// The plugin always asks for a tile cache, unless "maxObstacles" is set to 0.
	if (!meshes.length || (parameters.maxObstacles ?? 0) <= 0) {
		return GenerateNavMesh(meshes, parameters);
	}

	const [positions, indices] = GetPositionsAndIndices(meshes, { doNotReverseIndices: parameters.doNotReverseIndices });
	const config = CreateTileCacheNavMeshConfig(parameters);

	const { navMesh, tileCache } = await generateTileCache(positions, indices, config, {
		onProgress: (progress) => onProgress?.({ label: "Generating", progress }),
	});
	const navMeshQuery = new NavMeshQuery(navMesh);

	if (!options) {
		return { navMesh, tileCache, navMeshQuery };
	}

	const { cs, ch, walkableHeight } = { ...tileCacheGeneratorConfigDefaults, ...config };

	const agentHeight = walkableHeight * ch;
	const walkableAreas = getWalkableAreas(navMesh);

	let keptAreas = walkableAreas.filter((walkableArea, index) => index === 0 || walkableArea.surface >= options.minimumArea);

	if (options.referencePosition) {
		const { success, nearestRef } = navMeshQuery.findNearestPoly(options.referencePosition, {
			halfExtents: { x: agentHeight, y: agentHeight, z: agentHeight },
		});

		const referenceArea = success ? walkableAreas.find((walkableArea) => walkableArea.refs.has(nearestRef >>> 0)) : undefined;
		keptAreas = referenceArea ? [referenceArea] : [];
	}

	const removedPolygons = walkableAreas
		.filter((walkableArea) => !keptAreas.includes(walkableArea))
		.flatMap((walkableArea) => walkableArea.polygons.filter((polygon) => !polygon.isOffMeshConnection));

	if (!removedPolygons.length) {
		return { navMesh, tileCache, navMeshQuery };
	}

	navMeshQuery.destroy();
	tileCache.destroy();
	navMesh.destroy();

	if (!keptAreas.length) {
		throw new Error("No walkable area found around the reference node of the isolated areas.");
	}

	// Polygons are expanded to also catch the cells the simplification of the contours left out. Heights stay within half
	// the height of an agent so a walkable area above or below a removed one is never caught.
	const volumes = removedPolygons.map((polygon) => {
		const expandedVertices = expandPolygon(polygon, cs * 1.5);
		const heights = polygon.vertices.map((vertex) => vertex[1]);

		const vertices = new FloatArray();
		vertices.copy(expandedVertices.flat());

		return {
			vertices,
			verticesCount: expandedVertices.length,
			minimumHeight: Math.min(...heights) - agentHeight * 0.5,
			maximumHeight: Math.max(...heights) + agentHeight * 0.5,
			minimumX: Math.min(...expandedVertices.map((vertex) => vertex[0])),
			maximumX: Math.max(...expandedVertices.map((vertex) => vertex[0])),
			minimumZ: Math.min(...expandedVertices.map((vertex) => vertex[2])),
			maximumZ: Math.max(...expandedVertices.map((vertex) => vertex[2])),
		};
	});

	try {
		const result = await generateTileCache(positions, indices, config, {
			onProgress: (progress) => onProgress?.({ label: "Removing isolated areas", progress }),
			markTileAreas: (buildContext, compactHeightfield, tileBoundsMin, tileBoundsMax) => {
				volumes.forEach((volume) => {
					if (volume.maximumX < tileBoundsMin[0] || volume.minimumX > tileBoundsMax[0] || volume.maximumZ < tileBoundsMin[2] || volume.minimumZ > tileBoundsMax[2]) {
						return;
					}

					markConvexPolyArea(buildContext, volume.vertices, volume.verticesCount, volume.minimumHeight, volume.maximumHeight, Recast.RC_NULL_AREA, compactHeightfield);
				});
			},
		});

		return {
			...result,
			navMeshQuery: new NavMeshQuery(result.navMesh),
		};
	} finally {
		volumes.forEach((volume) => volume.vertices.destroy());
	}
}

/**
 * Returns the walkable areas of the given navmesh, largest first: the groups of polygons connected together.
 */
function getWalkableAreas(navMesh: NavMesh): IWalkableArea[] {
	const polygons = new Map<number, INavMeshPolygon>();

	for (let tileIndex = 0; tileIndex < navMesh.getMaxTiles(); ++tileIndex) {
		const tile = navMesh.getTile(tileIndex);
		const header = tile.header();
		if (!header) {
			continue;
		}

		const polygonRefBase = navMesh.getPolyRefBase(tile);

		for (let polygonIndex = 0; polygonIndex < header.polyCount(); ++polygonIndex) {
			const poly = tile.polys(polygonIndex);

			const vertices: Vector3Tuple[] = [];
			const tileBorderEdges: boolean[] = [];

			for (let i = 0; i < poly.vertCount(); ++i) {
				const vertexIndex = poly.verts(i) * 3;
				vertices.push([tile.verts(vertexIndex), tile.verts(vertexIndex + 1), tile.verts(vertexIndex + 2)]);
				tileBorderEdges.push((poly.neis(i) & Detour.DT_EXT_LINK) !== 0);
			}

			const links: number[] = [];
			for (let link = poly.firstLink(); link !== Detour.DT_NULL_LINK; link = tile.links(link).next()) {
				links.push(tile.links(link).ref() >>> 0);
			}

			polygons.set((polygonRefBase | polygonIndex) >>> 0, {
				links,
				vertices,
				tileBorderEdges,
				surface: Math.abs(getSignedPolygonArea(vertices)),
				// Off-mesh connections link walkable areas together but aren't walkable surfaces (DT_POLYTYPE_OFFMESH_CONNECTION).
				isOffMeshConnection: poly.getType() === 1,
			});
		}
	}

	const walkableAreas: IWalkableArea[] = [];
	const visitedRefs = new Set<number>();

	polygons.forEach((_, ref) => {
		if (visitedRefs.has(ref)) {
			return;
		}

		const walkableArea: IWalkableArea = { surface: 0, refs: new Set(), polygons: [] };
		const refsToVisit = [ref];

		visitedRefs.add(ref);

		while (refsToVisit.length) {
			const currentRef = refsToVisit.pop()!;
			const polygon = polygons.get(currentRef)!;

			walkableArea.refs.add(currentRef);
			walkableArea.surface += polygon.surface;
			walkableArea.polygons.push(polygon);

			polygon.links.forEach((link) => {
				if (polygons.has(link) && !visitedRefs.has(link)) {
					visitedRefs.add(link);
					refsToVisit.push(link);
				}
			});
		}

		walkableAreas.push(walkableArea);
	});

	return walkableAreas.sort((a, b) => b.surface - a.surface);
}

/**
 * Returns the area of the given polygon on the X and Z axes, positive when its vertices are counter-clockwise.
 */
function getSignedPolygonArea(vertices: Vector3Tuple[]): number {
	let area = 0;
	vertices.forEach((vertex, index) => {
		const next = vertices[(index + 1) % vertices.length];
		area += vertex[0] * next[2] - next[0] * vertex[2];
	});

	return area * 0.5;
}

/**
 * Moves the edges of the given convex polygon outward by the given distance on the X and Z axes, except the edges on the
 * border of its tile: the contours aren't simplified there and the cells beyond belong to the neighbor tile.
 */
function expandPolygon(polygon: INavMeshPolygon, distance: number): Vector3Tuple[] {
	const outwardSign = getSignedPolygonArea(polygon.vertices) > 0 ? 1 : -1;

	// Outward normal and offset of the edge that starts at each vertex.
	const edges = polygon.vertices.map((vertex, index) => {
		const next = polygon.vertices[(index + 1) % polygon.vertices.length];

		const directionX = next[0] - vertex[0];
		const directionZ = next[2] - vertex[2];
		const length = Math.hypot(directionX, directionZ) || 1;

		return {
			normalX: (outwardSign * directionZ) / length,
			normalZ: (-outwardSign * directionX) / length,
			offset: polygon.tileBorderEdges[index] ? 0 : distance,
		};
	});

	return polygon.vertices.flatMap((vertex, index): Vector3Tuple[] => {
		const previous = edges[(index + edges.length - 1) % edges.length];
		const next = edges[index];

		const dot = previous.normalX * next.normalX + previous.normalZ * next.normalZ;
		const determinant = previous.normalX * next.normalZ - previous.normalZ * next.normalX;

		// The corners sharper than 60° are beveled as the moved edges meet too far away from them (thin polygons), so are
		// the parallel edges that never meet.
		if (dot < -0.5 || Math.abs(determinant) < 1e-6) {
			return [
				[vertex[0] + previous.normalX * previous.offset, vertex[1], vertex[2] + previous.normalZ * previous.offset],
				[vertex[0] + next.normalX * next.offset, vertex[1], vertex[2] + next.normalZ * next.offset],
			];
		}

		// The moved vertex is offset by the expected distance along the normals of both edges.
		const offsetX = (previous.offset * next.normalZ - previous.normalZ * next.offset) / determinant;
		const offsetZ = (previous.normalX * next.offset - previous.offset * next.normalX) / determinant;

		return [[vertex[0] + offsetX, vertex[1], vertex[2] + offsetZ]];
	});
}
