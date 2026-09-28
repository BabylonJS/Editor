import { Camera, Node, Scene, Vector3 } from "babylonjs";

import { isAbstractMesh, isAnyTransformNode } from "../../tools/guards/nodes";
import { waitWithEditorTimers } from "../../tools/scene/play/override";

import { projectConfiguration } from "../../project/configuration";

import { EditorConsoleEntryLevel, IEditorConsoleEntry } from "../../editor/layout/console";

import { IMCPActionOptions } from "../action";

import { getKeyDescription } from "./keys";

/**
 * Defines the maximum time, in milliseconds, the tools wait while the game runs.
 */
const maxPlayDuration = 30000;

function clampDuration(value: unknown, defaultValue: number): number {
	const duration = typeof value === "number" && Number.isFinite(value) ? value : defaultValue;
	return Math.min(Math.max(duration, 0), maxPlayDuration);
}

function toArray(vector: Vector3): number[] {
	return [vector.x, vector.y, vector.z].map((value) => Math.round(value * 1000) / 1000);
}

/**
 * Returns the messages logged in the console of the editor since the given entry, grouped by level. The logs are
 * limited to the last ones: a game can log each frame.
 */
function getConsoleReport(options: IMCPActionOptions, firstEntryId: number): Record<string, string[]> {
	const entries = options.editor.layout.console.getEntriesSince(firstEntryId);
	const byLevel = (level: EditorConsoleEntryLevel) => entries.filter((entry) => entry.level === level && entry.message.trim()).map((entry) => entry.message);

	return {
		errors: byLevel("error"),
		warnings: byLevel("warn"),
		logs: byLevel("log").slice(-50),
	};
}

/**
 * Returns the scene of the game playing in the preview, or null when it doesn't play. The scene is set and removed
 * synchronously, while the state of the play component is updated later by React.
 */
function getPlayScene(options: IMCPActionOptions): Scene | null {
	const scene = options.editor.layout.preview.play?.scene;
	return scene && !scene.isDisposed ? scene : null;
}

function getRequiredPlayScene(options: IMCPActionOptions): Scene {
	const scene = getPlayScene(options);
	if (!scene) {
		throw new Error("The scene is not playing: start it with `play_scene` first.");
	}

	return scene;
}

function getCameraSummary(camera: Camera | null): any {
	if (!camera) {
		return null;
	}

	camera.computeWorldMatrix();

	return {
		name: camera.name,
		className: camera.getClassName(),
		position: toArray(camera.globalPosition),
		direction: toArray(camera.getDirection(Vector3.Forward())),
	};
}

/**
 * Plays the scene in the preview of the editor, like the Play button: the project is exported, its scripts compiled
 * and the game runs in the preview. Returns what the console received while it started.
 */
export async function playScene(_scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const preview = options.editor.layout.preview;

	if (!projectConfiguration.path) {
		throw new Error("No project is open.");
	}

	if (!preview.state.playEnabled) {
		throw new Error("The scene can't be played yet: the dependencies of the project are still being installed. Try again in a moment.");
	}

	const firstEntryId = options.editor.layout.console.nextEntryId;

	// Played again from scratch so the scripts are compiled again.
	if (preview.play.state.playing || getPlayScene(options)) {
		preview.play.stop();
		await waitWithEditorTimers(150);
	}

	try {
		await preview.play.play();
	} catch (e) {
		options.editor.layout.console.error(`Failed to play the scene: ${e instanceof Error ? e.message : e}`);
	}

	const compilationFailed = options.editor.layout.console
		.getEntriesSince(firstEntryId)
		.some((entry: IEditorConsoleEntry) => entry.level === "error" && entry.message.includes("Failed to compile play scripts"));

	if (compilationFailed || !getPlayScene(options)) {
		// Only stopped when it started: stopping restores the render loops saved when the game started.
		if (preview.play.state.playing || getPlayScene(options)) {
			preview.play.stop();
		}

		return {
			playing: false,
			compiled: !compilationFailed,
			...getConsoleReport(options, firstEntryId),
		};
	}

	// Lets the scripts start and run a few frames, unless the game stops meanwhile (an error thrown while rendering).
	const duration = clampDuration(data.durationMs, 2000);
	for (let elapsed = 0; elapsed < duration && getPlayScene(options); elapsed += 100) {
		await waitWithEditorTimers(Math.min(100, duration - elapsed));
	}

	const scene = getPlayScene(options);

	return {
		playing: !!scene,
		compiled: true,
		activeCamera: getCameraSummary(scene?.activeCamera ?? null),
		fps: scene ? Math.round(scene.getEngine().getFps()) : 0,
		...getConsoleReport(options, firstEntryId),
	};
}

/**
 * Stops the game playing in the preview of the editor.
 */
export function stopScene(_scene: Scene, _data: any, options: IMCPActionOptions): any {
	const play = options.editor.layout.preview.play;
	const wasPlaying = play.state.playing || !!getPlayScene(options);

	if (wasPlaying) {
		play.stop();
	}

	return { playing: false, wasPlaying };
}

/**
 * Returns the messages logged in the console of the editor.
 */
export function getConsoleLogs(_scene: Scene, data: any, options: IMCPActionOptions): any {
	const editorConsole = options.editor.layout.console;
	const levels: string[] | null = Array.isArray(data.levels) && data.levels.length ? data.levels : null;
	const limit = Math.min(Math.max(typeof data.limit === "number" ? data.limit : 100, 1), 1000);

	const entries = editorConsole
		.getEntriesSince(typeof data.sinceId === "number" ? data.sinceId : 0)
		.filter((entry) => !levels || levels.includes(entry.level))
		.slice(-limit);

	return {
		entries,
		nextId: editorConsole.nextEntryId,
	};
}

function dispatchKeyboardEvent(target: EventTarget, type: "keydown" | "keyup", name: string): void {
	const description = getKeyDescription(name);
	const event = new KeyboardEvent(type, {
		key: description.key,
		code: description.code,
		bubbles: true,
		cancelable: true,
		shiftKey: description.key === "Shift" && type === "keydown",
	});

	// The legacy key codes can't be given to the constructor, and scripts still read them.
	Object.defineProperty(event, "keyCode", { get: () => description.keyCode });
	Object.defineProperty(event, "which", { get: () => description.keyCode });

	target.dispatchEvent(event);
}

function dispatchPointerEvent(target: HTMLElement, type: string, init: PointerEventInit): void {
	const rect = target.getBoundingClientRect();

	target.dispatchEvent(
		new PointerEvent(type, {
			pointerId: 1,
			pointerType: "mouse",
			isPrimary: true,
			bubbles: true,
			cancelable: true,
			clientX: rect.left + rect.width * 0.5,
			clientY: rect.top + rect.height * 0.5,
			...init,
		})
	);
}

/**
 * Simulates the input of a player in the game playing in the preview: keys held for a duration, mouse movements and
 * clicks, dispatched on the canvas like the ones of the user.
 */
export async function simulateInput(_scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	getRequiredPlayScene(options);

	const engine = options.editor.layout.preview.engine;
	const canvas = (engine.getInputElement?.() ?? engine.getRenderingCanvas()) as HTMLElement | null;
	if (!canvas) {
		throw new Error("The canvas of the preview is not available.");
	}

	const keys: string[] = Array.isArray(data.keys) ? data.keys : [];
	keys.forEach((key) => getKeyDescription(key)); // Validates all the keys first.

	const duration = clampDuration(data.durationMs, 500);
	const firstEntryId = options.editor.layout.console.nextEntryId;

	const [movementX, movementY] = Array.isArray(data.pointerMovement) ? data.pointerMovement : [0, 0];
	const button = data.click === "right" ? 2 : 0;

	if (data.click && data.holdClick) {
		dispatchPointerEvent(canvas, "pointerdown", { button, buttons: button === 2 ? 2 : 1 });
	}

	keys.forEach((key) => dispatchKeyboardEvent(canvas, "keydown", key));

	// The movement of the pointer is spread over the duration, like a real mouse. The events stop with the game: they
	// would reach the editor otherwise.
	const steps = movementX || movementY ? 10 : Math.max(1, Math.ceil(duration / 100));
	for (let i = 0; i < steps && getPlayScene(options); ++i) {
		if (movementX || movementY) {
			dispatchPointerEvent(canvas, "pointermove", { movementX: movementX / steps, movementY: movementY / steps });
		}

		await waitWithEditorTimers(duration / steps);
	}

	keys.slice()
		.reverse()
		.forEach((key) => dispatchKeyboardEvent(canvas, "keyup", key));

	if (data.click && getPlayScene(options)) {
		if (!data.holdClick) {
			dispatchPointerEvent(canvas, "pointerdown", { button, buttons: button === 2 ? 2 : 1 });
			await waitWithEditorTimers(50);
		}

		dispatchPointerEvent(canvas, "pointerup", { button, buttons: 0 });
	}

	// Lets the game react to the last input.
	await waitWithEditorTimers(100);

	const report = getConsoleReport(options, firstEntryId);

	return {
		playing: !!getPlayScene(options),
		keys,
		durationMs: duration,
		errors: report.errors,
		logs: report.logs,
	};
}

function getNodeState(node: Node): any {
	const state: any = {
		id: node.id,
		name: node.name,
		className: node.getClassName(),
		isEnabled: node.isEnabled(),
	};

	if (isAbstractMesh(node) || isAnyTransformNode(node)) {
		node.computeWorldMatrix(true);

		state.position = toArray(node.getAbsolutePosition());
		state.rotation = toArray(node.rotationQuaternion ? node.rotationQuaternion.toEulerAngles() : node.rotation);
		state.linearVelocity = node.physicsBody ? toArray(node.physicsBody.getLinearVelocity()) : undefined;
	}

	return state;
}

/**
 * Returns the state of the game playing in the preview: the active camera, the playing animation groups and the
 * transform of the given nodes. Compare the states before and after `simulate_input` to check that the game reacts.
 */
export function inspectPlayScene(_scene: Scene, data: any, options: IMCPActionOptions): any {
	const scene = getRequiredPlayScene(options);

	const ids: string[] = Array.isArray(data.nodeIds) ? data.nodeIds : [];
	const names: string[] = Array.isArray(data.nodeNames) ? data.nodeNames : [];

	const nodes = [...ids.map((id) => ({ query: id, node: scene.getNodeById(id) })), ...names.map((name) => ({ query: name, node: scene.getNodeByName(name) }))].map(
		({ query, node }) => (node ? getNodeState(node) : { query, error: "Node not found in the playing scene." })
	);

	return {
		activeCamera: getCameraSummary(scene.activeCamera),
		pointerLocked: scene.getEngine().isPointerLock,
		playingAnimationGroups: scene.animationGroups.filter((group) => group.isPlaying).map((group) => group.name),
		fps: Math.round(scene.getEngine().getFps()),
		nodes,
	};
}

/**
 * Returns the scene to take screenshots of: the game when it plays in the preview, the scene of the editor otherwise.
 */
export function getScreenshotScene(scene: Scene, options: IMCPActionOptions): Scene {
	return getPlayScene(options) ?? scene;
}
