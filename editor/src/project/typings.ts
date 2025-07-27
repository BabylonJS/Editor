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
     * If the compressed textures are enabled using PVRTexTool.
     */
    compressedTexturesEnabled: boolean;
    /**
     * If the compressed textures are enabled in the preview.
     */
    compressedTexturesEnabledInPreview: boolean;

    /**
     * The package manager being used by the project.
     */
    packageManager?: EditorProjectPackageManager;
}

export interface IEditorProjectPlugin {
    /**
     * The name or path of the plugin.
     */
    nameOrPath: string;
}

export type EditorProjectPackageManager = "npm" | "yarn" | "pnpm" | "bun";


export type EditorProjectTemplate = "nextjs" | "solidjs" | "vanillajs";
