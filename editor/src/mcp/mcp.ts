import { createServer } from "http";

import { Scene } from "babylonjs";

import { Editor } from "../editor/main";

import { IMCPActionOptions } from "./action";

import { getSceneHierarchy } from "./scene/hierarchy";
import { listScenes, getActiveScene, saveScene, getSceneSettings, setSceneSettings } from "./scene/scene";

import { getNode, setNodeTransform, setNodeProperties, setNodeParent, renameNode, deleteNode, selectNode } from "./nodes/nodes";
import { createPrimitiveMesh, createInstance, cloneMesh, setMeshMaterial, setMeshVisibility } from "./meshes/meshes";
import { createLight, setLightShadows, createClusteredLightContainer, addLightToClusteredContainer } from "./lights/lights";
import { createCamera, setActiveCamera } from "./cameras/cameras";
import { listMaterials, createMaterial, setMaterialProperties, assignTextureToMaterial, setEnvironmentTexture } from "./materials/materials";
import { listAssets, getAssetPreview, instantiateMeshAsset } from "./assets/assets";
import { listParticleAssets, instantiateParticleSystem } from "./particles/particles";
import { openMarketplace, searchMarketplace, downloadMarketplaceAsset } from "./marketplace/marketplace";
import { listScripts, createScript, readScript, writeScript, attachScript, listAttachedScripts, setScriptExportedValue, detachScript } from "./scripts/scripts";
import { getScreenshot, focusNode, runProject } from "./screenshot";
import { createBatchHandler } from "./batch";

export interface IEditorMCPDataType {
	endpoint: string;
	[index: string]: any;
}

/**
 * The port the editor MCP HTTP server listens on.
 */
export const MCPServerPort = 3712;

/**
 * Map of all the MCP endpoints to their handler.
 * Each handler has the signature `(scene, data, options) => any | Promise<any>`.
 */
export const MCPEndpoints: Record<string, (scene: Scene, data: any, options: IMCPActionOptions) => any> = {
	// Scene & project
	get_scene_hierarchy: (scene, data) => getSceneHierarchy(scene, data.rootNodeName),
	list_scenes: listScenes,
	get_active_scene: getActiveScene,
	save_scene: saveScene,
	get_scene_settings: getSceneSettings,
	set_scene_settings: setSceneSettings,

	// Node generic operations
	get_node: getNode,
	set_node_transform: setNodeTransform,
	set_node_properties: setNodeProperties,
	set_node_parent: setNodeParent,
	rename_node: renameNode,
	delete_node: deleteNode,
	select_node: selectNode,

	// Meshes
	create_primitive_mesh: createPrimitiveMesh,
	create_instance: createInstance,
	clone_mesh: cloneMesh,
	set_mesh_material: setMeshMaterial,
	set_mesh_visibility: setMeshVisibility,

	// Lights & shadows
	create_light: createLight,
	set_light_shadows: setLightShadows,
	create_clustered_light_container: createClusteredLightContainer,
	add_light_to_clustered_container: addLightToClusteredContainer,

	// Cameras
	create_camera: createCamera,
	set_active_camera: setActiveCamera,

	// Materials & textures
	list_materials: listMaterials,
	create_material: createMaterial,
	set_material_properties: setMaterialProperties,
	assign_texture_to_material: assignTextureToMaterial,
	set_environment_texture: setEnvironmentTexture,

	// Assets browser
	list_assets: listAssets,
	get_asset_preview: getAssetPreview,
	instantiate_mesh_asset: instantiateMeshAsset,

	// Particle systems
	list_particle_assets: listParticleAssets,
	instantiate_particle_system: instantiateParticleSystem,

	// Marketplace
	open_marketplace: openMarketplace,
	search_marketplace: searchMarketplace,
	download_marketplace_asset: downloadMarketplaceAsset,

	// Scripts
	list_scripts: listScripts,
	create_script: createScript,
	read_script: readScript,
	write_script: writeScript,
	attach_script: attachScript,
	list_attached_scripts: listAttachedScripts,
	set_script_exported_value: setScriptExportedValue,
	detach_script: detachScript,

	// Verification & utility
	get_screenshot: getScreenshot,
	focus_node: focusNode,
	run_project: runProject,
};

// Batch endpoint reuses the same handlers from the map above.
MCPEndpoints.execute_batch = createBatchHandler(MCPEndpoints);

/**
 * Initializes the editor MCP HTTP server.
 * Resilient: if the port is already in use (e.g. a second editor window), the error is caught
 * and logged in the editor console instead of crashing the application.
 * @param editor defines the reference to the editor.
 */
export function initializeMcpServer(editor: Editor): void {
	const server = createServer(async (req, res) => {
		let data: IEditorMCPDataType;
		try {
			data = await new Promise<IEditorMCPDataType>((resolve, reject) => {
				let body = "";

				req.on("data", (chunk) => (body += chunk));
				req.on("end", () => resolve(JSON.parse(body)));
				req.on("error", reject);
			});
		} catch (e) {
			res.writeHead(400);
			res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
			return;
		}

		const action = MCPEndpoints[data.endpoint];

		if (!action) {
			res.writeHead(404);
			res.end(JSON.stringify({ error: `Unknown endpoint: ${data.endpoint}` }));
			return;
		}

		try {
			const result = await action(editor.layout.preview.scene, data, { editor });

			res.writeHead(200);
			res.end(JSON.stringify(result ?? null));
		} catch (e) {
			res.writeHead(500);
			res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
		}
	});

	server.on("error", (e) => {
		editor.layout.console.error(`MCP Server failed to start: ${e instanceof Error ? e.message : String(e)}`);
	});

	server.listen(MCPServerPort, "127.0.0.1", () => {
		editor.layout.console.log(`MCP Server is listening on port ${MCPServerPort}`);
	});
}
