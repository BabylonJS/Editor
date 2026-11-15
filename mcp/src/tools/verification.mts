import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callImageTool, callTextTool } from "./helpers.mjs";

export function registerVerificationTools(server: McpServer): void {
	server.registerTool(
		"get_screenshot",
		{
			title: "Get screenshot",
			description:
				"Capture a screenshot of the editor preview as an image, for VISUAL VERIFICATION. After composing or modifying a scene, call this and compare it to the user's description; iterate until the result matches. " +
				"While the game plays in the preview (`play_scene`), it captures the game as the player sees it, through its active camera. " +
				"Tip: use `focus_node` or `set_active_camera` first to frame the relevant content.",
			inputSchema: z.object({
				width: z.number().optional().describe("Screenshot width in pixels."),
				height: z.number().optional().describe("Screenshot height in pixels."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callImageTool("get_screenshot", args)
	);

	server.registerTool(
		"focus_node",
		{
			title: "Focus node",
			description: "Frame the editor camera on a node so it fills the view. Useful right before `get_screenshot` to verify a specific object.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the node to frame (preferred)."),
				nodeName: z.string().optional().describe("Name of the node to frame."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("focus_node", args)
	);

	server.registerTool(
		"run_project",
		{
			title: "Run project",
			description: "Start the project's dev/run process to play-test the game. Optional; use after scripts are attached and the scene is composed.",
			inputSchema: z.object({}),
			annotations: { openWorldHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("run_project", args)
	);

	server.registerTool(
		"play_scene",
		{
			title: "Play scene",
			description:
				"Play the game in the editor's preview, exactly like the user pressing Play: the scene is exported, the scripts of `src/` compiled and run with physics. " +
				"Use it to TEST gameplay scripts (controllers, cameras, shooting, AI) after writing and attaching them. It returns the compile errors, runtime errors (uncaught exceptions of `onStart`/`onUpdate` included), warnings and logs " +
				"received while the game started, and its active camera. Fix every error, then play again (it restarts from scratch). " +
				"While it plays: drive it with `simulate_input`, read its state with `inspect_play_scene`, see it with `get_screenshot`, read new logs with `get_console_logs`. " +
				"Always call `stop_scene` when done: editing tools act on the editor's scene, not on the playing game.",
			inputSchema: z.object({
				durationMs: z.number().optional().describe("How long to let the game run before returning, in milliseconds (default 2000, max 30000)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("play_scene", args)
	);

	server.registerTool(
		"stop_scene",
		{
			title: "Stop scene",
			description: "Stop the game playing in the preview (started with `play_scene`) and get back to editing the scene.",
			inputSchema: z.object({}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("stop_scene", args)
	);

	server.registerTool(
		"simulate_input",
		{
			title: "Simulate player input",
			description:
				"Simulate the input of the player in the game playing in the preview (`play_scene` first): hold keys for a duration, move the mouse, click. Events are dispatched on the canvas like real ones, " +
				"so `@onKeyboardEvent`/`@onPointerEvent`, `scene.onKeyboardObservable`/`onPointerObservable` and DOM listeners receive them. " +
				"Test a controller by comparing `inspect_play_scene` before and after, e.g. hold `w` for 1000 ms and check that the character moved forward, move the mouse and check that the camera turned, click and check the shot. " +
				"Browsers never lock the pointer for simulated events: mouse look must also work from `pointermove` `movementX`/`movementY` without pointer lock to be testable.",
			inputSchema: z.object({
				keys: z
					.array(z.string())
					.optional()
					.describe('Keys held together during the whole duration: characters ("w", "a", " ") or names ("Space", "Shift", "Control", "ArrowUp", "Escape"...).'),
				durationMs: z.number().optional().describe("How long the keys are held, in milliseconds (default 500, max 30000)."),
				pointerMovement: z
					.array(z.number())
					.length(2)
					.optional()
					.describe("Mouse movement `[dx, dy]` in pixels, spread over the duration (`movementX`/`movementY` of `pointermove` events)."),
				click: z.enum(["left", "right"]).optional().describe("Mouse button clicked at the center of the canvas (where a crosshair aims), after the keys are released."),
				holdClick: z.boolean().optional().describe("Hold the mouse button during the whole duration instead of clicking at the end (automatic fire, aiming)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("simulate_input", args)
	);

	server.registerTool(
		"inspect_play_scene",
		{
			title: "Inspect playing scene",
			description:
				"Read the state of the game playing in the preview (`play_scene` first): its active camera (position, direction), the animation groups playing, the FPS, and the world position, rotation and physics velocity of the given nodes. " +
				"Nodes are looked up in the PLAYING scene, by the ids/names they have in the editor.",
			inputSchema: z.object({
				nodeIds: z.array(z.string()).optional().describe("Ids of the nodes to read."),
				nodeNames: z.array(z.string()).optional().describe("Names of the nodes to read."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("inspect_play_scene", args)
	);

	server.registerTool(
		"get_console_logs",
		{
			title: "Get console logs",
			description:
				"Read the messages of the editor's console: errors of the editor and, while the game plays, the `console.log`/`warn`/`error` of the scripts and their uncaught errors. " +
				"Pass the `nextId` of the previous call as `sinceId` to only get the new messages.",
			inputSchema: z.object({
				sinceId: z.number().optional().describe("Only return the messages from this id on (the `nextId` returned by a previous call)."),
				levels: z
					.array(z.enum(["log", "warn", "error"]))
					.optional()
					.describe("Only return the messages of these levels."),
				limit: z.number().optional().describe("Maximum number of messages, the most recent ones (default 100)."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("get_console_logs", args)
	);
}
