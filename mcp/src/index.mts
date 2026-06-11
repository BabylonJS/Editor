import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import packageJson from "../package.json" with { type: "json" };

import { registerSceneTools } from "./tools/scene.mjs";
import { registerNodeTools } from "./tools/nodes.mjs";
import { registerMeshTools } from "./tools/meshes.mjs";
import { registerLightTools } from "./tools/lights.mjs";
import { registerCameraTools } from "./tools/cameras.mjs";
import { registerMaterialTools } from "./tools/materials.mjs";
import { registerAssetTools } from "./tools/assets.mjs";
import { registerParticleTools } from "./tools/particles.mjs";
import { registerMarketplaceTools } from "./tools/marketplace.mjs";
import { registerScriptTools } from "./tools/scripts.mjs";
import { registerVerificationTools } from "./tools/verification.mjs";
import { registerBatchTools } from "./tools/batch.mjs";

const server = new McpServer({
	name: "babylonjs-editor-mcp",
	version: packageJson.version,
});

registerSceneTools(server);
registerNodeTools(server);
registerMeshTools(server);
registerLightTools(server);
registerCameraTools(server);
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
