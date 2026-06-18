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
import { registerSoundTools } from "./tools/sounds.mjs";
import { registerAnimationTools } from "./tools/animations.mjs";
import { registerMarketplaceTools } from "./tools/marketplace.mjs";
import { registerScriptTools } from "./tools/scripts.mjs";
import { registerAgentScriptTools } from "./tools/agent-scripts.mjs";
import { registerVerificationTools } from "./tools/verification.mjs";
import { registerBatchTools } from "./tools/batch.mjs";

const server = new McpServer(
	{
		name: "babylonjs-editor-mcp",
		version: packageJson.version,
	},
	{
		instructions: [
			"This MCP drives the Babylon.js Editor to build real games and 3D scenes. The user watches every action happen live in the editor and will continue editing the result BY HAND afterwards.",
			"",
			"#1 RULE — AUTHOR THE SCENE WITH EDITOR TOOLS, DON'T CODE IT IN SCRIPTS:",
			"Everything you build must exist as real, hand-editable editor content (meshes, materials, instances, lights, cameras, particles, physics) — NOT as geometry/materials generated procedurally inside attached scripts. The whole point is that the user can reopen the project and tweak the assets you created.",
			"- DO build scene content with tools: `create_primitive_mesh`, `instantiate_mesh_asset` (and the marketplace tools) for geometry; `create_material` + `set_material_properties` + `assign_texture_to_material` for looks; `create_instance` for repetition; `create_light`/`create_camera`; `set_mesh_physics` for bodies; `instantiate_particle_system` for effects.",
			"- DO NOT clear or wipe the scene, and DO NOT create empty/placeholder meshes that a script then fills in with geometry. That produces an empty, un-editable project — exactly what to avoid.",
			"- DO NOT recreate, at runtime in code, things the editor can author: no building meshes/geometry, materials, lighting, or whole levels from scratch inside scripts. If you typed `new Mesh`, `MeshBuilder`, `new StandardMaterial`, etc. in a script to build the scene, you are doing it wrong — author it with tools instead.",
			"- For repetitive worlds (Minecraft blocks, voxels, tiles, forests): create ONE real source mesh + material with the tools, then place many copies with `create_instance` (`count`/`transforms`, batched). Use `get_mesh_bounding_info` to size/space them.",
			"",
			"COMMON RECIPES — compose the tools to build WebGL game content (these are examples; generalize them):",
			"- Forest / vegetation: import ONE tree with `instantiate_mesh_asset` (or download via the marketplace), read its size with `get_mesh_bounding_info`, then `create_instance` with scattered `transforms` (vary position + random Y rotation + slight scale). Add rocks/bushes/grass the same way. A few source meshes → thousands of instances.",
			"- Ground / terrain: `create_primitive_mesh ground` → `create_material pbr` → `assign_texture_to_material` (albedo + bump/normal + metallic/roughness) → tile the textures via `set_material_properties` (`albedoTexture.uScale`/`vScale`) → give it a static physics body with `set_mesh_physics` so things collide with it.",
			"- Sky & global lighting: `set_environment_texture` from a `.env`/`.hdr` cube (with `createSkybox`) for the backdrop AND image-based ambient light → add a `directional` `create_light` as the sun and enable `set_light_shadows` on it → put extra fill/point/spot lights into the ClusteredLightContainer.",
			"- Procedural sky / day-night (no HDR): create a `skybox` mesh + a `sky` material (`create_material`), assign it, then control the sun/time-of-day via `set_material_properties` (`inclination`, `azimuth`, `luminance`, `turbidity`). Use `list_material_types` to see all Materials Library effects (water, lava, fire, toon/cell, grid, gradient, triplanar).",
			"- Voxel / Minecraft world: make one cube mesh + one material per block type (clone the material per type), then `create_instance` over a grid of `transforms` for the blocks (batched). Different block types = a source cube per type + its instances. Author a representative chunk as real assets; only stream additional chunks from those authored prefabs in a script if the world is huge.",
			"- Modular building / level: create or import wall/floor/roof/door modules ONCE, place them with instances on a grid, and group each room/building under an `empty` transform node so the hierarchy is tidy and hand-editable.",
			"- Props, pickups & gameplay objects: import/instance the prop, give dynamic ones a `set_mesh_physics` body (box/capsule), then attach a small behavior script (pickup, damage, button) that references the authored mesh.",
			"- Player / character: import a character mesh, add a `dynamic` capsule body with `set_mesh_physics`, create/position a `create_camera`, then attach a movement/input script that drives the AUTHORED mesh and camera.",
			"- Water / effects: use a `water` material on a plane for lakes/rivers; use `instantiate_particle_system` for fire, smoke, sparks, magic, weather.",
			"- Mood & quality: `set_active_camera`, then `set_camera_post_process` on it — `default` for tone mapping + bloom + vignette + depth of field, `ssao` for contact shadows. A sunset = warm directional light color + tuned sky/skybox material.",
			"",
			"WHEN SCRIPTS ARE APPROPRIATE (and only then):",
			"- Scripts (`create_script`/`write_script`/`attach_script`) are ONLY for runtime BEHAVIOR/logic that cannot be authored as static content: player input & movement, game rules, AI, scoring, reacting to collisions, opening doors, runtime spawning, etc.",
			"- Scripts should reference the assets you already authored (via exported inspector values set with `set_script_exported_value`, or by name/id) rather than building visuals from scratch.",
			"- If a huge/streamed world genuinely must spawn content at runtime, first author the building-block meshes/materials as real assets, then have the script instantiate copies of THOSE authored assets.",
			"",
			"TWO DIFFERENT KINDS OF SCRIPTS — DON'T CONFUSE THEM:",
			"1) BEHAVIOR scripts (`create_script`/`write_script`/`attach_script`, under `src/`, implement `IScript` onStart/onUpdate/onStop) run in the FINAL GAME and define runtime behavior (input, rules, AI). Covered above.",
			"2) AGENT AUTOMATION scripts (`write_agent_script`/`run_agent_script`, under `agentdata/`, export `main(editor)`) run NOW INSIDE THE EDITOR to BUILD content. Use them when a task is too complex or too voluminous for the individual tools — custom/procedural geometry, algorithmic scattering (procedural forests, cities, dungeons), bulk programmatic edits. They have full access to the `editor` mediator and the live scene; whatever they create becomes real, hand-editable editor content (NOT runtime code). Call `get_editor_api` first to learn what `editor` exposes, then `write_agent_script` + `run_agent_script`. Still prefer the dedicated tools for ordinary building; reach for automation scripts for the heavy/algorithmic parts.",
			"",
			"PERFORMANCE — BATCH AS MUCH AS POSSIBLE:",
			"- Prefer `execute_batch` to run many actions in a single round-trip instead of calling tools one by one. The editor refreshes its UI once per batch, so batching is dramatically faster for anything beyond a couple of actions (building rooms, scattering props, placing many lights/blocks).",
			"- Group independent work (create 200 blocks, set 50 materials) into one `execute_batch` call. Only split when a later action needs an id returned by an earlier one.",
			"- For many copies of the same mesh, `create_instance` already creates N instances in one call; prefer it over many separate creations.",
			"",
			"CORRECTNESS & STYLE RULES:",
			"- Prefer `create_instance` over `clone_mesh`; clone only when a copy needs a different material. Instances share the source mesh's parent so the hierarchy stays readable.",
			"- Non-shadow-casting lights belong in the ClusteredLightContainer (`add_light_to_clustered_container`).",
			"- Units are centimeters; imported glTF/GLB assets are auto-scaled ×100. New TypeScript scripts must live under `src/`.",
			"- Give gameplay objects physics with `set_mesh_physics`; configure collisions and any other deep property via `set_node_properties`.",
			"- Reach for real assets first: check existing project assets with `list_assets`/`get_asset_preview`, and download richer ones through the visible marketplace tools (never background APIs).",
			"- Read the scene before changing it (`get_scene_hierarchy`, `get_active_scene`) and ADD to it; preserve what the user already has unless they ask otherwise. Verify the result visually with `get_screenshot`.",
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
registerSoundTools(server);
registerAnimationTools(server);
registerMarketplaceTools(server);
registerScriptTools(server);
registerAgentScriptTools(server);
registerVerificationTools(server);
registerBatchTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[Babylon.js Editor MCP] Server started");
