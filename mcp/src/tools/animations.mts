import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerAnimationTools(server: McpServer): void {
	server.registerTool(
		"list_animation_groups",
		{
			title: "List animation groups",
			description:
				"List the scene's animation groups: clips imported with a mesh asset (e.g. a glTF character's 'idle'/'walk' clips) AND groups authored with `create_animation`. " +
				"Use this to discover what is already playable before previewing with `play_animation_group` or authoring a new one.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("list_animation_groups", args)
	);

	server.registerTool(
		"play_animation_group",
		{
			title: "Play animation group",
			description:
				"Preview an animation group in the editor (e.g. play a character's 'idle' or 'walk' clip, or a freshly authored door-opening animation) so you can verify it with `get_screenshot`. " +
				"This is for in-editor preview only — to make the animation play at runtime in the game, attach a BEHAVIOR script that calls `scene.getAnimationGroupByName(name)?.play()` when the relevant event occurs (e.g. the player approaches).",
			inputSchema: z.object({
				name: z.string().describe("Name of the animation group to play."),
				loop: z.boolean().optional().describe("Whether the animation loops (default true)."),
				speed: z.number().optional().describe("Playback speed ratio (1 = normal speed)."),
				from: z.number().optional().describe("Start frame. Defaults to the group's `from`."),
				to: z.number().optional().describe("End frame. Defaults to the group's `to`."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("play_animation_group", args)
	);

	server.registerTool(
		"stop_animation_group",
		{
			title: "Stop animation group",
			description: "Stop a playing animation group. Omit `name` to stop ALL animation groups in the scene.",
			inputSchema: z.object({
				name: z.string().optional().describe("Name of the animation group to stop. Omit to stop every animation group."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("stop_animation_group", args)
	);

	server.registerTool(
		"create_animation",
		{
			title: "Create animation",
			description:
				"AUTHOR a keyframe `AnimationGroup` that animates a node property over time (e.g. a door opening = animate `rotation.y` from 0 to ~1.57 radians, a platform bobbing up and down = animate `position.y`, a light pulsing = animate `intensity` or `diffuse`). " +
				'`targetProperty` is a dotted path on the resolved node (e.g. `"rotation.y"`, `"position"`, `"scaling"`, `"material.albedoColor"`). `keys` are `{ frame, value }` pairs; `value` is a number for scalar properties or `[x,y,z]` for Vector3/Color3 properties. ' +
				"`loopMode`: 'cycle' (restart from the first key, default), 'constant' (stop and hold the last key), or 'relative' (offset and continue from the end value). " +
				"This creates REAL, hand-editable editor content (visible and tweakable in the Animation Groups inspector) — it does NOT make anything play yet. " +
				"#1 RULE: do NOT animate the property directly from a script's `onUpdate` (e.g. incrementing `rotation.y` every frame) — author the motion HERE as a real AnimationGroup, then have a BEHAVIOR script call `scene.getAnimationGroupByName(name)?.play()` when something happens (the player approaches, a button is pressed, etc.). Preview the result with `play_animation_group` and `get_screenshot`.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				name: z.string().describe("Name for the new animation group (used to play it later, e.g. via `scene.getAnimationGroupByName`)."),
				targetProperty: z.string().describe('Dotted property path on the node to animate, e.g. `"rotation.y"`, `"position"`, `"scaling"`, `"material.albedoColor"`.'),
				framesPerSecond: z.number().optional().describe("Frames per second for the animation's frame numbers (default 60)."),
				loopMode: z
					.enum(["cycle", "constant", "relative"])
					.optional()
					.describe(
						"Looping behavior when the group is played: 'cycle' restarts from the start key (default), 'constant' holds the last key, 'relative' offsets and continues."
					),
				keys: z
					.array(
						z.object({
							frame: z.number().describe("Frame number for this keyframe (combined with `framesPerSecond` to get the time)."),
							value: z
								.union([z.number(), z.array(z.number()).length(3)])
								.describe("Value at this frame: a number for scalar properties, or `[x,y,z]` for Vector3/Color3 properties."),
						})
					)
					.describe("Ordered keyframes for the animation."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("create_animation", args)
	);

	server.registerTool(
		"delete_animation_group",
		{
			title: "Delete animation group",
			description: "Remove and dispose an animation group from the scene by name (e.g. to remove a previously authored animation before re-authoring it).",
			inputSchema: z.object({
				name: z.string().describe("Name of the animation group to delete."),
			}),
			annotations: { destructiveHint: true, idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("delete_animation_group", args)
	);
}
