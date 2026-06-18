import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerBatchTools(server: McpServer): void {
	server.registerTool(
		"execute_batch",
		{
			title: "Execute batch",
			description:
				"Execute an ordered list of tool calls in a SINGLE round-trip. Strongly preferred when creating many entities at once (e.g. placing 100 tree instances): it avoids waiting for each action's result and lets the editor refresh the UI once at the end. " +
				"Each action is `{ tool, arguments }` where `tool` is the name of any other MCP tool (e.g. `create_instance`, `set_node_transform`) and `arguments` are that tool's input fields. " +
				"By default it stops at the first error; set `continueOnError` to keep going. Returns one result per action.",
			inputSchema: z.object({
				actions: z
					.array(
						z.object({
							tool: z.string().describe("Name of the MCP tool to invoke, e.g. `create_primitive_mesh`, `create_instance`, `set_material_properties`."),
							arguments: z.record(z.string(), z.any()).describe("The input fields for that tool, exactly as you would pass to the standalone tool."),
						})
					)
					.describe("Ordered list of actions to execute."),
				continueOnError: z.boolean().optional().describe("If true, keep executing remaining actions after one fails. Default false (stop on first error)."),
			}),
		},
		async ({ actions, continueOnError }): Promise<CallToolResult> => {
			const editorActions = actions.map((action) => ({
				endpoint: action.tool,
				data: action.arguments,
			}));

			return callTextTool("execute_batch", {
				actions: editorActions,
				continueOnError,
			});
		}
	);
}
