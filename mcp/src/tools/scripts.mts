import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerScriptTools(server: McpServer): void {
	server.registerTool(
		"list_scripts",
		{
			title: "List scripts",
			description: "List the TypeScript scripts under the project's `src/` folder. Scripts implement behaviors (`onStart`/`onUpdate`/`onStop`) and are attached to nodes.",
			inputSchema: z.object({}),
		},
		async (args): Promise<CallToolResult> => callTextTool("list_scripts", args)
	);

	server.registerTool(
		"create_script",
		{
			title: "Create script",
			description:
				"Create a new TypeScript script using the editor's default skeleton. The path MUST live under `src/**` (scripts outside `src/` are not valid editor scripts). " +
				"After creating, edit it with `write_script` and attach it to a node with `attach_script`.",
			inputSchema: z.object({
				path: z.string().describe("Project path for the new script under `src/`, e.g. `src/door.ts`."),
				className: z.string().optional().describe("Optional class name to use in the skeleton."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("create_script", args)
	);

	server.registerTool(
		"read_script",
		{
			title: "Read script",
			description: "Read the content of a TypeScript script file. Use before `write_script` to make incremental edits without losing existing code.",
			inputSchema: z.object({
				path: z.string().describe("Project path of the script under `src/`."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("read_script", args)
	);

	server.registerTool(
		"write_script",
		{
			title: "Write script",
			description:
				"Overwrite a script's content. The file must be under `src/**`. Implement behaviors with the editor's `IScript` interface (`onStart`/`onUpdate`/`onStop`) and export inspector-editable values where it helps reuse. " +
				"Example: a door that opens when the player is near checks distance in `onUpdate` and plays an animation.",
			inputSchema: z.object({
				path: z.string().describe("Project path of the script under `src/`."),
				content: z.string().describe("The full new content of the script file."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("write_script", args)
	);

	server.registerTool(
		"attach_script",
		{
			title: "Attach script",
			description:
				"Attach a script file to a node (the scene itself can also have scripts). This writes the node's script metadata exactly as the inspector's Scripts section does, so the attachment is visible to the user.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				path: z.string().describe("Project path of the script under `src/` to attach."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("attach_script", args)
	);

	server.registerTool(
		"list_attached_scripts",
		{
			title: "List attached scripts",
			description:
				"List the scripts attached to a node along with their exported inspector values. Use this to discover which exported values you can tune with `set_script_exported_value`.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("list_attached_scripts", args)
	);

	server.registerTool(
		"set_script_exported_value",
		{
			title: "Set script exported value",
			description:
				"Set an exported/inspector value of a script attached to a node. This lets you configure the same reusable script differently per object (e.g. open distance, speed).",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				path: z.string().describe("Project path of the attached script."),
				key: z.string().describe("Name of the exported value to set."),
				value: z.any().describe("The new value."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_script_exported_value", args)
	);

	server.registerTool(
		"detach_script",
		{
			title: "Detach script",
			description: "Remove an attached script from a node.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target node (preferred)."),
				nodeName: z.string().optional().describe("Name of the target node."),
				path: z.string().describe("Project path of the attached script to remove."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("detach_script", args)
	);
}
