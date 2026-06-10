import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { z } from "zod";

import packageJson from "../package.json" with { type: "json" };

import { notifyAndGetResultFromEditor } from "./request.mjs";

const server = new McpServer({
	name: "babylonjs-editor-mcp",
	version: packageJson.version,
});

server.registerTool(
	"get_scene_hierarchy",
	{
		title: "Get scene hierarchy",
		description: "Retrieve the hierarchy of nodes in the current scene expressed in JSON format.",
		inputSchema: z.object({
			rootNodeName: z.string().optional().describe("The name of the root node to get the hierarchy from. If not provided, the root node of the scene is used."),
		}),
	},
	async ({ rootNodeName }): Promise<CallToolResult> => {
		const result = await notifyAndGetResultFromEditor("get_scene_hierarchy", { rootNodeName });
		return {
			isError: result?.isError,
			content: [
				{
					type: "text",
					text: result?.text,
				},
			],
		};
	}
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[Babylon.js Editor MCP] Server started");
