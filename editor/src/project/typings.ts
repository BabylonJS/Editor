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
     * The path to the PVRTexTool CLI used when `compressedTexturesEnabled` is set to `true`.
     */
    compressedTexturesCliPath: string | null;
}

export interface IEditorProjectPlugin {
    /**
     * The name or path of the plugin.
     */
    nameOrPath: string;
}
