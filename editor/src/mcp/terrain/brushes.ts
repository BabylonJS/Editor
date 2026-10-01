import { Scene } from "babylonjs";

import { TerrainBrushLibrary, type ITerrainLibraryBrush } from "../../tools/terrain/io/brush-library";

import { IMCPActionOptions } from "../action";

import {
	getTerrainMcpProjectDirectory,
	readTerrainMcpBoolean,
	readTerrainMcpEnum,
	readTerrainMcpNumber,
	readTerrainMcpObject,
	readTerrainMcpString,
	requireTerrainMcpProjectDirectory,
	resolveTerrainMcpPath,
	throwTerrainMcpInvalidArgument,
} from "./shared";

/**
 * Channels of a brush image used as its mask.
 */
export const TERRAIN_MCP_BRUSH_CHANNELS: readonly ITerrainLibraryBrush["channel"][] = ["luminance", "alpha", "red"];

/**
 * Brush of list_terrain_brushes.
 */
export interface ITerrainMcpBrushSummary {
	id: string;
	name: string;
	builtin: boolean;
	/** Project-relative path of the image, null for built-ins. */
	path: string | null;
	channel: ITerrainLibraryBrush["channel"];
	invert: boolean;
	favorite: boolean;
	missing: boolean;
}

/**
 * list_terrain_brushes: the built-in brushes and the brush library of the project (`terrain-brushes/library.json`), in display order.
 */
export async function listTerrainBrushes(_scene: Scene, _data: any, _options: IMCPActionOptions): Promise<{ brushes: ITerrainMcpBrushSummary[] }> {
	const library = TerrainBrushLibrary.Get();
	await library.load(getTerrainMcpProjectDirectory());

	return {
		brushes: library.brushes.map((brush) => ({
			id: brush.id,
			name: brush.name,
			builtin: brush.builtin,
			path: brush.path,
			channel: brush.channel,
			invert: brush.invert,
			favorite: brush.favorite,
			missing: brush.missing,
		})),
	};
}

/**
 * add_terrain_brush: adds an image to the brush library of the project (files outside the project are copied into `terrain-brushes/`;
 * an identical brush already in the library is returned with `duplicate: true`). The given name, channel, invert and defaults are applied
 * to the returned brush. The library is not part of the undo history.
 */
export async function addTerrainBrush(_scene: Scene, data: any, _options: IMCPActionOptions): Promise<any> {
	const path = readTerrainMcpString(data, "path") ?? throwTerrainMcpInvalidArgument("path", "the project-relative or absolute path of an image");
	const name = readTerrainMcpString(data, "name");
	const channel = readTerrainMcpEnum(data, "channel", TERRAIN_MCP_BRUSH_CHANNELS);
	const invert = readTerrainMcpBoolean(data, "invert");

	const defaultsValue = readTerrainMcpObject(data, "defaults");
	const defaults = defaultsValue
		? {
				radius: readTerrainMcpNumber(defaultsValue, "radius", { above: 0 }, "defaults.radius"),
				strength: readTerrainMcpNumber(defaultsValue, "strength", { min: 0, max: 1 }, "defaults.strength"),
				stampHeight: readTerrainMcpNumber(defaultsValue, "stampHeight", {}, "defaults.stampHeight"),
			}
		: undefined;

	const projectDirectory = requireTerrainMcpProjectDirectory();

	const library = TerrainBrushLibrary.Get();
	await library.load(projectDirectory);

	const result = await library.addFiles([resolveTerrainMcpPath(path)]);
	if (result.rejected.length) {
		throw new Error(`Can't add "${path}" as a terrain brush: ${result.rejected[0].reason}`);
	}

	const duplicate = !result.added.length && result.duplicates.length > 0;
	const brush = result.added[0] ?? result.duplicates[0];
	if (!brush) {
		throw new Error(`Can't add "${path}" as a terrain brush.`);
	}

	const patch: Parameters<TerrainBrushLibrary["update"]>[1] = {};
	if (name !== undefined) {
		patch.name = name;
	}

	if (channel !== undefined) {
		patch.channel = channel;
	}

	if (invert !== undefined) {
		patch.invert = invert;
	}

	if (defaults) {
		const merged = { ...(brush.defaults ?? {}) };
		for (const key of ["radius", "strength", "stampHeight"] as const) {
			const value = defaults[key];
			if (value !== undefined) {
				merged[key] = value;
			}
		}

		patch.defaults = merged;
	}

	if (Object.keys(patch).length) {
		await library.update(brush.id, patch);
	}

	const updated = library.getBrush(brush.id) ?? brush;

	return {
		brush: {
			id: updated.id,
			name: updated.name,
			path: updated.path,
			channel: updated.channel,
			invert: updated.invert,
		},
		duplicate,
	};
}
