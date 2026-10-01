import type { ITerrainGrid, ITerrainMetric, ITerrainRect, ITerrainSculptOptions } from "../types";

import type { ITerrainHeightKernelContext } from "./sculpt";

/** Scratch slot of the thermal Jacobi copy (kernels use slots >= 16, see ITerrainScratch). */
const THERMAL_SCRATCH_SLOT = 18;

/** Neighbour offsets (column, row) of the thermal erosion: the 8 neighbours of a vertex. */
const NEIGHBOUR_COLUMNS = [-1, 0, 1, -1, 1, -1, 0, 1];
const NEIGHBOUR_ROWS = [-1, -1, -1, 0, 0, 1, 1, 1];

/** Minimum sediment capacity of a droplet (§4.5). */
const MIN_SEDIMENT_CAPACITY = 0.01;

/** Rejection sampling attempts per droplet start point before giving the droplet up. */
const MAX_START_ATTEMPTS = 256;

/** Keeps droplet positions strictly below the upper bound (so the cell's +1 corners stay inside the write bounds). */
const POSITION_EPSILON = 1e-4;

interface ITerrainTouchedRect {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

interface ITerrainThermalPass {
	heights: Float32Array;
	grid: ITerrainGrid;
	metric: ITerrainMetric;
	/** tan(talus angle). */
	talus: number;
	/** Eroded elements (inclusive, inside the grid). */
	rect: ITerrainRect;
	/** Dab weights (null = weight 1 everywhere) and their layout. */
	weights: Float32Array | null;
	weightsRect: ITerrainRect;
	weightsStride: number;
	/** Multiplier of the weights. */
	amount: number;
	/** Jacobi copy of rect ⊕ 1 (clamped to the grid), at least (rect ⊕ 1) area floats. */
	copy: Float32Array;
	lo: number;
	hi: number;
	touched: ITerrainTouchedRect;
}

interface ITerrainHydraulicSimulation {
	heights: Float32Array;
	columns: number;
	/** Normalized heights per local unit: Hn = h × sy / cw (§4.5). */
	toNormalized: number;
	/** Droplet positions stay in [minX, maxX) × [minY, maxY) (fractional column, row): their cell corners are inside the write bounds. */
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	inertia: number;
	capacity: number;
	erosion: number;
	deposition: number;
	evaporation: number;
	gravity: number;
	lifetime: number;
	/** Invert of the brush: the droplets pick sediment up without lowering the terrain and only deposit (§1.6). */
	depositOnly: boolean;
	lo: number;
	hi: number;
	touched: ITerrainTouchedRect;
}

function createTouchedRect(): ITerrainTouchedRect {
	return { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
}

function touchedToRect(touched: ITerrainTouchedRect): ITerrainRect | null {
	return touched.x1 < touched.x0 || touched.y1 < touched.y0 ? null : { x0: touched.x0, y0: touched.y0, x1: touched.x1, y1: touched.y1 };
}

function clampToGrid(rect: ITerrainRect, grid: ITerrainGrid): ITerrainRect | null {
	const x0 = Math.max(rect.x0, 0);
	const y0 = Math.max(rect.y0, 0);
	const x1 = Math.min(rect.x1, grid.columns - 1);
	const y1 = Math.min(rect.y1, grid.rows - 1);
	return x1 < x0 || y1 < y0 ? null : { x0, y0, x1, y1 };
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
	if (!Number.isFinite(value)) {
		return fallback;
	}

	return value < min ? min : value > max ? max : value;
}

/**
 * One Jacobi pass of thermal erosion (§4.5) over pass.rect: for each element i with amount a_i and each of its 8 neighbours n,
 * excess_n = (h_i − h_n) sy − T dist_n; when d_max = max excess > 0, every positive neighbour receives a_i (d_max / 2)(excess_n / d_total) / sy,
 * taken from h_i. Reads the copy only, writes rect ⊕ 1.
 */
function runThermalPass(pass: ITerrainThermalPass): void {
	const { heights, grid, metric, rect, weights, weightsRect, weightsStride, copy, lo, hi, touched } = pass;
	const columns = grid.columns;
	const lastColumn = grid.columns - 1;
	const lastRow = grid.rows - 1;

	const regionX0 = Math.max(0, rect.x0 - 1);
	const regionY0 = Math.max(0, rect.y0 - 1);
	const regionX1 = Math.min(lastColumn, rect.x1 + 1);
	const regionY1 = Math.min(lastRow, rect.y1 + 1);
	const regionWidth = regionX1 - regionX0 + 1;

	for (let y = regionY0; y <= regionY1; ++y) {
		const start = y * columns + regionX0;
		copy.set(heights.subarray(start, start + regionWidth), (y - regionY0) * regionWidth);
	}

	const cellX = grid.cellX * metric.sx;
	const cellZ = grid.cellZ * metric.sz;
	const diagonal = Math.sqrt(cellX * cellX + cellZ * cellZ);
	const talusDistances = [diagonal, cellZ, diagonal, cellX, cellX, diagonal, cellZ, diagonal].map((distance) => distance * pass.talus);
	const sy = metric.sy;
	const excess = new Float64Array(8);

	for (let y = rect.y0; y <= rect.y1; ++y) {
		const weightRow = weights ? (y - weightsRect.y0) * weightsStride - weightsRect.x0 : 0;
		const copyRow = (y - regionY0) * regionWidth - regionX0;

		for (let x = rect.x0; x <= rect.x1; ++x) {
			const a = (weights ? weights[weightRow + x] : 1) * pass.amount;
			if (!(a > 0)) {
				continue;
			}

			const h = copy[copyRow + x];
			let maxExcess = 0;
			let totalExcess = 0;

			for (let k = 0; k < 8; ++k) {
				const nx = x + NEIGHBOUR_COLUMNS[k];
				const ny = y + NEIGHBOUR_ROWS[k];
				if (nx < 0 || ny < 0 || nx > lastColumn || ny > lastRow) {
					excess[k] = 0;
					continue;
				}

				const e = (h - copy[(ny - regionY0) * regionWidth + nx - regionX0]) * sy - talusDistances[k];
				excess[k] = e;
				if (e > 0) {
					totalExcess += e;
					if (e > maxExcess) {
						maxExcess = e;
					}
				}
			}

			if (!(maxExcess > 0)) {
				continue;
			}

			const factor = (a * maxExcess * 0.5) / (totalExcess * sy);
			let removed = 0;

			for (let k = 0; k < 8; ++k) {
				const e = excess[k];
				if (e > 0) {
					const move = factor * e;
					const index = (y + NEIGHBOUR_ROWS[k]) * columns + x + NEIGHBOUR_COLUMNS[k];
					const value = heights[index] + move;
					heights[index] = value < lo ? lo : value > hi ? hi : value;
					removed += move;
				}
			}

			const index = y * columns + x;
			const value = heights[index] - removed;
			heights[index] = value < lo ? lo : value > hi ? hi : value;

			touched.x0 = Math.min(touched.x0, Math.max(0, x - 1));
			touched.y0 = Math.min(touched.y0, Math.max(0, y - 1));
			touched.x1 = Math.max(touched.x1, Math.min(lastColumn, x + 1));
			touched.y1 = Math.max(touched.y1, Math.min(lastRow, y + 1));
		}
	}
}

/** Adds `amount` (local units, negative to erode) at the 4 corners of the cell (ix, iy) weighted bilinearly by (u, v). */
function depositBilinear(simulation: ITerrainHydraulicSimulation, ix: number, iy: number, u: number, v: number, amount: number): void {
	const { heights, columns, lo, hi, touched } = simulation;
	const i00 = iy * columns + ix;
	const i01 = i00 + columns;

	let value = heights[i00] + amount * (1 - u) * (1 - v);
	heights[i00] = value < lo ? lo : value > hi ? hi : value;
	value = heights[i00 + 1] + amount * u * (1 - v);
	heights[i00 + 1] = value < lo ? lo : value > hi ? hi : value;
	value = heights[i01] + amount * (1 - u) * v;
	heights[i01] = value < lo ? lo : value > hi ? hi : value;
	value = heights[i01 + 1] + amount * u * v;
	heights[i01 + 1] = value < lo ? lo : value > hi ? hi : value;

	touched.x0 = Math.min(touched.x0, ix);
	touched.y0 = Math.min(touched.y0, iy);
	touched.x1 = Math.max(touched.x1, ix + 1);
	touched.y1 = Math.max(touched.y1, iy + 1);
}

/**
 * One droplet (Beyer 2015, §4.5), in normalized heights Hn = h sy / cw and fractional (column, row) positions. The speed follows the
 * energy balance of the fall, speed² − dh × gravity with dh = H(new) − H(old) (a descent accelerates the droplet): the spec text writes
 * `speed² + dh gravity` (the erratum of Beyer's thesis, copied by common implementations), which with heights normalized per cell stops
 * every droplet at the first steep step and turns the tool into a blur.
 */
function simulateDroplet(simulation: ITerrainHydraulicSimulation, startX: number, startY: number, random: () => number): void {
	const { heights, columns, toNormalized, minX, minY, maxX, maxY, inertia, capacity, erosion, deposition, evaporation, gravity } = simulation;
	const toLocal = 1 / toNormalized;

	let px = startX;
	let py = startY;
	let directionX = 0;
	let directionY = 0;
	let speed = 1;
	let water = 1;
	let sediment = 0;

	for (let step = 0; step < simulation.lifetime; ++step) {
		const ix = Math.floor(px);
		const iy = Math.floor(py);
		const u = px - ix;
		const v = py - iy;
		const i00 = iy * columns + ix;
		const h00 = heights[i00] * toNormalized;
		const h10 = heights[i00 + 1] * toNormalized;
		const h01 = heights[i00 + columns] * toNormalized;
		const h11 = heights[i00 + columns + 1] * toNormalized;

		const gradientX = (h10 - h00) * (1 - v) + (h11 - h01) * v;
		const gradientY = (h01 - h00) * (1 - u) + (h11 - h10) * u;
		const height = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;

		directionX = directionX * inertia - gradientX * (1 - inertia);
		directionY = directionY * inertia - gradientY * (1 - inertia);
		const length = Math.sqrt(directionX * directionX + directionY * directionY);
		if (length > 1e-12) {
			directionX /= length;
			directionY /= length;
		} else {
			const angle = random() * Math.PI * 2;
			directionX = Math.cos(angle);
			directionY = Math.sin(angle);
		}

		const nextX = px + directionX;
		const nextY = py + directionY;
		if (!(nextX >= minX && nextX < maxX && nextY >= minY && nextY < maxY)) {
			break;
		}

		const nx = Math.floor(nextX);
		const ny = Math.floor(nextY);
		const nu = nextX - nx;
		const nv = nextY - ny;
		const n00 = ny * columns + nx;
		const nextHeight =
			(heights[n00] * (1 - nu) * (1 - nv) + heights[n00 + 1] * nu * (1 - nv) + heights[n00 + columns] * (1 - nu) * nv + heights[n00 + columns + 1] * nu * nv) * toNormalized;

		const deltaHeight = nextHeight - height;
		const sedimentCapacity = Math.max(-deltaHeight * speed * water * capacity, MIN_SEDIMENT_CAPACITY);

		if (sediment > sedimentCapacity || deltaHeight > 0) {
			const amount = deltaHeight > 0 ? Math.min(deltaHeight, sediment) : (sediment - sedimentCapacity) * deposition;
			if (amount > 0) {
				sediment -= amount;
				depositBilinear(simulation, ix, iy, u, v, amount * toLocal);
			}
		} else {
			const amount = Math.min((sedimentCapacity - sediment) * erosion, -deltaHeight);
			if (amount > 0) {
				sediment += amount;
				if (!simulation.depositOnly) {
					depositBilinear(simulation, ix, iy, u, v, -amount * toLocal);
				}
			}
		}

		speed = Math.sqrt(Math.max(0, speed * speed - deltaHeight * gravity));
		water *= 1 - evaporation;
		px = nextX;
		py = nextY;
	}
}

function createHydraulicSimulation(
	heights: Float32Array,
	grid: ITerrainGrid,
	metric: ITerrainMetric,
	options: ITerrainSculptOptions["erode"],
	bounds: { minX: number; minY: number; maxX: number; maxY: number }
): ITerrainHydraulicSimulation | null {
	const cellWorld = (grid.cellX * metric.sx + grid.cellZ * metric.sz) * 0.5;
	const toNormalized = metric.sy / cellWorld;
	if (!(toNormalized > 0) || !Number.isFinite(toNormalized) || !(bounds.maxX > bounds.minX) || !(bounds.maxY > bounds.minY)) {
		return null;
	}

	return {
		heights,
		columns: grid.columns,
		toNormalized,
		...bounds,
		inertia: clampNumber(options.inertia, 0, 1, 0.05),
		capacity: clampNumber(options.capacity, 0, 1e6, 4),
		erosion: clampNumber(options.erosion, 0, 1, 0.3),
		deposition: clampNumber(options.deposition, 0, 1, 0.3),
		evaporation: clampNumber(options.evaporation, 0, 1, 0.01),
		gravity: clampNumber(options.gravity, 0, 1e6, 4),
		lifetime: Math.round(clampNumber(options.lifetime, 1, 1000, 30)),
		depositOnly: false,
		lo: -Infinity,
		hi: Infinity,
		touched: createTouchedRect(),
	};
}

/**
 * Thermal erosion of one dab (§4.5): `options.erode.iterations` Jacobi passes over the dab rect, a_i = w × dab.strength × dab.amountScale,
 * talus = options.erode.talusDegrees. Writes stay in rect ⊕ 1 (the journal touches rect ⊕ 1). Mass is conserved (height clamp aside).
 */
export function applyTerrainThermalErosion(context: ITerrainHeightKernelContext): ITerrainRect | null {
	const { grid, metric, heights, dabWeights, dab, options } = context;
	const rect = clampToGrid(dabWeights.rect, grid);
	const amount = dab.strength * dab.amountScale;
	if (!rect || !(amount > 0) || !Number.isFinite(amount)) {
		return null;
	}

	const regionWidth = Math.min(grid.columns - 1, rect.x1 + 1) - Math.max(0, rect.x0 - 1) + 1;
	const regionHeight = Math.min(grid.rows - 1, rect.y1 + 1) - Math.max(0, rect.y0 - 1) + 1;
	const iterations = Math.round(clampNumber(options.erode.iterations, 1, 64, 3));

	const pass: ITerrainThermalPass = {
		heights,
		grid,
		metric,
		talus: Math.tan((clampNumber(options.erode.talusDegrees, 0, 89, 35) * Math.PI) / 180),
		rect,
		weights: dabWeights.weights,
		weightsRect: dabWeights.rect,
		weightsStride: dabWeights.stride,
		amount,
		copy: context.scratch.floats(regionWidth * regionHeight, THERMAL_SCRATCH_SLOT),
		lo: context.clampLocal ? Math.min(context.clampLocal.min, context.clampLocal.max) : -Infinity,
		hi: context.clampLocal ? Math.max(context.clampLocal.min, context.clampLocal.max) : Infinity,
		touched: createTouchedRect(),
	};

	for (let iteration = 0; iteration < iterations; ++iteration) {
		runThermalPass(pass);
	}

	return touchedToRect(pass.touched);
}

/**
 * Hydraulic erosion of one dab (§4.5): D = max(1, round(droplets × dab.strength × dab.amountScale)) droplets start inside the dab rect with a
 * probability proportional to the dab weight (rejection sampling with `random`, normally mulberry32(dab.seed)); droplets stop when they leave
 * rect ⊕ 2, so every write stays in rect ⊕ 2 (the journal touches rect ⊕ 2). Invert = deposit only. Deterministic for a given `random`.
 */
export function applyTerrainHydraulicErosion(context: ITerrainHeightKernelContext, random: () => number): ITerrainRect | null {
	const { grid, metric, heights, dabWeights, dab, options } = context;
	const rect = clampToGrid(dabWeights.rect, grid);
	const amount = dab.strength * dab.amountScale;
	if (!rect || !(amount > 0) || !Number.isFinite(amount)) {
		return null;
	}

	const { weights, stride } = dabWeights;
	let maxWeight = 0;
	for (let y = rect.y0; y <= rect.y1; ++y) {
		const weightRow = (y - dabWeights.rect.y0) * stride - dabWeights.rect.x0;
		for (let x = rect.x0; x <= rect.x1; ++x) {
			const w = weights[weightRow + x];
			if (w > maxWeight) {
				maxWeight = w;
			}
		}
	}

	if (!(maxWeight > 0)) {
		return null;
	}

	const simulation = createHydraulicSimulation(heights, grid, metric, options.erode, {
		minX: Math.max(0, rect.x0 - 2),
		minY: Math.max(0, rect.y0 - 2),
		maxX: Math.min(grid.columns - 1, rect.x1 + 2),
		maxY: Math.min(grid.rows - 1, rect.y1 + 2),
	});
	if (!simulation) {
		return null;
	}

	simulation.depositOnly = context.invert;
	if (context.clampLocal) {
		simulation.lo = Math.min(context.clampLocal.min, context.clampLocal.max);
		simulation.hi = Math.max(context.clampLocal.min, context.clampLocal.max);
	}

	const droplets = Math.max(1, Math.round(clampNumber(options.erode.droplets, 0, 1e6, 64) * amount));
	const width = rect.x1 - rect.x0 + 1;
	const height = rect.y1 - rect.y0 + 1;
	const highX = simulation.maxX - POSITION_EPSILON;
	const highY = simulation.maxY - POSITION_EPSILON;

	for (let droplet = 0; droplet < droplets; ++droplet) {
		for (let attempt = 0; attempt < MAX_START_ATTEMPTS; ++attempt) {
			const x = rect.x0 + Math.min(width - 1, Math.floor(random() * width));
			const y = rect.y0 + Math.min(height - 1, Math.floor(random() * height));
			const w = weights[(y - dabWeights.rect.y0) * stride + x - dabWeights.rect.x0];
			if (!(random() * maxWeight < w)) {
				continue;
			}

			const startX = x + random() - 0.5;
			const startY = y + random() - 0.5;
			simulateDroplet(
				simulation,
				startX < simulation.minX ? simulation.minX : startX > highX ? highX : startX,
				startY < simulation.minY ? simulation.minY : startY > highY ? highY : startY,
				random
			);
			break;
		}
	}

	return touchedToRect(simulation.touched);
}

/** Thermal erosion of the whole terrain (§4.5, global operation): `iterations` Jacobi passes with a_i = amount everywhere, no height clamp. */
export function erodeTerrainThermal(
	heights: Float32Array,
	grid: ITerrainGrid,
	metric: ITerrainMetric,
	options: { talusDegrees: number; iterations: number; amount: number }
): void {
	const amount = clampNumber(options.amount, 0, 1, 0);
	const iterations = Math.round(clampNumber(options.iterations, 0, 10000, 1));
	if (!(amount > 0) || iterations < 1) {
		return;
	}

	const rect = grid.columns >= 1 && grid.rows >= 1 ? { x0: 0, y0: 0, x1: grid.columns - 1, y1: grid.rows - 1 } : null;
	if (!rect) {
		return;
	}

	const pass: ITerrainThermalPass = {
		heights,
		grid,
		metric,
		talus: Math.tan((clampNumber(options.talusDegrees, 0, 89, 35) * Math.PI) / 180),
		rect,
		weights: null,
		weightsRect: rect,
		weightsStride: 0,
		amount,
		copy: new Float32Array(grid.columns * grid.rows),
		lo: -Infinity,
		hi: Infinity,
		touched: createTouchedRect(),
	};

	for (let iteration = 0; iteration < iterations; ++iteration) {
		runThermalPass(pass);
	}
}

/**
 * Runs `droplets` droplets over the whole terrain (the engine calls it in batches for progress). Start points are uniform over the grid;
 * `random` drives everything (the engine keeps one mulberry32(options.seed) across the batches, so the result is deterministic per seed).
 */
export function erodeTerrainHydraulic(
	heights: Float32Array,
	grid: ITerrainGrid,
	metric: ITerrainMetric,
	options: ITerrainSculptOptions["erode"] & { seed: number },
	random: () => number
): void {
	const quadColumns = grid.columns - 1;
	const quadRows = grid.rows - 1;
	const droplets = Math.floor(clampNumber(options.droplets, 0, 1e9, 0));
	const simulation = createHydraulicSimulation(heights, grid, metric, options, { minX: 0, minY: 0, maxX: quadColumns, maxY: quadRows });
	if (!simulation || droplets < 1) {
		return;
	}

	const highX = quadColumns - POSITION_EPSILON;
	const highY = quadRows - POSITION_EPSILON;
	for (let droplet = 0; droplet < droplets; ++droplet) {
		const startX = random() * quadColumns;
		const startY = random() * quadRows;
		simulateDroplet(simulation, startX > highX ? highX : startX, startY > highY ? highY : startY, random);
	}
}
