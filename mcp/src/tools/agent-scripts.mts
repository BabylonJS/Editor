import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerAgentScriptTools(server: McpServer): void {
	server.registerTool(
		"get_editor_api",
		{
			title: "Get editor automation API",
			description:
				"Return a reference describing the `editor` mediator object that agent automation scripts receive. " +
				"ALWAYS call this before writing or running an agent script (`write_agent_script`/`run_agent_script`) so you know what `editor` exposes " +
				"(the live Babylon scene at `editor.layout.preview.scene`, the scene graph, inspector, assets browser, console, etc.) and the required `export function main(editor) { ... }` skeleton.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("get_editor_api", args)
	);

	server.registerTool(
		"write_agent_script",
		{
			title: "Write agent automation script",
			description:
				"Write (or overwrite) a JavaScript automation script into the project's `agentdata/` folder (at the project root). " +
				"The script MUST export `main(editor)` (see `get_editor_api`). These scripts run INSIDE the editor with full access to the `editor` mediator and the live Babylon scene — " +
				"use them for COMPLEX or VOLUMINOUS tasks the individual tools can't easily express: custom/procedural geometry, algorithmic scattering (forests, cities), bulk programmatic edits. " +
				"For ordinary scene building, prefer the dedicated tools. After writing, execute it with `run_agent_script`.",
			inputSchema: z.object({
				name: z.string().describe('Script file name under `agentdata/`, e.g. `forest.js` (a `.js` extension is added if missing; subfolders allowed, no "..").'),
				content: z.string().describe("The full JavaScript source. Must contain `export function main(editor) { ... }`."),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("write_agent_script", args)
	);

	server.registerTool(
		"run_agent_script",
		{
			title: "Run agent automation script",
			description:
				"Compile and execute an `agentdata/` automation script by calling its `main(editor)` export inside the editor. " +
				"Pass an existing script `name`, or inline `content` to write-and-run in one step. The script can be async and may return a short summary string that is returned to you. " +
				"Changes are reflected live in the editor. Read `get_editor_api` first to know what the `editor` object can do.",
			inputSchema: z.object({
				name: z.string().optional().describe("Name/path of the script under `agentdata/` to run."),
				content: z.string().optional().describe("Optional inline JavaScript source. If provided, it is written to `agentdata/<name>` (or a default name) then executed."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("run_agent_script", args)
	);

	server.registerTool(
		"list_agent_scripts",
		{
			title: "List agent automation scripts",
			description: "List the `.js` automation scripts currently stored in the project's `agentdata/` folder.",
			inputSchema: z.object({}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("list_agent_scripts", args)
	);
}
