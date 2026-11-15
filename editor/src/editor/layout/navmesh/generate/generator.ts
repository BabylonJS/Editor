import {
	Raw,
	vec3,
	Detour,
	NavMesh,
	TileCache,
	NavMeshParams,
	TileCacheData,
	UnsignedCharArray,
	VerticesArray,
	TrianglesArray,
	TriangleAreasArray,
	RecastBuildContext,
	RecastCompactHeightfield,
	DetourTileCacheParams,
	Vector3Tuple,
	statusFailed,
	calcGridSize,
	createRcConfig,
	allocHeightfield,
	createHeightfield,
	freeHeightfield,
	markWalkableTriangles,
	rasterizeTriangles,
	filterLedgeSpans,
	filterWalkableLowHeightSpans,
	filterLowHangingWalkableObstacles,
	allocCompactHeightfield,
	buildCompactHeightfield,
	freeCompactHeightfield,
	erodeWalkableArea,
	allocHeightfieldLayerSet,
	buildHeightfieldLayers,
	freeHeightfieldLayerSet,
	buildTileCacheLayer,
	getHeightfieldLayerCons,
	getHeightfieldLayerAreas,
	getHeightfieldLayerHeights,
} from "@recast-navigation/core";
import { TileCacheGeneratorConfig, createDefaultTileCacheMeshProcess, dtIlog2, dtNextPow2, getBoundingBox, tileCacheGeneratorConfigDefaults } from "@recast-navigation/generators";

import { wait } from "../../../../tools/tools";

export type MarkTileAreasCallback = (
	buildContext: RecastBuildContext,
	compactHeightfield: RecastCompactHeightfield,
	tileBoundsMin: Vector3Tuple,
	tileBoundsMax: Vector3Tuple
) => void;

export interface ITileCacheGeneratorOptions {
	/**
	 * Defines the function called once the walkable area of a tile is eroded, to change the area of its spans before they
	 * are stored in the tile cache layers.
	 */
	markTileAreas?: MarkTileAreasCallback;
	/**
	 * Defines the function called regularly with the progress of the generation, from 0 to 1.
	 */
	onProgress?: (progress: number) => void;
}

export interface ITileCacheGeneratorResult {
	navMesh: NavMesh;
	tileCache: TileCache;
}

/**
 * Builds a tile cache and its navmesh the same way "generateTileCache" from "@recast-navigation/generators" (0.43.0) does,
 * except that:
 * - each tile rasterizes the list of triangles overlapping it instead of the chunks of a chunky triangle mesh: building
 *   it sorts all the triangles on each level of its tree (19 of the 21 seconds of a 6 millions triangles scene) and the
 *   generator only reads the first 512 chunks of a tile, ignoring the rest of the geometry of the dense tiles.
 * - once the walkable area of a tile is eroded, "options.markTileAreas" can change the area of its spans before they are
 *   stored in the tile cache layers (the generator has no hook for it).
 * - it gives the hand back regularly so the editor stays responsive and can display the progress.
 * Intermediates are never kept.
 * @throws Error if the tile cache or the navmesh can't be built.
 */
export async function generateTileCache(
	positions: Float32Array,
	indices: Uint32Array,
	navMeshGeneratorConfig: Partial<TileCacheGeneratorConfig>,
	options: ITileCacheGeneratorOptions = {}
): Promise<ITileCacheGeneratorResult> {
	const buildContext = new RecastBuildContext();

	const tileCache = new TileCache();
	const navMesh = new NavMesh();

	const numVertices = positions.length / 3;

	const verticesArray = new VerticesArray();
	verticesArray.copy(positions as Float32Array<ArrayBuffer>);

	const tileTrianglesArray = new TrianglesArray();

	try {
		const { bbMin, bbMax } = navMeshGeneratorConfig.bounds
			? { bbMin: navMeshGeneratorConfig.bounds[0], bbMax: navMeshGeneratorConfig.bounds[1] }
			: getBoundingBox(positions, indices);

		const { expectedLayersPerTile, maxObstacles, ...recastConfig } = {
			...tileCacheGeneratorConfigDefaults,
			...navMeshGeneratorConfig,
		};

		const config = createRcConfig(recastConfig);
		const gridSize = calcGridSize(bbMin, bbMax, config.cs);
		config.width = gridSize.width;
		config.height = gridSize.height;
		config.minRegionArea = config.minRegionArea * config.minRegionArea;
		config.mergeRegionArea = config.mergeRegionArea * config.mergeRegionArea;
		config.detailSampleDist = config.detailSampleDist < 0.9 ? 0 : config.cs * config.detailSampleDist;
		config.detailSampleMaxError = config.ch * config.detailSampleMaxError;

		const tileSize = Math.floor(config.tileSize);
		const tileWidth = Math.floor((config.width + tileSize - 1) / tileSize);
		const tileHeight = Math.floor((config.height + tileSize - 1) / tileSize);

		config.borderSize = config.walkableRadius + 3;
		config.width = config.tileSize + config.borderSize * 2;
		config.height = config.tileSize + config.borderSize * 2;

		const tileCacheParams = DetourTileCacheParams.create({
			orig: bbMin,
			cs: config.cs,
			ch: config.ch,
			width: config.tileSize,
			height: config.tileSize,
			walkableHeight: config.walkableHeight * config.ch,
			walkableRadius: config.walkableRadius * config.cs,
			walkableClimb: config.walkableClimb * config.ch,
			maxSimplificationError: config.maxSimplificationError,
			maxTiles: tileWidth * tileHeight * expectedLayersPerTile,
			maxObstacles,
		});

		// Kept alive: the tile cache uses them each time it rebuilds a tile (obstacles).
		const allocator = new Raw.RecastLinearAllocator(32000);
		const compressor = new Raw.RecastFastLZCompressor();

		if (!tileCache.init(tileCacheParams, allocator, compressor, navMeshGeneratorConfig.tileCacheMeshProcess ?? createDefaultTileCacheMeshProcess())) {
			throw new Error("Failed to initialize tile cache");
		}

		// There are 22 bits available to identify a tile and a polygon.
		const tileBits = Math.min(Math.floor(dtIlog2(dtNextPow2(tileWidth * tileHeight * expectedLayersPerTile))), 14);

		const navMeshParams = NavMeshParams.create({
			orig: vec3.fromArray(bbMin),
			tileWidth: config.tileSize * config.cs,
			tileHeight: config.tileSize * config.cs,
			maxTiles: 1 << tileBits,
			maxPolys: 1 << (22 - tileBits),
		});

		if (!navMesh.initTiled(navMeshParams)) {
			throw new Error("Failed to initialize tiled navmesh");
		}

		const tileWorldSize = config.tileSize * config.cs;
		const borderWorldSize = config.borderSize * config.cs;

		const tilesTriangles = getTilesTriangles(positions, indices, {
			origin: bbMin,
			width: tileWidth,
			height: tileHeight,
			tileWorldSize,
			borderWorldSize,
		});
		const tileTriangleIndices = new Int32Array(tilesTriangles.maxTileTrianglesCount * 3);

		const rasterizeTileLayers = (tileX: number, tileY: number): UnsignedCharArray[] => {
			const tileBoundsMin: Vector3Tuple = [bbMin[0] + tileX * tileWorldSize - borderWorldSize, bbMin[1], bbMin[2] + tileY * tileWorldSize - borderWorldSize];
			const tileBoundsMax: Vector3Tuple = [bbMin[0] + (tileX + 1) * tileWorldSize + borderWorldSize, bbMax[1], bbMin[2] + (tileY + 1) * tileWorldSize + borderWorldSize];

			const tileIndex = tileX + tileY * tileWidth;
			const firstTriangle = tilesTriangles.offsets[tileIndex];
			const trianglesCount = tilesTriangles.offsets[tileIndex + 1] - firstTriangle;

			if (!trianglesCount) {
				return [];
			}

			const heightfield = allocHeightfield();
			const compactHeightfield = allocCompactHeightfield();
			const heightfieldLayerSet = allocHeightfieldLayerSet();

			try {
				if (!createHeightfield(buildContext, heightfield, config.width, config.height, tileBoundsMin, tileBoundsMax, config.cs, config.ch)) {
					return [];
				}

				for (let i = 0; i < trianglesCount; ++i) {
					const triangleIndex = tilesTriangles.triangles[firstTriangle + i] * 3;

					tileTriangleIndices[i * 3] = indices[triangleIndex];
					tileTriangleIndices[i * 3 + 1] = indices[triangleIndex + 1];
					tileTriangleIndices[i * 3 + 2] = indices[triangleIndex + 2];
				}

				tileTrianglesArray.copy(tileTriangleIndices.subarray(0, trianglesCount * 3));

				const triangleAreasArray = new TriangleAreasArray();
				triangleAreasArray.resize(trianglesCount);

				markWalkableTriangles(buildContext, config.walkableSlopeAngle, verticesArray, numVertices, tileTrianglesArray, trianglesCount, triangleAreasArray);
				const rasterized = rasterizeTriangles(
					buildContext,
					verticesArray,
					numVertices,
					tileTrianglesArray,
					triangleAreasArray,
					trianglesCount,
					heightfield,
					config.walkableClimb
				);

				triangleAreasArray.destroy();

				if (!rasterized) {
					return [];
				}

				filterLowHangingWalkableObstacles(buildContext, config.walkableClimb, heightfield);
				filterLedgeSpans(buildContext, config.walkableHeight, config.walkableClimb, heightfield);
				filterWalkableLowHeightSpans(buildContext, config.walkableHeight, heightfield);

				if (!buildCompactHeightfield(buildContext, config.walkableHeight, config.walkableClimb, heightfield, compactHeightfield)) {
					return [];
				}

				if (!erodeWalkableArea(buildContext, config.walkableRadius, compactHeightfield)) {
					return [];
				}

				options.markTileAreas?.(buildContext, compactHeightfield, tileBoundsMin, tileBoundsMax);

				if (!buildHeightfieldLayers(buildContext, compactHeightfield, config.borderSize, config.walkableHeight, heightfieldLayerSet)) {
					return [];
				}

				const tiles: UnsignedCharArray[] = [];

				for (let i = 0; i < heightfieldLayerSet.nlayers(); ++i) {
					const layer = heightfieldLayerSet.layers(i);
					const layerMin = layer.bmin();
					const layerMax = layer.bmax();

					const header = new Raw.dtTileCacheLayerHeader();
					header.magic = Detour.DT_TILECACHE_MAGIC;
					header.version = Detour.DT_TILECACHE_VERSION;
					header.tx = tileX;
					header.ty = tileY;
					header.tlayer = i;
					header.set_bmin(0, layerMin.x);
					header.set_bmin(1, layerMin.y);
					header.set_bmin(2, layerMin.z);
					header.set_bmax(0, layerMax.x);
					header.set_bmax(1, layerMax.y);
					header.set_bmax(2, layerMax.z);
					header.width = layer.width();
					header.height = layer.height();
					header.minx = layer.minx();
					header.maxx = layer.maxx();
					header.miny = layer.miny();
					header.maxy = layer.maxy();
					header.hmin = layer.hmin();
					header.hmax = layer.hmax();

					const tile = new TileCacheData();
					const status = buildTileCacheLayer(
						compressor,
						header,
						getHeightfieldLayerHeights(layer),
						getHeightfieldLayerAreas(layer),
						getHeightfieldLayerCons(layer),
						tile
					);

					if (statusFailed(status)) {
						return [];
					}

					tiles.push(tile);
				}

				return tiles;
			} finally {
				freeHeightfieldLayerSet(heightfieldLayerSet);
				freeCompactHeightfield(compactHeightfield);
				freeHeightfield(heightfield);
			}
		};

		// The time is spent rasterizing the triangles of the tiles.
		const totalTrianglesCount = tilesTriangles.offsets[tilesTriangles.offsets.length - 1];

		let lastYieldTime = performance.now();

		for (let y = 0; y < tileHeight; ++y) {
			for (let x = 0; x < tileWidth; ++x) {
				rasterizeTileLayers(x, y).forEach((tile) => tileCache.addTile(tile));

				if (performance.now() - lastYieldTime > 100) {
					options.onProgress?.(tilesTriangles.offsets[x + y * tileWidth + 1] / Math.max(1, totalTrianglesCount));

					await wait(0);
					lastYieldTime = performance.now();
				}
			}
		}

		for (let y = 0; y < tileHeight; ++y) {
			for (let x = 0; x < tileWidth; ++x) {
				if (statusFailed(tileCache.buildNavMeshTilesAt(x, y, navMesh))) {
					throw new Error(`Failed to build nav mesh tiles at ${x}, ${y}`);
				}
			}

			if (performance.now() - lastYieldTime > 100) {
				await wait(0);
				lastYieldTime = performance.now();
			}
		}

		options.onProgress?.(1);

		return { navMesh, tileCache };
	} catch (e) {
		tileCache.destroy();
		navMesh.destroy();

		throw e;
	} finally {
		verticesArray.destroy();
		tileTrianglesArray.destroy();
	}
}

interface ITilesGrid {
	/**
	 * Defines the minimum corner of the first tile.
	 */
	origin: Vector3Tuple;
	/**
	 * Defines the count of tiles on the X axis.
	 */
	width: number;
	/**
	 * Defines the count of tiles on the Z axis.
	 */
	height: number;
	/**
	 * Defines the size of a tile in world units.
	 */
	tileWorldSize: number;
	/**
	 * Defines the size of the border around each tile in world units.
	 */
	borderWorldSize: number;
}

interface ITilesTriangles {
	/**
	 * Defines the indices of the triangles overlapping each tile, one tile after the other.
	 */
	triangles: Uint32Array;
	/**
	 * Defines, for each tile, where its triangles start in "triangles". The last value is the total count.
	 */
	offsets: Uint32Array;
	/**
	 * Defines the count of triangles of the tile that has the most of them.
	 */
	maxTileTrianglesCount: number;
}

/**
 * Returns the triangles overlapping each tile of the given grid on the X and Z axes, its border included.
 */
function getTilesTriangles(positions: Float32Array, indices: Uint32Array, grid: ITilesGrid): ITilesTriangles {
	const trianglesCount = indices.length / 3;
	const offsets = new Uint32Array(grid.width * grid.height + 1);

	// Calls the callback for each tile overlapped by each triangle.
	const forEachTileTriangle = (callback: (tileIndex: number, triangleIndex: number) => void): void => {
		for (let triangleIndex = 0; triangleIndex < trianglesCount; ++triangleIndex) {
			let minX = Infinity;
			let maxX = -Infinity;
			let minZ = Infinity;
			let maxZ = -Infinity;

			for (let i = 0; i < 3; ++i) {
				const vertexIndex = indices[triangleIndex * 3 + i] * 3;

				minX = Math.min(minX, positions[vertexIndex]);
				maxX = Math.max(maxX, positions[vertexIndex]);
				minZ = Math.min(minZ, positions[vertexIndex + 2]);
				maxZ = Math.max(maxZ, positions[vertexIndex + 2]);
			}

			const firstTileX = Math.max(0, Math.floor((minX - grid.borderWorldSize - grid.origin[0]) / grid.tileWorldSize));
			const lastTileX = Math.min(grid.width - 1, Math.floor((maxX + grid.borderWorldSize - grid.origin[0]) / grid.tileWorldSize));
			const firstTileY = Math.max(0, Math.floor((minZ - grid.borderWorldSize - grid.origin[2]) / grid.tileWorldSize));
			const lastTileY = Math.min(grid.height - 1, Math.floor((maxZ + grid.borderWorldSize - grid.origin[2]) / grid.tileWorldSize));

			for (let tileY = firstTileY; tileY <= lastTileY; ++tileY) {
				for (let tileX = firstTileX; tileX <= lastTileX; ++tileX) {
					callback(tileX + tileY * grid.width, triangleIndex);
				}
			}
		}
	};

	// Counts the triangles of each tile, then fills them in place.
	forEachTileTriangle((tileIndex) => ++offsets[tileIndex + 1]);

	let maxTileTrianglesCount = 0;
	for (let i = 1; i < offsets.length; ++i) {
		maxTileTrianglesCount = Math.max(maxTileTrianglesCount, offsets[i]);
		offsets[i] += offsets[i - 1];
	}

	const triangles = new Uint32Array(offsets[offsets.length - 1]);
	const fillOffsets = offsets.slice(0, -1);

	forEachTileTriangle((tileIndex, triangleIndex) => (triangles[fillOffsets[tileIndex]++] = triangleIndex));

	return {
		offsets,
		triangles,
		maxTileTrianglesCount,
	};
}
