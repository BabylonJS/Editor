export interface IEditorProject {
    /**
     * The version of the editor that saved this project.
     */
    version: string;
    /**
     * The path to the last opened scene.
     */
    lastOpenedScene: string | null;
}
