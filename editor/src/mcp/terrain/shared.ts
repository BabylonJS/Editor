import { basename, dirname, extname, isAbsolute, join, normalize } from "path/posix";

import { Mesh, Node, Scene, Vector3 } from "babylonjs";
import type { ITerrainBudgetInfo, ITerrainLayerData, TerrainLoadState } from "babylonjs-editor-tools";

import type { Editor } from "../../editor/main";

import { projectConfiguration } from "../../project/configuration";
import { isSavingProject } from "../../project/save/save";

import { buildTerrainStrokeRequest, createDefaultTerrainToolSettings } from "../../tools/terrain/core/settings";
import type { ITerrainBrushShape, ITerrainStrokeRequest, ITerrainToolSettings, TerrainFalloff, TerrainTool } from "../../tools/terrain/core/types";
import { getTerrainEligibility } from "../../tools/terrain/engine/eligibility";
import { getTerrainMeshInfo, getTerrainPlugin } from "../../tools/terrain/engine/info";
import { ensureTerrainUniqueMaterial } from "../../tools/terrain/engine/material";
import { waitForTerrainReadyAsync } from "../../tools/terrain/engine/operations";
import { getActiveTerrainStroke, isTerrainScenePlaying, onActiveTerrainStrokeChangedObservable } from "../../tools/terrain/engine/state";
import { makeTerrainGeometryUnique } from "../../tools/terrain/engine/structure";
import { TerrainRefusedError, type ITerrainLayerInfo, type ITerrainStrokeResult, type TerrainWarning } from "../../tools/terrain/engine/types";
import { createTerrainBusyScope, isTerrainBusy, whenTerrainIdleAsync } from "../../tools/terrain/engine/yield";
import { getTerrainBrush, loadTerrainBrushShape, TERRAIN_BRUSHES, type ITerrainBrush } from "../../tools/terrain/io/brushes";

import { IMCPActionOptions } from "../action";
import { resolveNode } from "../tools/resolve";

/**
 * Message of every mutating terrain tool while the game plays in the preview (§8.1 rule 3).
 */
export const TERRAIN_MCP_PLAYING_MESSAGE = "Stop the game (stop_scene) before editing terrains.";

/**
 * Message of a mutating terrain tool refused because the project is being saved (the engine's refused.saving of §1.17 is "Saving…"):
 * mutations wait for a running save first, up to TERRAIN_MCP_SAVE_TIMEOUT_MS.
 */
export const TERRAIN_MCP_SAVING_MESSAGE = "The project is being saved: call the tool again once the save is finished.";

/**
 * Time, in milliseconds, a terrain mutation waits for a running save of the project before it is refused (TERRAIN_MCP_SAVING_MESSAGE).
 */
export const TERRAIN_MCP_SAVE_TIMEOUT_MS = 60000;

/**
 * Interval, in milliseconds, at which a terrain mutation checks whether the running save of the project is finished.
 */
export const TERRAIN_MCP_SAVE_POLL_INTERVAL_MS = 50;

/**
 * Warning added to the result of a mutation when the terrain textures didn't finish loading in time (§8.1 rule 4).
 */
export const TERRAIN_MCP_TEXTURES_LOADING_WARNING = "The terrain textures are still loading.";

/**
 * Message of export_terrain_heightmap for a destination outside the project folder (§8.1 rule 6).
 */
export const TERRAIN_MCP_OUTSIDE_PROJECT_MESSAGE = "The destination must be inside the project folder.";

/**
 * Message of the tools that need an opened project (paths).
 */
export const TERRAIN_MCP_NO_PROJECT_MESSAGE = "No project is open.";

/**
 * Message when too many layers are requested (same text as the Terrain tab).
 */
export const TERRAIN_MCP_MAX_LAYERS_MESSAGE = "8 layers maximum (2 weight maps).";

/**
 * Time, in milliseconds, mutations touching layers, weights or the material wait for the terrain to render its final state (§8.1 rule 4).
 */
export const TERRAIN_MCP_READY_TIMEOUT_MS = 10000;

/**
 * Time, in milliseconds, paint strokes and reads of the layer weights wait for weight maps that are still loading (§8.1 rule 2).
 */
export const TERRAIN_MCP_WEIGHTS_TIMEOUT_MS = 30000;

/**
 * Maximum number of world points of a stroke or of sample_terrain (§7.5).
 */
export const TERRAIN_MCP_MAX_POINTS = 10000;

/**
 * Maximum brush radius accepted by the tools, in world centimeters (§7.5).
 */
export const TERRAIN_MCP_MAX_RADIUS = 100000;

/**
 * Maximum number of texture layers of a terrain.
 */
export const TERRAIN_MCP_MAX_LAYERS = 8;

/**
 * Resolutions offered by create_terrain and modify_terrain (resample / resize).
 */
export const TERRAIN_MCP_SUBDIVISIONS: readonly number[] = [64, 128, 256, 512, 1024];

/**
 * Sizes of the weight maps and of the layer textures accepted by the tools.
 */
export const TERRAIN_MCP_TEXTURE_SIZES: readonly number[] = [256, 512, 1024, 2048];

/**
 * Id of the brush used when a stroke doesn't give one.
 */
export const TERRAIN_MCP_DEFAULT_BRUSH_ID = "builtin:round";

/**
 * Returns the message of a terrain that can't be edited (§8.1 rule 1).
 * @param name defines the name of the node.
 * @param message defines the ineligibility message of the engine (§1.3).
 */
export function getTerrainMcpIneligibleMessage(name: string, message: string): string {
	return `Node "${name}" can't be edited as a terrain: ${message}`;
}

/**
 * Returns the message of a node that is not a terrain (§8.1 rule 1): only the TerrainMesh nodes created by create_terrain (or Add → Terrain
 * Mesh in the editor) can be sculpted and painted.
 * @param name defines the name of the node.
 */
export function getTerrainMcpNotTerrainMessage(name: string): string {
	return `Node "${name}" is not a terrain: create one with create_terrain (grounds and other meshes can't be sculpted or painted).`;
}

/**
 * Returns the message of a layer reference that doesn't match any layer of the terrain (§8.1 rule 1).
 * @param reference defines the layer index, id or name given to the tool.
 * @param name defines the name of the terrain.
 * @param layers defines the layers of the terrain.
 */
export function getTerrainMcpLayerNotFoundMessage(reference: unknown, name: string, layers: readonly Pick<ITerrainLayerData, "name">[]): string {
	const names = layers.length ? layers.map((layer) => layer.name).join(", ") : "none";
	return `Layer "${String(reference)}" not found on terrain "${name}". Layers: ${names}.`;
}

/**
 * Returns the message of a paint tool used on a terrain that has no texture layer yet (§8.1 rule 1).
 * @param name defines the name of the terrain.
 */
export function getTerrainMcpNoLayersMessage(name: string): string {
	return `Terrain "${name}" has no texture layers: add one with set_terrain_layer first.`;
}

// Arguments

/**
 * Options of the numeric argument readers.
 */
export interface ITerrainMcpNumberOptions {
	/** Inclusive minimum. */
	min?: number;
	/** Inclusive maximum. */
	max?: number;
	/** Exclusive minimum (e.g. 0 for a positive number). */
	above?: number;
	/** The value must be an integer. */
	integer?: boolean;
}

function getTerrainMcpNumberExpectation(options: ITerrainMcpNumberOptions): string {
	const kind = options.integer ? "an integer" : "a number";
	const bounds: string[] = [];

	if (options.above !== undefined) {
		bounds.push(`greater than ${options.above}`);
	}

	if (options.min !== undefined) {
		bounds.push(`at least ${options.min}`);
	}

	if (options.max !== undefined) {
		bounds.push(`at most ${options.max}`);
	}

	return bounds.length ? `${kind} ${bounds.join(" and ")}` : kind;
}

/**
 * Throws the error of an invalid argument.
 * @param label defines the name of the argument (dotted path for nested fields).
 * @param expectation defines what was expected.
 */
export function throwTerrainMcpInvalidArgument(label: string, expectation: string): never {
	throw new Error(`Invalid "${label}": expected ${expectation}.`);
}

/**
 * Returns whether or not the given value is a plain object (not null, not an array).
 * @param value defines the value to test.
 */
export function isTerrainMcpObject(value: unknown): value is Record<string, any> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates a number. Tools receive arguments validated by the MCP server, but execute_batch forwards the arguments of its actions as they
 * are, so every handler validates what it reads.
 * @param value defines the value to validate (undefined and null mean "not given").
 * @param label defines the name of the argument used in the error message.
 * @param options defines the range of the value.
 */
export function validateTerrainMcpNumber(value: unknown, label: string, options: ITerrainMcpNumberOptions = {}): number | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}

	const valid =
		typeof value === "number" &&
		Number.isFinite(value) &&
		(!options.integer || Number.isInteger(value)) &&
		(options.above === undefined || value > options.above) &&
		(options.min === undefined || value >= options.min) &&
		(options.max === undefined || value <= options.max);

	if (!valid) {
		throwTerrainMcpInvalidArgument(label, getTerrainMcpNumberExpectation(options));
	}

	return value as number;
}

/**
 * Reads an optional number argument (see validateTerrainMcpNumber).
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 * @param options defines the range of the value.
 * @param label defines the name used in the error message (default: key).
 */
export function readTerrainMcpNumber(data: unknown, key: string, options: ITerrainMcpNumberOptions = {}, label: string = key): number | undefined {
	return validateTerrainMcpNumber(isTerrainMcpObject(data) ? data[key] : undefined, label, options);
}

/**
 * Reads a required number argument.
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 * @param options defines the range of the value.
 * @param label defines the name used in the error message (default: key).
 */
export function readRequiredTerrainMcpNumber(data: unknown, key: string, options: ITerrainMcpNumberOptions = {}, label: string = key): number {
	const value = readTerrainMcpNumber(data, key, options, label);
	if (value === undefined) {
		throwTerrainMcpInvalidArgument(label, getTerrainMcpNumberExpectation(options));
	}

	return value;
}

/**
 * Reads an optional boolean argument.
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 * @param label defines the name used in the error message (default: key).
 */
export function readTerrainMcpBoolean(data: unknown, key: string, label: string = key): boolean | undefined {
	const value = isTerrainMcpObject(data) ? data[key] : undefined;
	if (value === undefined || value === null) {
		return undefined;
	}

	if (typeof value !== "boolean") {
		throwTerrainMcpInvalidArgument(label, "true or false");
	}

	return value;
}

/**
 * Reads an optional non-empty string argument (surrounding spaces removed).
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 * @param label defines the name used in the error message (default: key).
 */
export function readTerrainMcpString(data: unknown, key: string, label: string = key): string | undefined {
	const value = isTerrainMcpObject(data) ? data[key] : undefined;
	if (value === undefined || value === null) {
		return undefined;
	}

	if (typeof value !== "string" || !value.trim()) {
		throwTerrainMcpInvalidArgument(label, "a non-empty string");
	}

	return value.trim();
}

/**
 * Reads an optional enumeration argument.
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 * @param values defines the accepted values.
 * @param label defines the name used in the error message (default: key).
 */
export function readTerrainMcpEnum<T extends string>(data: unknown, key: string, values: readonly T[], label: string = key): T | undefined {
	const value = isTerrainMcpObject(data) ? data[key] : undefined;
	if (value === undefined || value === null) {
		return undefined;
	}

	if (typeof value !== "string" || !values.includes(value as T)) {
		throwTerrainMcpInvalidArgument(label, `one of ${values.map((v) => `"${v}"`).join(", ")}`);
	}

	return value as T;
}

/**
 * Reads an optional object argument.
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 * @param label defines the name used in the error message (default: key).
 */
export function readTerrainMcpObject(data: unknown, key: string, label: string = key): Record<string, any> | undefined {
	const value = isTerrainMcpObject(data) ? data[key] : undefined;
	if (value === undefined || value === null) {
		return undefined;
	}

	if (!isTerrainMcpObject(value)) {
		throwTerrainMcpInvalidArgument(label, "an object");
	}

	return value;
}

/**
 * Validates an array of `length` finite numbers.
 * @param value defines the value to validate (undefined and null mean "not given").
 * @param length defines the expected length.
 * @param label defines the name used in the error message.
 */
export function validateTerrainMcpTuple(value: unknown, length: number, label: string): number[] | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}

	if (!Array.isArray(value) || value.length !== length || value.some((v) => typeof v !== "number" || !Number.isFinite(v))) {
		throwTerrainMcpInvalidArgument(label, `an array of ${length} numbers`);
	}

	return (value as number[]).slice();
}

/**
 * Reads an optional `[x, z]` world point argument.
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 * @param label defines the name used in the error message (default: key).
 */
export function readTerrainMcpPoint(data: unknown, key: string, label: string = key): [number, number] | undefined {
	const value = validateTerrainMcpTuple(isTerrainMcpObject(data) ? data[key] : undefined, 2, label);
	return value ? [value[0], value[1]] : undefined;
}

/**
 * Reads an optional `[x, y, z]` argument.
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 * @param label defines the name used in the error message (default: key).
 */
export function readTerrainMcpVector3(data: unknown, key: string, label: string = key): [number, number, number] | undefined {
	const value = validateTerrainMcpTuple(isTerrainMcpObject(data) ? data[key] : undefined, 3, label);
	return value ? [value[0], value[1], value[2]] : undefined;
}

/**
 * Reads the required list of world `[x, z]` points (centimeters) of a stroke or of sample_terrain: 1 to TERRAIN_MCP_MAX_POINTS points.
 * @param data defines the arguments object.
 * @param key defines the name of the argument (default "points").
 */
export function readTerrainMcpPoints(data: unknown, key: string = "points"): [number, number][] {
	const value = isTerrainMcpObject(data) ? data[key] : undefined;
	if (!Array.isArray(value) || value.length < 1 || value.length > TERRAIN_MCP_MAX_POINTS) {
		throwTerrainMcpInvalidArgument(key, `an array of 1 to ${TERRAIN_MCP_MAX_POINTS} world [x, z] points (centimeters)`);
	}

	return value.map((point, index) => {
		const tuple = validateTerrainMcpTuple(point, 2, `${key}[${index}]`);
		if (!tuple) {
			throwTerrainMcpInvalidArgument(`${key}[${index}]`, "an array of 2 numbers");
		}

		return [tuple[0], tuple[1]];
	});
}

/**
 * Reads an optional resolution argument (64, 128, 256, 512 or 1024 subdivisions).
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 */
export function readTerrainMcpSubdivisions(data: unknown, key: string = "subdivisions"): number | undefined {
	const value = readTerrainMcpNumber(data, key, { integer: true });
	if (value !== undefined && !TERRAIN_MCP_SUBDIVISIONS.includes(value)) {
		throwTerrainMcpInvalidArgument(key, `one of ${TERRAIN_MCP_SUBDIVISIONS.join(", ")}`);
	}

	return value;
}

/**
 * Reads an optional texture size argument (256, 512, 1024 or 2048).
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 */
export function readTerrainMcpTextureSize(data: unknown, key: string): number | undefined {
	const value = readTerrainMcpNumber(data, key, { integer: true });
	if (value !== undefined && !TERRAIN_MCP_TEXTURE_SIZES.includes(value)) {
		throwTerrainMcpInvalidArgument(key, `one of ${TERRAIN_MCP_TEXTURE_SIZES.join(", ")}`);
	}

	return value;
}

/**
 * Reads an optional layer reference: an index (0 = first layer), an id or a name.
 * @param data defines the arguments object.
 * @param key defines the name of the argument.
 * @param label defines the name used in the error message (default: key).
 */
export function readTerrainMcpLayerReference(data: unknown, key: string, label: string = key): number | string | undefined {
	const value = isTerrainMcpObject(data) ? data[key] : undefined;
	if (value === undefined || value === null) {
		return undefined;
	}

	if (typeof value === "number") {
		return validateTerrainMcpNumber(value, label, { integer: true, min: 0, max: TERRAIN_MCP_MAX_LAYERS - 1 });
	}

	if (typeof value !== "string" || !value.trim()) {
		throwTerrainMcpInvalidArgument(label, "a layer index (0 = first layer), id or name");
	}

	return value.trim();
}

/**
 * Returns a random 31-bit integer seed.
 */
export function createTerrainMcpSeed(): number {
	return Math.floor(Math.random() * 0x7fffffff);
}

/**
 * Rounds a value for the compact JSON results (-0 becomes 0).
 * @param value defines the value to round.
 * @param decimals defines the number of decimals kept (default 2).
 */
export function roundTerrainMcpValue(value: number, decimals: number = 2): number {
	const factor = Math.pow(10, decimals);
	const rounded = Math.round(value * factor) / factor;
	return rounded === 0 ? 0 : rounded;
}

/**
 * Rounds a height range for the compact JSON results.
 * @param range defines the [min, max] range in world centimeters.
 */
export function roundTerrainMcpRange(range: readonly [number, number] | readonly number[]): [number, number] {
	return [roundTerrainMcpValue(range[0]), roundTerrainMcpValue(range[1])];
}

// Target resolution

/**
 * Terrain a tool works on.
 */
export interface ITerrainMcpTarget {
	readonly editor: Editor;
	readonly scene: Scene;
	readonly mesh: Mesh;
}

/**
 * Returns whether or not the given arguments address a node (nodeId or nodeName).
 * @param data defines the arguments object.
 */
export function hasTerrainMcpNodeReference(data: unknown): boolean {
	return readTerrainMcpString(data, "nodeId") !== undefined || readTerrainMcpString(data, "nodeName") !== undefined;
}

/**
 * Resolves the terrain addressed by `nodeId` / `nodeName` (§8.1 rule 1): resolveNode, then the eligibility of the engine (only TerrainMesh
 * nodes are eligible). Throws `Node "{name}" is not a terrain: ...` for other nodes (grounds included) and `Node "{name}" can't be edited as
 * a terrain: {message}` for terrains that can't be edited (locked, from a scene link...).
 * @param scene defines the scene of the editor.
 * @param data defines the arguments of the tool.
 * @param options defines the options of the MCP action.
 */
export function resolveTerrainMcpTarget(scene: Scene, data: unknown, options: IMCPActionOptions): ITerrainMcpTarget {
	const nodeId = readTerrainMcpString(data, "nodeId");
	const nodeName = readTerrainMcpString(data, "nodeName");
	if (!nodeId && !nodeName) {
		throw new Error("Pass the nodeId (preferred) or the nodeName of the terrain.");
	}

	const node = resolveNode({ scene, nodeId, nodeName });

	const eligibility = getTerrainEligibility(node);
	if (!eligibility.eligible) {
		const notTerrain = eligibility.reason === "not-a-terrain" || eligibility.reason === "not-a-mesh";
		throw new Error(notTerrain ? getTerrainMcpNotTerrainMessage(node.name) : getTerrainMcpIneligibleMessage(node.name, eligibility.message));
	}

	return {
		editor: options.editor,
		scene,
		mesh: eligibility.mesh,
	};
}

// Mutations

/**
 * What a mutation needs to know to be queued and refused (§8.1 rule 3).
 */
export interface ITerrainMcpMutationContext {
	readonly editor: Editor;
	/** The terrain being edited, null when a new terrain is created. */
	readonly mesh: Mesh | null;
}

/**
 * Throws when a terrain mutation must be refused now: the game plays (§8.1 rule 3).
 * @param context defines the editor.
 */
export function assertTerrainMcpMutationAllowed(context: ITerrainMcpMutationContext): void {
	if (isTerrainScenePlaying(context.editor)) {
		throw new Error(TERRAIN_MCP_PLAYING_MESSAGE);
	}
}

function waitForTerrainMcpStrokeEndAsync(): Promise<void> {
	return new Promise<void>((resolve) => {
		let timeout: ReturnType<typeof setTimeout> | null = null;

		const observer = onActiveTerrainStrokeChangedObservable.add((handle) => {
			if (!handle) {
				done();
			}
		});

		function done(): void {
			onActiveTerrainStrokeChangedObservable.remove(observer);
			if (timeout !== null) {
				clearTimeout(timeout);
			}

			resolve();
		}

		// Checked again regularly: a missed notification never blocks the tool.
		timeout = setTimeout(done, 250);
	});
}

/**
 * Waits until no UI stroke is active and no terrain operation runs (§8.1 rule 3: MCP mutations queue behind them). Nothing here depends on
 * the render loop, so it completes while the editor window is minimized.
 */
export async function waitForTerrainMcpIdleAsync(): Promise<void> {
	for (;;) {
		if (getActiveTerrainStroke()) {
			await waitForTerrainMcpStrokeEndAsync();
		} else if (isTerrainBusy()) {
			await whenTerrainIdleAsync();
		} else {
			return;
		}
	}
}

/**
 * Waits until the project is no longer being saved (checked every TERRAIN_MCP_SAVE_POLL_INTERVAL_MS, no render loop needed). Throws
 * TERRAIN_MCP_SAVING_MESSAGE when the save still runs after `timeoutMs`.
 * @param timeoutMs defines the maximum time to wait, in milliseconds (default TERRAIN_MCP_SAVE_TIMEOUT_MS).
 */
export async function waitForTerrainMcpSaveEndAsync(timeoutMs: number = TERRAIN_MCP_SAVE_TIMEOUT_MS): Promise<void> {
	const start = Date.now();

	while (isSavingProject()) {
		if (Date.now() - start >= timeoutMs) {
			throw new Error(TERRAIN_MCP_SAVING_MESSAGE);
		}

		await new Promise<void>((resolve) => setTimeout(resolve, TERRAIN_MCP_SAVE_POLL_INTERVAL_MS));
	}
}

/**
 * Waits until a terrain mutation can start: no UI stroke, no busy scope (waitForTerrainMcpIdleAsync) and no save of the project (a save
 * refuses terrain edits, "Saving…"). Resolves in a microtask after the last check, so no stroke, save or other event can start before the
 * caller continues synchronously.
 * @param saveTimeoutMs defines the maximum time to wait for one save, in milliseconds (default TERRAIN_MCP_SAVE_TIMEOUT_MS).
 */
export async function waitForTerrainMcpTurnAsync(saveTimeoutMs: number = TERRAIN_MCP_SAVE_TIMEOUT_MS): Promise<void> {
	for (;;) {
		await waitForTerrainMcpIdleAsync();

		if (!isSavingProject()) {
			return;
		}

		await waitForTerrainMcpSaveEndAsync(saveTimeoutMs);
	}
}

/**
 * Converts an error thrown by the engine into the error of the tool: the §1.17 message of a refusal (TerrainRefusedError) is kept, except
 * "playing" and "saving" which get the MCP messages of §8.1.
 * @param error defines the error thrown by the mutation.
 */
export function getTerrainMcpError(error: unknown): Error {
	if (error instanceof TerrainRefusedError) {
		if (error.refusal === "playing") {
			return new Error(TERRAIN_MCP_PLAYING_MESSAGE);
		}

		if (error.refusal === "saving") {
			return new Error(TERRAIN_MCP_SAVING_MESSAGE);
		}

		return error;
	}

	return error instanceof Error ? error : new Error(String(error));
}

/**
 * Refreshes the inspector after a mutation (§8.1 rule 5). The Terrain tab refreshes itself from onTerrainChangedObservable.
 * @param editor defines the reference to the editor.
 */
export function refreshTerrainMcpInspector(editor: Editor): void {
	try {
		editor.layout?.inspector?.forceUpdate();
	} catch (e) {
		reportTerrainMcpWarning(editor, `Failed to refresh the inspector: ${getTerrainMcpErrorMessage(e)}`);
	}
}

/**
 * Refreshes the assets browser (files copied into the project).
 * @param editor defines the reference to the editor.
 */
export function refreshTerrainMcpAssets(editor: Editor): void {
	try {
		editor.layout?.assets?.refresh();
	} catch (e) {
		reportTerrainMcpWarning(editor, `Failed to refresh the assets browser: ${getTerrainMcpErrorMessage(e)}`);
	}
}

/**
 * Returns the message of an error.
 * @param error defines the error.
 */
export function getTerrainMcpErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function reportTerrainMcpWarning(editor: Editor, message: string): void {
	try {
		editor.layout?.console?.warn(message);
	} catch {
		console.warn(message);
	}
}

/**
 * Label of the external busy scope held while an MCP terrain mutation runs (shown by the busy banner of the Terrain tab).
 */
export const TERRAIN_MCP_BUSY_LABEL = "Agent editing";

let terrainMcpMutationQueue: Promise<void> = Promise.resolve();

/**
 * Runs a terrain mutation of an MCP tool (§8.1 rule 3): refused while the game plays; otherwise queued
 * behind the previous MCP terrain mutations (parallel tool calls never refuse each other as "busy"), behind an active UI stroke, behind
 * the running terrain operations and behind a save of the project, then run with the external busy scope TERRAIN_MCP_BUSY_LABEL held
 * (§7.3: the terrain undo entries refuse to apply, the Terrain tab shows it and refuses its strokes; the engine calls of the mutation
 * ignore the scope). Refusals of the engine are converted by
 * getTerrainMcpError and the inspector is refreshed once the mutation finished, successfully or not. See runTerrainMcpPreparedMutationAsync
 * for what the mutation may wait for.
 * @param context defines the editor and the terrain being edited.
 * @param mutation defines the mutation to run.
 */
export function runTerrainMcpMutationAsync<T>(context: ITerrainMcpMutationContext, mutation: () => Promise<T>): Promise<T> {
	return runTerrainMcpPreparedMutationAsync(
		context,
		async () => undefined,
		() => mutation()
	);
}

/**
 * runTerrainMcpMutationAsync with a preparation: `prepare` runs in the queue (after the previous MCP terrain mutations), BEFORE the waits and
 * checks of the mutation, without the busy scope. It does the slow work that changes nothing in the scene (reading and decoding files,
 * loading brushes, copying files into the project, waiting for weights that are still loading) so the mutation itself never waits for
 * anything but the engine: from its start to its first engine call, and between its engine calls, only microtasks run, so no save,
 * UI stroke or other event can start in between (a save would refuse the engine calls with "Saving…" after the automatic "make unique"
 * entries were registered; a UI stroke would make them fail as "busy"). Waiting for the readiness of the result after the last engine
 * call is fine.
 * @param context defines the editor and the terrain being edited.
 * @param prepare defines the preparation, whose result is given to the mutation.
 * @param mutation defines the mutation to run.
 */
export async function runTerrainMcpPreparedMutationAsync<P, T>(context: ITerrainMcpMutationContext, prepare: () => Promise<P>, mutation: (prepared: P) => Promise<T>): Promise<T> {
	assertTerrainMcpMutationAllowed(context);

	const previous = terrainMcpMutationQueue;

	let release: () => void = () => {};
	terrainMcpMutationQueue = new Promise<void>((resolve) => {
		release = resolve;
	});

	try {
		await previous;

		let prepared: P;
		try {
			prepared = await prepare();
		} catch (e) {
			throw getTerrainMcpError(e);
		}

		// From here to the first engine call of the mutation: microtasks only (see above).
		await waitForTerrainMcpTurnAsync();

		assertTerrainMcpMutationAllowed(context);

		if (context.mesh?.isDisposed()) {
			throw new Error(`Terrain "${context.mesh.name}" doesn't exist anymore.`);
		}

		// Busy for the Terrain tab and UI strokes, ignored by the engine calls of the mutation (external scope, §7.3). Opened only once the
		// waits are over.
		const scope = createTerrainBusyScope(TERRAIN_MCP_BUSY_LABEL, context.mesh, { external: true });

		try {
			return await mutation(prepared);
		} catch (e) {
			throw getTerrainMcpError(e);
		} finally {
			scope.dispose();
			refreshTerrainMcpInspector(context.editor);
		}
	} finally {
		release();
	}
}

/**
 * What makeTerrainMcpUnique makes unique besides a shared geometry.
 */
export interface ITerrainMcpUniqueOptions {
	/**
	 * Shared terrain material (weight edits: the weights are stored in the material).
	 */
	material: boolean;
}

/**
 * Makes the geometry and, for weight edits, the terrain material of the target unique when they are shared with other meshes (each an undo
 * entry of its own), so an agent never gets the "click Make unique" refusals of the Terrain tab. Returns the §1.17 texts of what was made
 * unique.
 * @param target defines the terrain.
 * @param options defines what must be made unique besides a shared geometry.
 */
export function makeTerrainMcpUnique(target: ITerrainMcpTarget, options: ITerrainMcpUniqueOptions): string[] {
	const warnings: string[] = [];
	const { editor, mesh } = target;

	let eligibility = getTerrainEligibility(mesh);
	if (!eligibility.eligible) {
		return warnings;
	}

	if (eligibility.warnings.includes("shared-geometry")) {
		makeTerrainGeometryUnique(editor, mesh);
		warnings.push(`The terrain geometry is now unique to “${mesh.name}”.`);
	}

	if (options.material) {
		eligibility = getTerrainEligibility(mesh);
		if (eligibility.eligible && eligibility.warnings.includes("shared-material") && getTerrainPlugin(mesh)) {
			ensureTerrainUniqueMaterial(editor, mesh);
			warnings.push(`The terrain material is now unique to “${mesh.name}”.`);
		}
	}

	return warnings;
}

/**
 * Waits until the terrain renders its final state (weights and layer arrays loaded, material ready for the mesh, §8.1 rule 4), so a
 * get_screenshot right after the tool shows the result. Adds TERRAIN_MCP_TEXTURES_LOADING_WARNING to `warnings` on timeout.
 * @param target defines the terrain.
 * @param warnings defines the warnings of the result.
 */
export async function waitForTerrainMcpReadyAsync(target: ITerrainMcpTarget, warnings: string[]): Promise<void> {
	let ready = false;
	try {
		ready = await waitForTerrainReadyAsync(target.mesh, TERRAIN_MCP_READY_TIMEOUT_MS);
	} catch (e) {
		ready = false;
	}

	if (!ready && !warnings.includes(TERRAIN_MCP_TEXTURES_LOADING_WARNING)) {
		warnings.push(TERRAIN_MCP_TEXTURES_LOADING_WARNING);
	}
}

/**
 * Resolves when the promise settles or after `timeoutMs`, whichever comes first (never rejects).
 * @param promise defines the promise to wait for.
 * @param timeoutMs defines the maximum time to wait, in milliseconds.
 */
export function waitForTerrainMcpPromiseAsync(promise: Promise<unknown>, timeoutMs: number): Promise<void> {
	return new Promise<void>((resolve) => {
		const timeout = setTimeout(() => resolve(), timeoutMs);
		const done = (): void => {
			clearTimeout(timeout);
			resolve();
		};

		promise.then(done, done);
	});
}

/**
 * Waits up to TERRAIN_MCP_WEIGHTS_TIMEOUT_MS for weight maps that are still loading (starts the lazy load of a hidden terrain, §8.1 rule 2).
 * Returns the part of that time that is left (all of it when nothing was loading): the `weightsTimeoutMs` of the stroke, so a stroke never
 * waits more than TERRAIN_MCP_WEIGHTS_TIMEOUT_MS in all.
 * @param target defines the terrain.
 */
export async function waitForTerrainMcpWeightsAsync(target: ITerrainMcpTarget): Promise<number> {
	const plugin = getTerrainPlugin(target.mesh);
	if (!plugin || (plugin.weightMapsState !== "idle" && plugin.weightMapsState !== "loading")) {
		return TERRAIN_MCP_WEIGHTS_TIMEOUT_MS;
	}

	const start = Date.now();
	await waitForTerrainMcpPromiseAsync(plugin.whenWeightMapsReadyAsync(), TERRAIN_MCP_WEIGHTS_TIMEOUT_MS);

	return Math.max(0, TERRAIN_MCP_WEIGHTS_TIMEOUT_MS - (Date.now() - start));
}

/**
 * Returns `{ warnings }` when there is something to report, else an empty object (compact results).
 * @param warnings defines the warnings of the result.
 */
export function getTerrainMcpWarnings(warnings: readonly string[]): { warnings?: string[] } {
	return warnings.length ? { warnings: warnings.slice() } : {};
}

// Units (§8.1 rule 7): every MCP length is in world centimeters.

/**
 * World length (cm) of the local unit axes of a node, from the rows of its world matrix (§4.1).
 */
export interface ITerrainMcpMetric {
	sx: number;
	sy: number;
	sz: number;
}

/**
 * Computes the world matrices of a node and of its ancestors, from the root down. Babylon returns cached world matrices while the render id
 * doesn't change: nodes created or moved earlier in the same frame (an execute_batch, a script) would otherwise be read at their old place.
 * @param node defines the node.
 */
export function computeTerrainMcpWorldMatrices(node: Node): void {
	const chain: Node[] = [];
	for (let current: Node | null = node; current; current = current.parent) {
		chain.unshift(current);
	}

	chain.forEach((current) => current.computeWorldMatrix(true));
}

/**
 * Returns the metric of a node: the world length of its local X, Y and Z unit axes (§4.1). Degenerate axes give 1.
 * @param node defines the node (a terrain, or the parent of a new terrain).
 */
export function getTerrainMcpMetric(node: Node | null | undefined): ITerrainMcpMetric {
	if (!node) {
		return { sx: 1, sy: 1, sz: 1 };
	}

	computeTerrainMcpWorldMatrices(node);

	const matrix = node.getWorldMatrix();
	if (!matrix) {
		return { sx: 1, sy: 1, sz: 1 };
	}

	const m = matrix.m;
	const length = (x: number, y: number, z: number): number => {
		const value = Math.sqrt(x * x + y * y + z * z);
		return value > 1e-6 && Number.isFinite(value) ? value : 1;
	};

	return {
		sx: length(m[0], m[1], m[2]),
		sy: length(m[4], m[5], m[6]),
		sz: length(m[8], m[9], m[10]),
	};
}

/**
 * Converts a tile size or offset from the local centimeters of the data model to world centimeters (x · sx, z · sz).
 * @param value defines the local [x, z] values.
 * @param metric defines the metric of the terrain.
 */
export function toTerrainMcpWorldTile(value: readonly [number, number] | readonly number[], metric: ITerrainMcpMetric): [number, number] {
	return [value[0] * metric.sx, value[1] * metric.sz];
}

/**
 * Converts a tile size or offset from world centimeters to the local centimeters of the data model (x / sx, z / sz).
 * @param value defines the world [x, z] values.
 * @param metric defines the metric of the terrain.
 */
export function toTerrainMcpLocalTile(value: readonly [number, number] | readonly number[], metric: ITerrainMcpMetric): [number, number] {
	return [value[0] / metric.sx, value[1] / metric.sz];
}

// Summaries (§8.1 rule 11: compact JSON)

/**
 * Texture layer of a terrain as returned by the tools (tile size in world centimeters).
 */
export interface ITerrainMcpLayerSummary {
	index: number;
	id: string;
	name: string;
	albedo: string | null;
	normal: string | null;
	/** World cm covered by one texture repetition along the terrain's X and Z axes. */
	tileSize: [number, number];
	/** 0..1, null while the weights are not loaded. */
	coverage: number | null;
}

/**
 * Compact description of a terrain (ITerrainInfo without the mesh), every length in world centimeters.
 */
export interface ITerrainMcpSummary {
	id: string;
	name: string;
	readOnly: boolean;
	subdivisions: number;
	/** World cm along the terrain's local X axis. */
	width: number;
	/** World cm along the terrain's local Z axis. */
	depth: number;
	/** World cm of one grid cell along X and Z. */
	cellSize: [number, number];
	/** World position of the terrain centre. */
	center: [number, number, number];
	/** World XZ rectangle covered by the terrain. */
	worldBounds: { min: [number, number]; max: [number, number] };
	worldHeightRange: [number, number];
	holes: number;
	vertices: number;
	triangles: number;
	material: { id: string; name: string; isTerrainMaterial: boolean } | null;
	layers: ITerrainMcpLayerSummary[];
	weightMapSize: number | null;
	layerTextureSize: number | null;
	weightMapsState: TerrainLoadState | null;
	layerTexturesState: TerrainLoadState | null;
	weightsDirty: boolean;
	budget: ITerrainBudgetInfo | null;
	memory: { cpuBytes: number; gpuBytes: number; geometryFileBytes: number };
	warnings: TerrainWarning[];
}

function toTerrainMcpLayerSummaries(layers: readonly ITerrainLayerInfo[], metric: ITerrainMcpMetric): ITerrainMcpLayerSummary[] {
	return layers.map((layer) => {
		const tileSize = toTerrainMcpWorldTile(layer.tileSize, metric);

		return {
			index: layer.index,
			id: layer.id,
			name: layer.name,
			albedo: layer.albedo,
			normal: layer.normal,
			tileSize: [roundTerrainMcpValue(tileSize[0], 3), roundTerrainMcpValue(tileSize[1], 3)],
			coverage: layer.coverage === null ? null : roundTerrainMcpValue(layer.coverage, 4),
		};
	});
}

/**
 * Returns the layers of a terrain with their world tile sizes and coverage.
 * @param target defines the terrain.
 */
export function getTerrainMcpLayers(target: ITerrainMcpTarget): ITerrainMcpLayerSummary[] {
	return toTerrainMcpLayerSummaries(getTerrainMeshInfo(target.mesh).layers, getTerrainMcpMetric(target.mesh));
}

/**
 * Returns the compact summary of a terrain (§8.1 get_terrain_info): world sizes, bounds and heights, layers, states, warnings.
 * @param target defines the terrain.
 */
export function getTerrainMcpSummary(target: ITerrainMcpTarget): ITerrainMcpSummary {
	const { mesh } = target;

	const info = getTerrainMeshInfo(mesh);
	const metric = getTerrainMcpMetric(mesh);
	const world = mesh.getWorldMatrix();

	const corners = [
		[-0.5, -0.5],
		[0.5, -0.5],
		[-0.5, 0.5],
		[0.5, 0.5],
	].map(([u, v]) => Vector3.TransformCoordinates(new Vector3(u * info.width, 0, v * info.height), world));

	const center = mesh.getAbsolutePosition();

	return {
		id: info.id,
		name: info.name,
		readOnly: info.readOnly,
		subdivisions: info.subdivisions,
		width: roundTerrainMcpValue(info.width * metric.sx),
		depth: roundTerrainMcpValue(info.height * metric.sz),
		cellSize: [roundTerrainMcpValue(info.cellX * metric.sx, 3), roundTerrainMcpValue(info.cellZ * metric.sz, 3)],
		center: [roundTerrainMcpValue(center.x), roundTerrainMcpValue(center.y), roundTerrainMcpValue(center.z)],
		worldBounds: {
			min: [roundTerrainMcpValue(Math.min(...corners.map((c) => c.x))), roundTerrainMcpValue(Math.min(...corners.map((c) => c.z)))],
			max: [roundTerrainMcpValue(Math.max(...corners.map((c) => c.x))), roundTerrainMcpValue(Math.max(...corners.map((c) => c.z)))],
		},
		worldHeightRange: roundTerrainMcpRange(info.worldHeightRange),
		holes: info.holes,
		vertices: info.vertices,
		triangles: info.triangles,
		material: info.material ? { ...info.material } : null,
		layers: toTerrainMcpLayerSummaries(info.layers, metric),
		weightMapSize: info.weightMapSize,
		layerTextureSize: info.layerTextureSize,
		weightMapsState: info.weightMapsState,
		layerTexturesState: info.layerTexturesState,
		weightsDirty: info.weightsDirty,
		budget: info.budget ? { ...info.budget, dropped: info.budget.dropped.slice() } : null,
		memory: { ...info.memory },
		warnings: info.warnings.slice(),
	};
}

/**
 * Returns the compact form of a stroke result (§3.5 ITerrainStrokeResult) with the given warnings appended.
 * @param result defines the result of applyTerrainStroke.
 * @param warnings defines the warnings of the tool.
 */
export function getTerrainMcpStrokeResult(result: ITerrainStrokeResult, warnings: readonly string[]): ITerrainStrokeResult {
	return {
		dabs: result.dabs,
		changed: result.changed.slice(),
		worldHeightRange: roundTerrainMcpRange(result.worldHeightRange),
		staleDecals: result.staleDecals,
		warnings: [...warnings, ...result.warnings],
	};
}

// Layers

/**
 * Returns the layers of the terrain material of the target (empty without terrain material).
 * @param target defines the terrain.
 */
export function getTerrainMcpLayerData(target: ITerrainMcpTarget): readonly ITerrainLayerData[] {
	return getTerrainPlugin(target.mesh)?.data.layers ?? [];
}

/**
 * Finds a layer by index (0 = first layer), id or name (exact, then case-insensitive; a string of digits is also tried as an index).
 * @param layers defines the layers of the terrain material.
 * @param reference defines the layer index, id or name.
 */
export function findTerrainMcpLayer(layers: readonly ITerrainLayerData[], reference: unknown): ITerrainLayerData | null {
	if (typeof reference === "number") {
		return Number.isInteger(reference) ? (layers[reference] ?? null) : null;
	}

	if (typeof reference !== "string") {
		return null;
	}

	const text = reference.trim();
	const lower = text.toLowerCase();

	return (
		layers.find((layer) => layer.id === text) ??
		layers.find((layer) => layer.name === text) ??
		layers.find((layer) => layer.name.toLowerCase() === lower) ??
		(/^\d+$/.test(text) ? (layers[Number(text)] ?? null) : null)
	);
}

/**
 * Resolves a layer reference or throws `Layer "{ref}" not found on terrain "{name}". Layers: {names}.` (§8.1 rule 1).
 * @param target defines the terrain.
 * @param reference defines the layer index, id or name.
 */
export function resolveTerrainMcpLayer(target: ITerrainMcpTarget, reference: unknown): ITerrainLayerData {
	const layers = getTerrainMcpLayerData(target);
	const layer = findTerrainMcpLayer(layers, reference);
	if (!layer) {
		throw new Error(getTerrainMcpLayerNotFoundMessage(reference, target.mesh.name, layers));
	}

	return layer;
}

/**
 * Throws `Terrain "{name}" has no texture layers: ...` when the terrain has no terrain material or no layer (§8.1 rule 1).
 * @param target defines the terrain.
 */
export function assertTerrainMcpHasLayers(target: ITerrainMcpTarget): void {
	if (!getTerrainMcpLayerData(target).length) {
		throw new Error(getTerrainMcpNoLayersMessage(target.mesh.name));
	}
}

// Paths (§8.1 rule 6): project-relative or absolute.

/**
 * Converts the separators of a path to "/".
 * @param path defines the path.
 */
export function toTerrainMcpSlashPath(path: string): string {
	return path.replace(/\\/g, "/");
}

/**
 * Returns whether or not the path is absolute (POSIX or Windows drive).
 * @param path defines the path ("/" separators).
 */
export function isTerrainMcpAbsolutePath(path: string): boolean {
	return isAbsolute(path) || /^[a-zA-Z]:\//.test(path);
}

/**
 * Returns the directory of the opened project ("/" separators), or null when no project is open.
 */
export function getTerrainMcpProjectDirectory(): string | null {
	const projectPath = projectConfiguration.path;
	return projectPath ? dirname(toTerrainMcpSlashPath(projectPath)) : null;
}

/**
 * Returns the directory of the opened project, or throws "No project is open.".
 */
export function requireTerrainMcpProjectDirectory(): string {
	const directory = getTerrainMcpProjectDirectory();
	if (!directory) {
		throw new Error(TERRAIN_MCP_NO_PROJECT_MESSAGE);
	}

	return directory;
}

/**
 * Returns the absolute, normalized path ("/" separators) of a project-relative or absolute path.
 * @param path defines the path given to the tool.
 */
export function resolveTerrainMcpPath(path: string): string {
	const slashPath = toTerrainMcpSlashPath(path.trim());
	return normalize(isTerrainMcpAbsolutePath(slashPath) ? slashPath : join(requireTerrainMcpProjectDirectory(), slashPath));
}

/**
 * Returns the path relative to the project directory ("/" separators), or null when the path is outside the project (or is the project
 * directory itself). Case-insensitive for Windows drive paths.
 * @param absolutePath defines the absolute path.
 */
export function getTerrainMcpProjectRelativePath(absolutePath: string): string | null {
	const projectDirectory = getTerrainMcpProjectDirectory();
	if (!projectDirectory) {
		return null;
	}

	const directory = normalize(projectDirectory).replace(/\/+$/, "");
	const path = normalize(toTerrainMcpSlashPath(absolutePath));

	const windows = /^[a-zA-Z]:\//.test(directory);
	const directoryKey = windows ? directory.toLowerCase() : directory;
	const pathKey = windows ? path.toLowerCase() : path;

	if (!pathKey.startsWith(`${directoryKey}/`) || pathKey.length <= directoryKey.length + 1) {
		return null;
	}

	return path.substring(directory.length + 1);
}

/**
 * Returns the file name of a path without its extension.
 * @param path defines the path.
 */
export function getTerrainMcpFileStem(path: string): string {
	const slashPath = toTerrainMcpSlashPath(path);
	return basename(slashPath, extname(slashPath));
}

// Strokes (§8.1 rule 2)

/**
 * Arguments shared by sculpt_terrain and paint_terrain (strokeCommon of §8.1), validated.
 */
export interface ITerrainMcpStrokeArguments {
	points: [number, number][];
	radius: number;
	strength?: number;
	hardness?: number;
	falloff?: TerrainFalloff;
	spacing?: number;
	brush?: string;
	rotation?: number;
	autoFixSharing?: boolean;
	filters?: ITerrainMcpFilterArguments;
}

/**
 * Validated filters of a stroke.
 */
export interface ITerrainMcpFilterArguments {
	height?: { min: number; max: number; feather?: number };
	slope?: { min: number; max: number; feather?: number };
	layer?: { layer: number | string; threshold?: number; invert?: boolean };
}

/**
 * Falloff curves of the brushes.
 */
export const TERRAIN_MCP_FALLOFFS: readonly TerrainFalloff[] = ["smooth", "linear", "spherical", "sharp", "constant", "gaussian"];

function readTerrainMcpBand(filters: Record<string, any>, key: "height" | "slope"): { min: number; max: number; feather?: number } | undefined {
	const band = readTerrainMcpObject(filters, key, `filters.${key}`);
	if (!band) {
		return undefined;
	}

	const min = readRequiredTerrainMcpNumber(band, "min", {}, `filters.${key}.min`);
	const max = readRequiredTerrainMcpNumber(band, "max", {}, `filters.${key}.max`);
	const feather = readTerrainMcpNumber(band, "feather", { min: 0 }, `filters.${key}.feather`);

	return { min: Math.min(min, max), max: Math.max(min, max), feather };
}

/**
 * Reads and validates the stroke arguments shared by sculpt_terrain and paint_terrain (ranges of §8.1 strokeCommon).
 * @param data defines the arguments of the tool.
 */
export function readTerrainMcpStrokeArguments(data: unknown): ITerrainMcpStrokeArguments {
	const filters = readTerrainMcpObject(data, "filters");

	let filterArguments: ITerrainMcpFilterArguments | undefined;
	if (filters) {
		const layer = readTerrainMcpObject(filters, "layer", "filters.layer");

		filterArguments = {
			height: readTerrainMcpBand(filters, "height"),
			slope: readTerrainMcpBand(filters, "slope"),
			layer: layer
				? {
						layer:
							readTerrainMcpLayerReference(layer, "layer", "filters.layer.layer") ??
							throwTerrainMcpInvalidArgument("filters.layer.layer", "a layer index, id or name"),
						threshold: readTerrainMcpNumber(layer, "threshold", { min: 0, max: 1 }, "filters.layer.threshold"),
						invert: readTerrainMcpBoolean(layer, "invert", "filters.layer.invert"),
					}
				: undefined,
		};
	}

	return {
		points: readTerrainMcpPoints(data),
		radius: readRequiredTerrainMcpNumber(data, "radius", { above: 0, max: TERRAIN_MCP_MAX_RADIUS }),
		strength: readTerrainMcpNumber(data, "strength", { min: 0, max: 1 }),
		hardness: readTerrainMcpNumber(data, "hardness", { min: 0, max: 0.95 }),
		falloff: readTerrainMcpEnum(data, "falloff", TERRAIN_MCP_FALLOFFS),
		spacing: readTerrainMcpNumber(data, "spacing", { min: 0.02, max: 2 }),
		brush: readTerrainMcpString(data, "brush"),
		rotation: readTerrainMcpNumber(data, "rotation"),
		autoFixSharing: readTerrainMcpBoolean(data, "autoFixSharing"),
		filters: filterArguments,
	};
}

/**
 * Brings an angle in degrees into [-180, 180].
 * @param degrees defines the angle.
 */
export function normalizeTerrainMcpDegrees(degrees: number): number {
	const value = (((degrees + 180) % 360) + 360) % 360;
	return value - 180;
}

/**
 * Finds a brush by id, by "builtin:" + id, then by name (case-insensitive). Throws when no brush matches.
 * @param reference defines the brush id or name given to the tool (default builtin:round).
 */
export function resolveTerrainMcpBrush(reference: string | undefined): ITerrainBrush {
	const id = reference ?? TERRAIN_MCP_DEFAULT_BRUSH_ID;
	const lower = id.toLowerCase();

	const brush = getTerrainBrush(id) ?? getTerrainBrush(`builtin:${id}`) ?? TERRAIN_BRUSHES.find((candidate) => candidate.name.toLowerCase() === lower) ?? null;
	if (!brush) {
		throw new Error(`Brush "${id}" not found: call list_terrain_brushes to get the ids of the available brushes.`);
	}

	return brush;
}

/**
 * Creates the tool settings of a stroke (§8.1 rule 2): createDefaultTerrainToolSettings() in the category of the tool, overridden by the
 * shared stroke arguments.
 * @param tool defines the engine tool of the stroke (after the MCP tool mapping).
 * @param stroke defines the validated stroke arguments.
 * @param brush defines the brush of the stroke.
 */
export function createTerrainMcpStrokeSettings(tool: TerrainTool, stroke: ITerrainMcpStrokeArguments, brush: ITerrainBrush): ITerrainToolSettings {
	const settings = createDefaultTerrainToolSettings();

	if (tool === "paint" || tool === "blend" || tool === "replace") {
		settings.category = "paint";
		settings.paintTool = tool;
	} else {
		settings.category = "sculpt";
		settings.sculptTool = tool;
	}

	settings.brush.brushId = brush.id;
	settings.brush.radius = stroke.radius;
	settings.brush.hardness = stroke.hardness ?? settings.brush.hardness;
	settings.brush.falloff = stroke.falloff ?? settings.brush.falloff;
	settings.brush.spacing = stroke.spacing ?? settings.brush.spacing;
	settings.brush.rotation = normalizeTerrainMcpDegrees(stroke.rotation ?? settings.brush.rotation);

	if (stroke.strength !== undefined) {
		settings.strength[tool] = stroke.strength;
	}

	return settings;
}

/**
 * Applies the stroke filters (§1.11): height (world cm) and slope (degrees) bands, and the layer filter, which is accepted for sculpt tools
 * too (§8.1 rule 2).
 * @param target defines the terrain.
 * @param settings defines the tool settings of the stroke.
 * @param filters defines the validated filters.
 */
export function applyTerrainMcpFilters(target: ITerrainMcpTarget, settings: ITerrainToolSettings, filters: ITerrainMcpFilterArguments | undefined): void {
	if (!filters) {
		return;
	}

	if (filters.height) {
		settings.filters.height = {
			enabled: true,
			min: filters.height.min,
			max: filters.height.max,
			feather: filters.height.feather ?? settings.filters.height.feather,
			invert: false,
		};
	}

	if (filters.slope) {
		settings.filters.slope = {
			enabled: true,
			min: filters.slope.min,
			max: filters.slope.max,
			feather: filters.slope.feather ?? settings.filters.slope.feather,
			invert: false,
		};
	}

	if (filters.layer) {
		const layer = resolveTerrainMcpLayer(target, filters.layer.layer);
		settings.filters.layer = {
			enabled: true,
			layerId: layer.id,
			threshold: filters.layer.threshold ?? settings.filters.layer.threshold,
			invert: filters.layer.invert ?? false,
		};
	}
}

/**
 * Resolves the shape of the stroke brush with the brush settings (§8.1 rule 2: `loadTerrainBrushShape`).
 * @param brush defines the brush of the stroke.
 * @param settings defines the tool settings of the stroke (falloff, hardness, edge falloff).
 */
export function resolveTerrainMcpBrushShapeAsync(brush: ITerrainBrush, settings: ITerrainToolSettings): Promise<ITerrainBrushShape> {
	return loadTerrainBrushShape(brush.id, settings.brush);
}

/**
 * Builds the stroke request (§8.1 rule 2: `buildTerrainStrokeRequest(settings, shape, layerId, invert, seed)`).
 * @param settings defines the tool settings of the stroke.
 * @param shape defines the resolved brush shape.
 * @param layerId defines the painted layer (paint tools), null for sculpt tools.
 * @param invert defines the inversion given by the tool mapping (lower, sharpen, fill_hole, erase).
 * @param seed defines the seed of the stroke.
 */
export function buildTerrainMcpStrokeRequest(
	settings: ITerrainToolSettings,
	shape: ITerrainBrushShape,
	layerId: string | null,
	invert: boolean,
	seed: number
): ITerrainStrokeRequest {
	return buildTerrainStrokeRequest(settings, shape, layerId, invert, seed);
}
