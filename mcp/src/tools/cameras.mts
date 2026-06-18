import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerCameraTools(server: McpServer): void {
	server.registerTool(
		"create_camera",
		{
			title: "Create camera",
			description:
				"Create a camera (free, arcrotate or universal). Positions/targets are in centimeters. " +
				"Use `set_active_camera` afterwards to make it the scene's active camera. A well-placed camera also improves `get_screenshot` framing.",
			inputSchema: z.object({
				type: z.enum(["free", "arcrotate", "universal"]).describe("The camera type."),
				name: z.string().optional().describe("Name for the new camera."),
				position: z.array(z.number()).length(3).optional().describe("World position `[x,y,z]` in centimeters."),
				target: z.array(z.number()).length(3).optional().describe("Target point `[x,y,z]` the camera looks at, in centimeters."),
				options: z.record(z.string(), z.any()).optional().describe("Extra camera options (e.g. `{ fov, minZ, maxZ, radius, alpha, beta }`)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("create_camera", args)
	);

	server.registerTool(
		"set_active_camera",
		{
			title: "Set active camera",
			description: "Set the scene's active camera. Use this to control the viewpoint used by the preview and by `get_screenshot`.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the camera (preferred)."),
				nodeName: z.string().optional().describe("Name of the camera."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("set_active_camera", args)
	);
}
