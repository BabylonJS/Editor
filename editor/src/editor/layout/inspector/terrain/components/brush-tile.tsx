import { forwardRef, HTMLAttributes, KeyboardEvent, MouseEvent, useEffect, useState } from "react";

import { LuFileWarning, LuImage, LuStar } from "react-icons/lu";

import { evaluateTerrainFalloff } from "../../../../../tools/terrain/core/falloff";
import { createTerrainBuiltinBrushMask, TERRAIN_BUILTIN_BRUSHES } from "../../../../../tools/terrain/core/builtin-brushes";
import { TerrainBrushLibrary, type ITerrainLibraryBrush } from "../../../../../tools/terrain/io/brush-library";

/** Size (px) of the thumbnails rendered for the built-in brushes. */
export const TERRAIN_BRUSH_THUMBNAIL_SIZE = 64;

/** Falloff and hardness used to draw the analytic built-ins (round, square): the defaults of the Brush section (§1.8). */
const TERRAIN_BRUSH_THUMBNAIL_FALLOFF = "smooth";
const TERRAIN_BRUSH_THUMBNAIL_HARDNESS = 0.3;

const terrainBuiltinBrushThumbnails = new Map<string, string | null>();

/**
 * Values 0..1 of the thumbnail of a built-in brush, size × size, image order (row 0 = top = brush +Z): the procedural mask of the brush
 * (createTerrainBuiltinBrushMask), or the analytic shape of round (radial) and square (Chebyshev) brushes with the default smooth falloff.
 * null for unknown ids.
 * @param id defines the id of the built-in brush ("builtin:<name>").
 * @param size defines the size of the thumbnail (texels per side).
 */
export function computeTerrainBuiltinBrushThumbnailValues(id: string, size: number = TERRAIN_BRUSH_THUMBNAIL_SIZE): Float32Array | null {
	const brush = TERRAIN_BUILTIN_BRUSHES.find((b) => b.id === id);
	const resolution = Math.max(2, Math.floor(size));

	if (!brush) {
		return null;
	}

	if (brush.kind === "image") {
		const mask = createTerrainBuiltinBrushMask(id, resolution);
		if (!mask || mask.width !== resolution || mask.height !== resolution) {
			return mask ? resampleTerrainThumbnailValues(mask.data, mask.width, mask.height, resolution) : null;
		}

		return mask.data;
	}

	const values = new Float32Array(resolution * resolution);
	const half = (resolution - 1) / 2;

	for (let y = 0; y < resolution; ++y) {
		for (let x = 0; x < resolution; ++x) {
			const u = (x - half) / half;
			const v = (y - half) / half;
			const d = brush.kind === "square" ? Math.max(Math.abs(u), Math.abs(v)) : Math.sqrt(u * u + v * v);

			values[y * resolution + x] = evaluateTerrainFalloff(TERRAIN_BRUSH_THUMBNAIL_FALLOFF, TERRAIN_BRUSH_THUMBNAIL_HARDNESS, d);
		}
	}

	return values;
}

/** Nearest-neighbour resampling of thumbnail values (masks of an unexpected size). */
function resampleTerrainThumbnailValues(data: Float32Array, width: number, height: number, size: number): Float32Array | null {
	if (width < 1 || height < 1 || data.length < width * height) {
		return null;
	}

	const values = new Float32Array(size * size);
	for (let y = 0; y < size; ++y) {
		const sy = Math.min(height - 1, Math.floor(((y + 0.5) / size) * height));
		for (let x = 0; x < size; ++x) {
			const sx = Math.min(width - 1, Math.floor(((x + 0.5) / size) * width));
			values[y * size + x] = data[sy * width + sx];
		}
	}

	return values;
}

/**
 * Canvas rendering of a built-in brush (white shape, alpha = mask value) as a PNG data URL, cached per id and size for the session.
 * null when the id is unknown or when no canvas is available (headless tests).
 * @param id defines the id of the built-in brush.
 * @param size defines the size of the thumbnail (px).
 */
export function renderTerrainBuiltinBrushThumbnail(id: string, size: number = TERRAIN_BRUSH_THUMBNAIL_SIZE): string | null {
	const key = `${id}|${size}`;
	if (terrainBuiltinBrushThumbnails.has(key)) {
		return terrainBuiltinBrushThumbnails.get(key) ?? null;
	}

	const values = computeTerrainBuiltinBrushThumbnailValues(id, size);
	if (!values || typeof document === "undefined") {
		return null;
	}

	const resolution = Math.round(Math.sqrt(values.length));

	let url: string | null = null;
	try {
		const canvas = document.createElement("canvas");
		canvas.width = resolution;
		canvas.height = resolution;

		const context = canvas.getContext("2d");
		if (context) {
			const image = context.createImageData(resolution, resolution);
			for (let i = 0; i < resolution * resolution; ++i) {
				const value = Math.min(1, Math.max(0, Number.isFinite(values[i]) ? values[i] : 0));

				image.data[i * 4 + 0] = 255;
				image.data[i * 4 + 1] = 255;
				image.data[i * 4 + 2] = 255;
				image.data[i * 4 + 3] = Math.round(value * 255);
			}

			context.putImageData(image, 0, 0);
			url = canvas.toDataURL("image/png");
		}
	} catch (e) {
		url = null;
	}

	terrainBuiltinBrushThumbnails.set(key, url);
	return url;
}

/**
 * Thumbnail URL of a brush (§1.9): `TerrainBrushLibrary.getThumbnailUrl(id)` (cached by the library by path + mtime), falling back to a canvas
 * rendering of the mask for built-ins. null when unavailable (missing or undecodable file, no library). Never rejects.
 * @param brush defines the brush of the library.
 */
export async function loadTerrainBrushThumbnail(brush: Pick<ITerrainLibraryBrush, "id" | "builtin">): Promise<string | null> {
	let url: string | null = null;

	try {
		url = await TerrainBrushLibrary.Get().getThumbnailUrl(brush.id);
	} catch (e) {
		url = null;
	}

	if (!url && brush.builtin) {
		url = renderTerrainBuiltinBrushThumbnail(brush.id);
	}

	return url;
}

/**
 * Text of the tile tooltip (§1.9: name + path).
 * @param brush defines the brush of the library.
 */
export function getTerrainBrushTileDescription(brush: Pick<ITerrainLibraryBrush, "name" | "path" | "builtin" | "missing">): string {
	if (brush.builtin || !brush.path) {
		return `${brush.name} (built-in)`;
	}

	return brush.missing ? `${brush.name}\n${brush.path} (file not found)` : `${brush.name}\n${brush.path}`;
}

export interface ITerrainBrushTileProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
	/** Brush of the library shown by the tile. */
	brush: ITerrainLibraryBrush;
	/** Whether the brush is the selected one (terrainSettings.brush.brushId). */
	selected: boolean;
	/** Bumped by the palette when the library changed: reloads the thumbnail (a file may have changed on disk). */
	revision?: number;
	/** Highlights the tile as the insertion point of a drag-to-reorder (the dragged brush goes before it). */
	dropTarget?: boolean;
	/** Dims the tile while it is being dragged. */
	dragging?: boolean;
	/** Click / Enter / Space: selects the brush. */
	onSelect?: () => void;
	/** Double-click: opens the Brush settings dialog. */
	onOpenSettings?: () => void;
}

/**
 * Tile of the brush palette (§1.9): 56 px square, thumbnail from the library (built-ins: canvas rendering of the mask), selected ring,
 * star overlay for favourites, greyed with a red LuFileWarning overlay when the file is missing. Extra props (drag and drop, context menu
 * and tooltip triggers) are forwarded to the root element.
 */
export const TerrainBrushTile = forwardRef<HTMLDivElement, ITerrainBrushTileProps>((props, ref) => {
	const { brush, selected, revision, dropTarget, dragging, onSelect, onOpenSettings, className, onClick, onDoubleClick, onKeyDown, ...rest } = props;

	const [thumbnail, setThumbnail] = useState<string | null>(null);

	useEffect(() => {
		let canceled = false;

		loadTerrainBrushThumbnail(brush)
			.then((url) => {
				if (!canceled) {
					setThumbnail(url);
				}
			})
			.catch(() => {
				if (!canceled) {
					setThumbnail(null);
				}
			});

		return () => {
			canceled = true;
		};
	}, [brush.id, brush.builtin, brush.path, brush.missing, brush.channel, brush.invert, revision]);

	function handleClick(ev: MouseEvent<HTMLDivElement>): void {
		try {
			onClick?.(ev);
			onSelect?.();
		} catch (e) {
			console.error(e);
		}
	}

	function handleDoubleClick(ev: MouseEvent<HTMLDivElement>): void {
		try {
			onDoubleClick?.(ev);
			onOpenSettings?.();
		} catch (e) {
			console.error(e);
		}
	}

	function handleKeyDown(ev: KeyboardEvent<HTMLDivElement>): void {
		try {
			onKeyDown?.(ev);
			if (!ev.defaultPrevented && (ev.key === "Enter" || ev.key === " ")) {
				ev.preventDefault();
				onSelect?.();
			}
		} catch (e) {
			console.error(e);
		}
	}

	return (
		<div
			{...rest}
			ref={ref}
			role="button"
			tabIndex={0}
			aria-pressed={selected}
			aria-label={brush.name}
			data-terrain-brush-id={brush.id}
			onClick={(ev) => handleClick(ev)}
			onDoubleClick={(ev) => handleDoubleClick(ev)}
			onKeyDown={(ev) => handleKeyDown(ev)}
			className={`
				relative w-14 h-14 p-1 rounded-lg cursor-pointer select-none
				${selected ? "bg-primary/20 ring-2 ring-primary/60" : "bg-secondary hover:bg-background"}
				${dropTarget ? "outline outline-2 outline-offset-2 outline-primary" : ""}
				${dragging ? "opacity-40" : ""}
				transition-all duration-300 ease-in-out
				${className ?? ""}
			`}
		>
			{thumbnail ? (
				<img src={thumbnail} alt="" draggable={false} className={`w-full h-full object-contain ${brush.missing ? "opacity-40 grayscale" : ""}`} />
			) : (
				<div className={`flex items-center justify-center w-full h-full text-muted-foreground ${brush.missing ? "opacity-40" : ""}`}>
					<LuImage className="w-5 h-5" />
				</div>
			)}

			{brush.favorite && <LuStar className="absolute top-0.5 left-0.5 w-3 h-3 text-yellow-400 fill-yellow-400 pointer-events-none" />}
			{brush.missing && <LuFileWarning className="absolute bottom-0.5 right-0.5 w-4 h-4 text-red-500 pointer-events-none" />}
		</div>
	);
});

TerrainBrushTile.displayName = "TerrainBrushTile";
