import { Server } from "http";

import { Observable, Scene } from "babylonjs";

import { Editor } from "../editor/main";

import { IMCPActionOptions } from "./action";

import { getSceneHierarchy } from "./scene/hierarchy";
import { listScenes, getActiveScene, saveScene, getSceneSettings, setSceneSettings } from "./scene/scene";

import { getNode, setNodeTransform, setNodeProperties, setNodeParent, renameNode, deleteNode, selectNode, getSelectedNodes } from "./nodes/nodes";
import { createPrimitiveMesh, createInstance, cloneMesh, setMeshMaterial, setMeshVisibility, setMeshPhysics, getMeshBoundingInfo } from "./meshes/meshes";
import { createDecal, updateDecal } from "./meshes/decals";
import {
	getTerrainInfo,
	createTerrain,
	sculptTerrain,
	paintTerrain,
	generateTerrain,
	modifyTerrain,
	importTerrainHeightmapEndpoint,
	exportTerrainHeightmapEndpoint,
	sampleTerrain,
	snapNodesToTerrain,
} from "./terrain/terrain";
import { setTerrainLayer, setTerrainMaterial } from "./terrain/layers";
import { listTerrainBrushes } from "./terrain/brushes";
import { createLight, setLightShadows, removeLightShadows, createClusteredLightContainer, addLightToClusteredContainer, removeLightFromClusteredContainer } from "./lights/lights";
import { createCamera, setActiveCamera } from "./cameras/cameras";
import { getCameraPostProcesses, setCameraPostProcess } from "./rendering/post-process";
import { listMaterials, listMaterialTypes, createMaterial, setMaterialProperties, assignTextureToMaterial, setEnvironmentTexture } from "./materials/materials";
import { listAssets, getAssetPreview, instantiateMeshAsset } from "./assets/assets";
import { importAsset, reloadAssetEndpoint } from "./assets/import";
import { listParticleAssets, instantiateParticleSystem } from "./particles/particles";
import { listSoundAssets, createSound, setSoundProperties } from "./sounds/sounds";
import { listAnimationGroups, playAnimationGroup, stopAnimationGroup, createAnimation, deleteAnimationGroup } from "./animations/animations";
import { openMarketplaceAndSelectAsset, openMarketplaceAndSearch, downloadMarketplaceAsset } from "./marketplace/marketplace";
import { listScripts, createScript, readScript, writeScript, attachScript, listAttachedScripts, setScriptExportedValue, detachScript } from "./scripts/scripts";
import { writeAgentScript, runAgentScript, listAgentScripts, getEditorApi } from "./scripts/editor-scripts";
import { getScreenshot, focusNode, runProject } from "./screenshot";
import { playScene, stopScene, simulateInput, inspectPlayScene, getConsoleLogs } from "./play/play";
import { createBatchHandler } from "./batch";
import { createMCPRequestListener, listenMCPServer } from "./server";

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
	get_selected_nodes: getSelectedNodes,

	// Meshes
	create_primitive_mesh: createPrimitiveMesh,
	create_instance: createInstance,
	clone_mesh: cloneMesh,
	set_mesh_material: setMeshMaterial,
	set_mesh_visibility: setMeshVisibility,
	set_mesh_physics: setMeshPhysics,
	get_mesh_bounding_info: getMeshBoundingInfo,

	// Decals
	create_decal: createDecal,
	update_decal: updateDecal,

	// Terrains (sculpting and painting grounds, on the same engine as the Terrain tab)
	get_terrain_info: getTerrainInfo,
	create_terrain: createTerrain,
	sculpt_terrain: sculptTerrain,
	paint_terrain: paintTerrain,
	set_terrain_layer: setTerrainLayer,
	generate_terrain: generateTerrain,
	modify_terrain: modifyTerrain,
	import_terrain_heightmap: importTerrainHeightmapEndpoint,
	export_terrain_heightmap: exportTerrainHeightmapEndpoint,
	list_terrain_brushes: listTerrainBrushes,
	sample_terrain: sampleTerrain,
	snap_nodes_to_terrain: snapNodesToTerrain,
	set_terrain_material: setTerrainMaterial,

	// Lights & shadows
	create_light: createLight,
	set_light_shadows: setLightShadows,
	remove_light_shadows: removeLightShadows,
	create_clustered_light_container: createClusteredLightContainer,
	add_light_to_clustered_container: addLightToClusteredContainer,
	remove_light_from_clustered_container: removeLightFromClusteredContainer,

	// Cameras
	create_camera: createCamera,
	set_active_camera: setActiveCamera,

	// Camera post-processes / rendering pipelines
	get_camera_post_processes: getCameraPostProcesses,
	set_camera_post_process: setCameraPostProcess,

	// Materials & textures
	list_materials: listMaterials,
	list_material_types: listMaterialTypes,
	create_material: createMaterial,
	set_material_properties: setMaterialProperties,
	assign_texture_to_material: assignTextureToMaterial,
	set_environment_texture: setEnvironmentTexture,

	// Assets browser
	list_assets: listAssets,
	get_asset_preview: getAssetPreview,
	instantiate_mesh_asset: instantiateMeshAsset,
	import_asset: importAsset,
	reload_asset: reloadAssetEndpoint,

	// Particle systems
	list_particle_assets: listParticleAssets,
	instantiate_particle_system: instantiateParticleSystem,

	// Sounds
	list_sound_assets: listSoundAssets,
	create_sound: createSound,
	set_sound_properties: setSoundProperties,

	// Animations
	list_animation_groups: listAnimationGroups,
	play_animation_group: playAnimationGroup,
	stop_animation_group: stopAnimationGroup,
	create_animation: createAnimation,
	delete_animation_group: deleteAnimationGroup,

	// Marketplace
	open_marketplace: openMarketplaceAndSelectAsset,
	search_marketplace: openMarketplaceAndSearch,
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

	// Agent automation scripts (.js run in the editor via main(editor))
	get_editor_api: getEditorApi,
	write_agent_script: writeAgentScript,
	run_agent_script: runAgentScript,
	list_agent_scripts: listAgentScripts,

	// Verification & utility
	get_screenshot: getScreenshot,
	focus_node: focusNode,
	run_project: runProject,

	// Play-testing the game in the preview
	play_scene: playScene,
	stop_scene: stopScene,
	simulate_input: simulateInput,
	inspect_play_scene: inspectPlayScene,
	get_console_logs: getConsoleLogs,
};

// Batch endpoint reuses the same handlers from the map above.
MCPEndpoints.execute_batch = createBatchHandler(MCPEndpoints);

export interface IEditorMcpServerOptions {
	/**
	 * Defines the port to listen on. 0 lets the system pick a free port.
	 * @default MCPServerPort
	 */
	port?: number;
	/**
	 * Defines the token every request must send in the "x-babylonjs-editor-token" header. Null accepts every request.
	 */
	token?: string | null;
}

export interface IEditorMcpServer {
	/**
	 * Defines the port the server listens on, on the loopback interface.
	 */
	readonly port: number;
	/**
	 * Defines the token every request must send, if any.
	 */
	readonly token: string | null;
	/**
	 * Notified with the name of the endpoint each time a tool starts being handled.
	 */
	readonly onRequestObservable: Observable<string>;
	/**
	 * Notified with the name of the endpoint and wether it succeeded each time a tool was handled.
	 */
	readonly onResponseObservable: Observable<{ endpoint: string; succeeded: boolean }>;
	/**
	 * Stops listening.
	 */
	close(): Promise<void>;
}

/**
 * Starts the HTTP server the MCP server of the editor sends the tools it receives to. It only listens on the
 * loopback interface, and rejects every request sent by a web page.
 * @param editor defines the reference to the editor.
 * @param options defines the port to listen on and the token requests must send.
 */
export async function startMcpServer(editor: Editor, options: IEditorMcpServerOptions = {}): Promise<IEditorMcpServer> {
	const token = options.token ?? null;

	const onRequestObservable = new Observable<string>();
	const onResponseObservable = new Observable<{ endpoint: string; succeeded: boolean }>();

	const listener = createMCPRequestListener({
		token,
		getAction: (endpoint) => {
			const action = Object.prototype.hasOwnProperty.call(MCPEndpoints, endpoint) ? MCPEndpoints[endpoint] : undefined;
			return action ? (data) => action(editor.layout.preview.scene, data, { editor }) : undefined;
		},
		onRequest: (endpoint) => onRequestObservable.notifyObservers(endpoint),
		onResponse: (endpoint, succeeded) => onResponseObservable.notifyObservers({ endpoint, succeeded }),
	});

	const { server, port } = await listenMCPServer(listener, options.port ?? MCPServerPort);

	return {
		port,
		token,
		onRequestObservable,
		onResponseObservable,
		close: () => closeServer(server),
	};
}

function closeServer(server: Server): Promise<void> {
	return new Promise<void>((resolve) => {
		server.close(() => resolve());
		server.closeAllConnections?.();
	});
}

/**
 * Initializes the editor MCP HTTP server on its well known port, without any token, for the MCP server of the
 * Claude Desktop extension.
 * Resilient: if the port is already in use (e.g. a second editor window), the error is caught
 * and logged in the editor console instead of crashing the application.
 * @param editor defines the reference to the editor.
 */
export function initializeMcpServer(editor: Editor): void {
	startMcpServer(editor, { port: MCPServerPort })
		.then(() => {
			editor.layout.console.log(`MCP Server is listening on port ${MCPServerPort}`);
		})
		.catch((e) => {
			editor.layout.console.error(`MCP Server failed to start: ${e instanceof Error ? e.message : String(e)}`);
		});
}
