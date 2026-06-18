import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { callTextTool } from "./helpers.mjs";

export function registerRenderingTools(server: McpServer): void {
	server.registerTool(
		"get_camera_post_processes",
		{
			title: "Get camera post-processes",
			description:
				"Read the post-process / rendering pipeline configurations attached to a camera: `default` (bloom, tone mapping, FXAA, vignette, depth of field, chromatic aberration, grain, sharpen, glow, color grading/curves), " +
				"`ssao` (ambient occlusion), `ssr` (screen-space reflections), `motionBlur`, `vls` (volumetric light scattering) and `taa` (temporal anti-aliasing). " +
				"Each entry is the post-process config object, or null when that post-process is disabled for the camera. Use this before `set_camera_post_process` to read current values.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target camera (preferred). Get it from `get_scene_hierarchy`."),
				nodeName: z.string().optional().describe("Name of the target camera."),
			}),
			annotations: { readOnlyHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("get_camera_post_processes", args)
	);

	server.registerTool(
		"set_camera_post_process",
		{
			title: "Set camera post-process",
			description:
				"Enable, disable and customize a per-camera post-process in realtime. IMPORTANT: post-processes are per-camera, so this switches the editor's active camera to the target camera " +
				"so the effect is set up on it and will be available at runtime in the game. Pass `enabled:false` to remove the post-process. " +
				"Pass `properties` (a flat map) to configure it; create the post-process first by calling with `enabled:true`. " +
				"Examples — type `default`: `{ bloomEnabled:true, bloomWeight:0.6, toneMappingEnabled:true, toneMappingType:1, exposure:1.2, vignetteEnabled:true, depthOfFieldEnabled:true, fStop:1.4, focusDistance:55000, fxaaEnabled:true, grainEnabled:true, grainIntensity:15, chromaticAberrationEnabled:true }`; " +
				"type `ssao`: `{ radius:2, totalStrength:1, samples:16 }`; type `ssr`: `{ strength:1, thickness:0.5, samples:16 }`; type `motionBlur`: `{ motionStrength:1, isObjectBased:true }`; type `vls`: `{ exposure:0.3, decay:0.96, weight:0.4, density:0.9 }`. " +
				"Returns the resulting config. Verify the look with `get_screenshot`.",
			inputSchema: z.object({
				nodeId: z.string().optional().describe("Id of the target camera (preferred)."),
				nodeName: z.string().optional().describe("Name of the target camera."),
				type: z.enum(["default", "ssao", "ssr", "motionBlur", "vls", "taa"]).describe("Which post-process / rendering pipeline to configure."),
				enabled: z.boolean().optional().describe("Enable (create if missing) or disable (remove) the post-process for this camera. Defaults to true."),
				properties: z
					.record(z.string(), z.any())
					.optional()
					.describe(
						"Flat map of post-process properties to set. Keys depend on `type` (see the examples in this tool's description). Arrays are coerced to colors/vectors where relevant."
					),
			}),
			annotations: { idempotentHint: true },
		},
		async (args): Promise<CallToolResult> => callTextTool("set_camera_post_process", args)
	);
}
