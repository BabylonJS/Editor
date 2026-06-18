import { IGizmoSnapPreferences } from "../tools/scene/gizmo";

export interface IEditorProject {
	/**
	 * The version of the editor that saved this project.
	 */
	version: string;
	/**
	 * The path to the last opened scene.
	 */
	lastOpenedScene: string | null;

	/**
	 * The plugins of the project.
	 */
	plugins: IEditorProjectPlugin[];

	/**
	 * Defines the software used for compressing textures.
	 */
	compressedTextureSoftware?: EditorProjectCompressedTextureSoftware;
	/**
	 * If the compressed textures are enabled using PVRTexTool.
	 */
	compressedTexturesEnabled: boolean;
	/**
	 * If the compressed textures are enabled in the preview.
	 */
	compressedTexturesEnabledInPreview: boolean;

	/**
	 * If the ETC2 compressed textures are enabled using PVRTexTool.
	 */
	compressedEtc2Enabled?: boolean;
	/**
	 * If the PVRTC compressed textures are enabled using PVRTexTool.
	 */
	compressedPvrtcEnabled?: boolean;
	/**
	 * The quality of the compressed textures.
	 */
	compressedTextureQuality?: EditorProjectCompressedTextureQuality;

	/**
	 * The package manager being used by the project.
	 */
	packageManager?: EditorProjectPackageManager;

	/**
	 * Gizmo snap preferences (translate / rotate / scale).
	 */
	gizmoSnap?: IGizmoSnapPreferences;
}

export interface IEditorProjectPlugin {
	/**
	 * The name or path of the plugin.
	 */
	nameOrPath: string;
}

export type EditorProjectCompressedTextureSoftware = "PVRTexTool" | "Khronos KTX-Software";
export type EditorProjectCompressedTextureQuality = "very-fast" | "fast" | "normal" | "high";

export type EditorProjectPackageManager = "npm" | "yarn" | "pnpm" | "bun";

export type EditorProjectTemplate = "nextjs" | "nuxtjs" | "solidjs" | "vanillajs" | "electron";
