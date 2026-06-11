import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerParticleTools(server: McpServer): void {
	server.registerTool(
		"list_particle_assets",
		{
			title: "List particle assets",
			description: "List the `.npss` node particle system assets available in the project. Use `instantiate_particle_system` to bring one into the scene.",
			inputSchema: z.object({}),
		},
		async (args): Promise<CallToolResult> => callTextTool("list_particle_assets", args)
	);

	server.registerTool(
		"instantiate_particle_system",
		{
			title: "Instantiate particle system",
			description:
				"Instantiate a `.npss` particle system asset into the scene, or create a default one when no `path` is given. Optionally attach it to an emitter node and position it (centimeters). " +
				"Good for effects like fire, smoke, sparks or rain.",
			inputSchema: z.object({
				path: z.string().optional().describe("Project-relative or absolute path to the `.npss` asset. Omit to create a default particle system."),
				name: z.string().optional().describe("Name for the created particle system."),
				emitterNodeId: z.string().optional().describe("Id of the node to use as the emitter."),
				position: z.array(z.number()).length(3).optional().describe("World position `[x,y,z]` in centimeters when no emitter node is set."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("instantiate_particle_system", args)
	);
}
