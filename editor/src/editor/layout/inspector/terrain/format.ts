/**
 * Pure formatting helpers of the Terrain tab (lengths, sizes, bytes, percentages, coverage). No imports: usable from every section and test.
 * Lengths are centimeters (the editor's unit); texts use the exact formats of SPEC §1.5, §1.10, §1.12 and §1.13.
 */

const TERRAIN_BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * Formats a number with at most `maxDecimals` decimals and without trailing zeros: 100 → "100", 1.5 → "1.5", 204.8 → "204.8", 0.125 → "0.13".
 * Non-finite values give "–".
 * @param value defines the number to format.
 * @param maxDecimals defines the maximum number of decimals (default 1).
 */
export function formatTerrainNumber(value: number, maxDecimals: number = 1): string {
	if (!Number.isFinite(value)) {
		return "–";
	}

	const decimals = Math.max(0, Math.min(6, Math.floor(maxDecimals)));
	let text = value.toFixed(decimals);
	if (text.includes(".")) {
		text = text.replace(/0+$/, "").replace(/\.$/, "");
	}

	return text === "-0" ? "0" : text;
}

/**
 * Formats a count with thousands separators: 66049 → "66,049".
 * @param value defines the count to format.
 */
export function formatTerrainCount(value: number): string {
	if (!Number.isFinite(value)) {
		return "–";
	}

	return Math.round(value).toLocaleString("en-US");
}

/**
 * Formats a length given in centimeters: meters with one decimal ((v / 100).toFixed(1), trailing ".0" removed) when |v| >= 100 cm, else centimeters.
 * 150 → "1.5 m", 10240 → "102.4 m", 10000 → "100 m", 50 → "50 cm", 12.5 → "12.5 cm".
 * @param centimeters defines the length in centimeters.
 */
export function formatTerrainLength(centimeters: number): string {
	if (!Number.isFinite(centimeters)) {
		return "–";
	}

	if (Math.abs(centimeters) >= 100) {
		return `${formatTerrainNumber(centimeters / 100, 1)} m`;
	}

	return `${formatTerrainNumber(centimeters, 1)} cm`;
}

/**
 * Formats a length in centimeters, always in centimeters: 204.8 → "204.8 cm", 40 → "40 cm".
 * @param centimeters defines the length in centimeters.
 * @param maxDecimals defines the maximum number of decimals (default 1).
 */
export function formatTerrainCentimeters(centimeters: number, maxDecimals: number = 1): string {
	return `${formatTerrainNumber(centimeters, maxDecimals)} cm`;
}

/**
 * Size badge of the header (§1.5): "W × H" in meters when the largest side is >= 100 cm, else in centimeters.
 * 10000 × 10000 → "100 × 100 m", 10240 × 5120 → "102.4 × 51.2 m", 50 × 80 → "50 × 80 cm".
 * @param width defines the width in centimeters.
 * @param height defines the height (depth) in centimeters.
 */
export function formatTerrainSize(width: number, height: number): string {
	if (!Number.isFinite(width) || !Number.isFinite(height)) {
		return "–";
	}

	if (Math.max(Math.abs(width), Math.abs(height)) >= 100) {
		return `${formatTerrainNumber(width / 100, 1)} × ${formatTerrainNumber(height / 100, 1)} m`;
	}

	return `${formatTerrainNumber(width, 1)} × ${formatTerrainNumber(height, 1)} cm`;
}

/**
 * Resolution badge (§1.5): 256 → "256²".
 * @param subdivisions defines the number of subdivisions (quads per side).
 */
export function formatTerrainResolution(subdivisions: number): string {
	return `${Math.round(subdivisions)}²`;
}

/**
 * Number of vertices of a (S + 1)² grid.
 * @param subdivisions defines the number of subdivisions (quads per side).
 */
export function getTerrainVertexCount(subdivisions: number): number {
	const columns = Math.max(0, Math.round(subdivisions)) + 1;
	return columns * columns;
}

/**
 * Size of one cell in centimeters (size / S); 0 when S < 1.
 * @param size defines the side length in centimeters.
 * @param subdivisions defines the number of subdivisions (quads per side).
 */
export function getTerrainCellSize(size: number, subdivisions: number): number {
	return subdivisions >= 1 ? size / subdivisions : 0;
}

/**
 * Resolution item of the Create terrain panel (§1.13.1): "{S}² · {cell} cm cells · {vertices} vertices".
 * 256 on 10240 × 10240 → "256² · 40 cm cells · 66,049 vertices". The cell is the largest of the two cell sizes.
 * @param subdivisions defines the number of subdivisions (quads per side).
 * @param width defines the width in centimeters.
 * @param height defines the height (depth) in centimeters.
 */
export function formatTerrainResolutionOption(subdivisions: number, width: number, height: number): string {
	const cell = Math.max(getTerrainCellSize(width, subdivisions), getTerrainCellSize(height, subdivisions));
	return `${formatTerrainResolution(subdivisions)} · ${formatTerrainNumber(cell, 1)} cm cells · ${formatTerrainCount(getTerrainVertexCount(subdivisions))} vertices`;
}

/**
 * Cell comparison of the Resize / resample dialog (§1.13.2): "cell 40 cm → 20 cm".
 * @param oldCell defines the current cell size in centimeters.
 * @param newCell defines the new cell size in centimeters.
 */
export function formatTerrainCellComparison(oldCell: number, newCell: number): string {
	return `cell ${formatTerrainNumber(oldCell, 1)} cm → ${formatTerrainNumber(newCell, 1)} cm`;
}

/**
 * Megabytes (2^20 bytes) without the unit: 0 decimals from 100 MB, 1 from 1 MB, 2 below; trailing zeros removed.
 * 4194304 → "4", 89478485 → "85.3", 699051 → "0.67".
 * @param bytes defines the size in bytes.
 */
export function formatTerrainMegabytesValue(bytes: number): string {
	if (!Number.isFinite(bytes)) {
		return "–";
	}

	const megabytes = bytes / TERRAIN_BYTES_PER_MEGABYTE;
	const absolute = Math.abs(megabytes);
	const decimals = absolute >= 100 ? 0 : absolute >= 1 ? 1 : 2;

	return formatTerrainNumber(megabytes, decimals);
}

/**
 * Megabytes with the unit: 4194304 → "4 MB".
 * @param bytes defines the size in bytes.
 */
export function formatTerrainMegabytes(bytes: number): string {
	return `${formatTerrainMegabytesValue(bytes)} MB`;
}

/**
 * Human readable size: "512 B", "1.5 KB", "4 MB", "1.2 GB" (1024 based).
 * @param bytes defines the size in bytes.
 */
export function formatTerrainBytes(bytes: number): string {
	if (!Number.isFinite(bytes)) {
		return "–";
	}

	const absolute = Math.abs(bytes);
	if (absolute < 1024) {
		return `${Math.round(bytes)} B`;
	}

	if (absolute < TERRAIN_BYTES_PER_MEGABYTE) {
		return `${formatTerrainNumber(bytes / 1024, 1)} KB`;
	}

	if (absolute < TERRAIN_BYTES_PER_MEGABYTE * 1024) {
		return formatTerrainMegabytes(bytes);
	}

	return `${formatTerrainNumber(bytes / (TERRAIN_BYTES_PER_MEGABYTE * 1024), 2)} GB`;
}

/**
 * GPU memory of the two layer texture arrays with mips (§1.10): n × size² × 4 bytes × 2 arrays × 4/3.
 * @param size defines the size of one layer (texels per side).
 * @param layerCount defines the number of layers.
 */
export function computeTerrainLayerTexturesBytes(size: number, layerCount: number): number {
	return (Math.max(0, layerCount) * size * size * 4 * 2 * 4) / 3;
}

/**
 * Layer texture resolution item (§1.10): "{size} ({MB} MB for {n} layers)"; 1024 with 4 layers → "1024 (42.7 MB for 4 layers)".
 * @param size defines the size of one layer (texels per side).
 * @param layerCount defines the number of layers.
 */
export function formatTerrainLayerTextureOption(size: number, layerCount: number): string {
	const count = Math.max(1, Math.round(layerCount));
	return `${size} (${formatTerrainMegabytesValue(computeTerrainLayerTexturesBytes(size, count))} MB for ${formatTerrainPlural(count, "layer")})`;
}

/**
 * CPU memory of the weight maps: size² × 4 bytes (RGBA8) per map.
 * @param size defines the size of the weight maps (texels per side).
 * @param mapCount defines the number of weight maps (1 or 2).
 */
export function computeTerrainWeightMapBytes(size: number, mapCount: number = 1): number {
	return size * size * 4 * Math.max(1, Math.round(mapCount));
}

/**
 * Weight map resolution item (§1.12): "{size}² ({MB} MB)"; 1024 → "1024² (4 MB)".
 * @param size defines the size of the weight maps (texels per side).
 * @param mapCount defines the number of weight maps (1 or 2).
 */
export function formatTerrainWeightMapOption(size: number, mapCount: number = 1): string {
	return `${size}² (${formatTerrainMegabytes(computeTerrainWeightMapBytes(size, mapCount))})`;
}

/**
 * Percentage of a 0..1 fraction, rounded: 0.35 → "35 %".
 * @param fraction defines the fraction (0..1).
 */
export function formatTerrainPercent(fraction: number): string {
	if (!Number.isFinite(fraction)) {
		return "–";
	}

	const percent = Math.round(fraction * 100);
	return `${percent === 0 ? 0 : percent} %`;
}

/**
 * Coverage badge of a layer row (§1.10): "{round(100 × coverage)} %", "–" when unknown (weights not loaded).
 * @param coverage defines the coverage (0..1) or null when unknown.
 */
export function formatTerrainCoverage(coverage: number | null | undefined): string {
	if (coverage === null || coverage === undefined || !Number.isFinite(coverage)) {
		return "–";
	}

	return formatTerrainPercent(Math.min(1, Math.max(0, coverage)));
}

/**
 * Busy banner text (§1.5): "{label}… {percent} %".
 * @param label defines the label of the running operation ("Eroding", "Generating", ...).
 * @param progress defines the progress (0..1).
 */
export function formatTerrainBusy(label: string, progress: number): string {
	return `${label}… ${formatTerrainPercent(Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0)))}`;
}

/**
 * Angle in degrees: 35 → "35°", 12.34 → "12.3°".
 * @param degrees defines the angle in degrees.
 */
export function formatTerrainDegrees(degrees: number): string {
	return `${formatTerrainNumber(degrees, 1)}°`;
}

/**
 * Count followed by a singular or plural noun: (1, "brush") → "1 brush", (3, "brush") → "3 brushes", (2, "layer") → "2 layers".
 * The default plural adds "es" after s, x, z, ch and sh, else "s".
 * @param count defines the count.
 * @param singular defines the singular noun.
 * @param plural defines the plural noun (computed when omitted).
 */
export function formatTerrainPlural(count: number, singular: string, plural?: string): string {
	if (count === 1) {
		return `1 ${singular}`;
	}

	return `${formatTerrainCount(count)} ${plural ?? (/(s|x|z|ch|sh)$/.test(singular) ? `${singular}es` : `${singular}s`)}`;
}

/**
 * Comma-separated list of file names (without folders), at most `max` names followed by "and {n} more": ["/a/b.png", "c.jpg"] → "b.png, c.jpg".
 * @param paths defines the paths (absolute or relative, "/" or "\" separators).
 * @param max defines the maximum number of names listed (default 5).
 */
export function formatTerrainFileNames(paths: readonly string[], max: number = 5): string {
	const names = paths.map((path) => getTerrainFileName(path));
	if (names.length <= max) {
		return names.join(", ");
	}

	return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}

/**
 * File name of a path ("/" or "\" separators): "/project/assets/rock.png" → "rock.png".
 * @param path defines the path.
 */
export function getTerrainFileName(path: string): string {
	const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
	const slash = normalized.lastIndexOf("/");
	return slash >= 0 ? normalized.substring(slash + 1) : normalized;
}

/**
 * File name without its extension: "/project/assets/Stone.material" → "Stone".
 * @param path defines the path.
 */
export function getTerrainFileBaseName(path: string): string {
	const name = getTerrainFileName(path);
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.substring(0, dot) : name;
}
