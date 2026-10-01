/**
 * Formats a number with at most the given number of decimals and without trailing zeros: 1.50 → "1.5", 100.04 → "100".
 */
export function formatTerrainNumber(value: number, maxDecimals: number = 1): string {
	return String(parseFloat(value.toFixed(maxDecimals)));
}

/**
 * Formats a count with thousands separators: 66049 → "66,049".
 */
export function formatTerrainCount(value: number): string {
	return Math.round(value).toLocaleString("en-US");
}

/**
 * Formats the size of a terrain (cm) in meters: "102.4 × 51.2 m". A terrain smaller than one meter is shown in centimeters.
 */
export function formatTerrainSize(width: number, height: number): string {
	if (Math.max(width, height) >= 100) {
		return `${formatTerrainNumber(width / 100)} × ${formatTerrainNumber(height / 100)} m`;
	}

	return `${formatTerrainNumber(width)} × ${formatTerrainNumber(height)} cm`;
}

/**
 * Formats the resolution of a terrain: 256 → "256²".
 */
export function formatTerrainResolution(subdivisions: number): string {
	return `${subdivisions}²`;
}

/**
 * Returns the text of a resolution for a terrain of the given size (cm): "256² · 40 cm cells · 66,049 vertices".
 */
export function formatTerrainResolutionOption(subdivisions: number, width: number, height: number): string {
	const cell = Math.max(width, height) / subdivisions;
	const vertices = (subdivisions + 1) * (subdivisions + 1);

	return `${formatTerrainResolution(subdivisions)} · ${formatTerrainNumber(cell)} cm cells · ${formatTerrainCount(vertices)} vertices`;
}

/**
 * Formats a size in megabytes, with less decimals for the big sizes: "0.67 MB", "85.3 MB", "512 MB".
 */
export function formatTerrainMegabytes(bytes: number): string {
	const megabytes = bytes / (1024 * 1024);
	return `${formatTerrainNumber(megabytes, megabytes >= 100 ? 0 : megabytes >= 1 ? 1 : 2)} MB`;
}

/**
 * Returns the text of a size of the textures of the layers with the memory they take on the GPU: "1024 (42.7 MB for 4 layers)".
 * The layers are stored in two arrays of textures (albedo and normal) with their mipmaps.
 */
export function formatTerrainLayerTextureOption(size: number, layerCount: number): string {
	const bytes = (layerCount * size * size * 4 * 2 * 4) / 3;
	return `${size} (${formatTerrainMegabytes(bytes)} for ${formatTerrainPlural(layerCount, "layer")})`;
}

/**
 * Returns the text of a size of the weight maps with the memory they take: "1024² (4 MB)".
 */
export function formatTerrainWeightMapOption(size: number, mapCount: number = 1): string {
	return `${size}² (${formatTerrainMegabytes(size * size * 4 * mapCount)})`;
}

/**
 * Formats a count followed by its noun: "1 brush", "3 brushes", "2 layers".
 * @param plural defines the plural of the noun when it is not the noun followed by "s" or "es".
 */
export function formatTerrainPlural(count: number, singular: string, plural?: string): string {
	if (count === 1) {
		return `1 ${singular}`;
	}

	return `${formatTerrainCount(count)} ${plural ?? (/(s|x|z|ch|sh)$/.test(singular) ? `${singular}es` : `${singular}s`)}`;
}
