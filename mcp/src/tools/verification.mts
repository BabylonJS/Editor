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
}
