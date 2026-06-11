import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import packageJson from "../package.json" with { type: "json" };

import { registerSceneTools } from "./tools/scene.mjs";
import { registerNodeTools } from "./tools/nodes.mjs";
import { registerMeshTools } from "./tools/meshes.mjs";
import { registerLightTools } from "./tools/lights.mjs";
import { registerCameraTools } from "./tools/cameras.mjs";
import { registerRenderingTools } from "./tools/rendering.mjs";
import { registerMaterialTools } from "./tools/materials.mjs";
import { registerAssetTools } from "./tools/assets.mjs";
import { registerParticleTools } from "./tools/particles.mjs";
import { registerMarketplaceTools } from "./tools/marketplace.mjs";
import { registerScriptTools } from "./tools/scripts.mjs";
import { registerVerificationTools } from "./tools/verification.mjs";
import { registerBatchTools } from "./tools/batch.mjs";

const server = new McpServer(
	{
		name: "babylonjs-editor-mcp",
		version: packageJson.version,
	},
	{
		instructions: [
			"This MCP drives the Babylon.js Editor to build real games and 3D scenes. The user watches every action happen live in the editor.",
			"",
			"PERFORMANCE — BATCH AS MUCH AS POSSIBLE:",
			"- Prefer `execute_batch` to run many actions in a single round-trip instead of calling tools one by one. The editor also refreshes its UI once per batch, so batching is dramatically faster for anything beyond a couple of actions (building rooms, scattering props, placing many lights, etc.).",
			"- When the work is independent (e.g. create 200 trees, set 50 materials), group it all into one `execute_batch` call. Only split into separate calls when a later action needs an id returned by an earlier one.",
			"- For many copies of the same mesh, `create_instance` already creates N instances in one call (pass `count`/`transforms`); use `get_mesh_bounding_info` to space them without overlap.",
			"",
			"CORRECTNESS & STYLE RULES:",
			"- Prefer `create_instance` over `clone_mesh`; clone only when a copy needs a different material. Instances share the source mesh's parent so the hierarchy stays readable.",
			"- Non-shadow-casting lights belong in the ClusteredLightContainer (`add_light_to_clustered_container`).",
			"- Units are centimeters; imported glTF/GLB assets are auto-scaled ×100. New TypeScript scripts must live under `src/`.",
			"- Give gameplay objects physics with `set_mesh_physics` and behavior with scripts (`create_script` + `attach_script`). Configure collisions and any other deep property via `set_node_properties`.",
			"- Download assets through the visible marketplace tools, never background APIs. Verify the result visually with `get_screenshot` and check an asset's `editor_preview` with `get_asset_preview` before using it.",
		].join("\n"),
	}
);

registerSceneTools(server);
registerNodeTools(server);
registerMeshTools(server);
registerLightTools(server);
registerCameraTools(server);
registerRenderingTools(server);
registerMaterialTools(server);
registerAssetTools(server);
registerParticleTools(server);
registerMarketplaceTools(server);
registerScriptTools(server);
registerVerificationTools(server);
registerBatchTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[Babylon.js Editor MCP] Server started");
