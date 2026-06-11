import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerLightTools(server: McpServer): void {
	server.registerTool(
		"create_light",
		{
			title: "Create light",
			description:
				"Create a light (directional, point, spot or hemispheric). Positions are in centimeters; `color` is `[r,g,b]` (0..1). " +
				"PERFORMANCE RULE: only lights that CAST SHADOWS should be regular scene lights (e.g. the sun as a directional light with a shadow generator). " +
				"Every light that does NOT cast shadows (street lamps, decorative point lights, etc.) must be placed in the scene's ClusteredLightContainer — create it with `create_clustered_light_container` and move lights into it with `add_light_to_clustered_container`. " +
				"For a sunset, create a directional light with a warm color and tune its intensity/direction, then verify with `get_screenshot`.",
			inputSchema: z.object({
				type: z.enum(["directional", "point", "spot", "hemispheric"]).describe("The light type."),
				name: z.string().optional().describe("Name for the new light."),
				parentId: z
					.string()
					.optional()
					.describe(
						"Id of the parent node. To add a non-shadow light directly under the clustered container, pass its id here or use `add_light_to_clustered_container` afterwards."
					),
				position: z.array(z.number()).length(3).optional().describe("World position `[x,y,z]` in centimeters (point/spot)."),
				direction: z.array(z.number()).length(3).optional().describe("Direction `[x,y,z]` (directional/spot/hemispheric)."),
				color: z.array(z.number()).length(3).optional().describe("Diffuse color `[r,g,b]` in 0..1."),
				intensity: z.number().optional().describe("Light intensity."),
				range: z.number().optional().describe("Range in centimeters (point/spot)."),
				angle: z.number().optional().describe("Cone angle in radians (spot)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("create_light", args)
	);

	server.registerTool(
		"set_light_shadows",
		{
			title: "Set light shadows",
			description:
				"Enable or disable a shadow generator on a light and configure it. A light that casts shadows must remain a regular scene light (the ClusteredLightContainer does not support shadow-casting lights). " +
				"Typically used for the sun/key directional light.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target light (preferred)."),
				nodeName: z.string().optional().describe("Name of the target light."),
				enabled: z.boolean().describe("Whether the light casts shadows."),
				mapSize: z.number().optional().describe("Shadow map resolution (e.g. 1024, 2048)."),
				useBlurExponentialShadowMap: z.boolean().optional().describe("Use a blurred exponential shadow map for softer shadows."),
				darkness: z.number().optional().describe("Shadow darkness (0..1)."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("set_light_shadows", args)
	);

	server.registerTool(
		"create_clustered_light_container",
		{
			title: "Create clustered light container",
			description:
				"Create the scene's ClusteredLightContainer if it does not already exist. This is the performance-friendly home for all NON-shadow-casting lights. " +
				"Create it once, then add lights with `add_light_to_clustered_container`.",
			inputSchema: z.object({}),
		},
		async (args): Promise<CallToolResult> => callTextTool("create_clustered_light_container", args)
	);

	server.registerTool(
		"add_light_to_clustered_container",
		{
			title: "Add light to clustered container",
			description:
				"Move a non-shadow-casting light into the scene's ClusteredLightContainer for performance (e.g. many street lights in a city scene). " +
				"Do NOT add shadow-casting lights here — the container does not support them; keep those as regular scene lights.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the light to move (preferred)."),
				nodeName: z.string().optional().describe("Name of the light to move."),
			}),
		},
		async (args): Promise<CallToolResult> => callTextTool("add_light_to_clustered_container", args)
	);
}
