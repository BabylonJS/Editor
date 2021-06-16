import * as React from "react";
import { Menu, MenuItem, MenuDivider } from "@blueprintjs/core";

import { Editor, Alert, ProjectExporter, SceneExporter } from "babylonjs-editor";

export interface IToolbarProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
}

export class Toolbar extends React.Component<IToolbarProps> {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <Menu>
                <MenuItem text="Show Editor Version..." icon="eye-on" onClick={() => this._handleShowEditorVersion()} />
                <MenuDivider />
                <MenuItem text="Export Project..." icon="export" onClick={() => this._handleExportProject()} />
            </Menu>
        );
    }

    /**
     * Called on the user wants to show the editor's version.
     */
    private _handleShowEditorVersion(): void {
        Alert.Show("Editor Version", `The version of the editor is: ${this.props.editor._packageJson.version}`);
    }

    /**
     * Called on the user wants to export the project.
     */
    private async _handleExportProject(): Promise<void> {
        // Save the project.
        await ProjectExporter.Save(this.props.editor, false);

        // Get directory where the exported scene is located.
        console.log(SceneExporter.GetExportedSceneLocation());

        // Get the final scene Json and do whatever we want with.
        const sceneJson = SceneExporter.GetFinalSceneJson(this.props.editor);
        console.log(sceneJson);
    }
}
