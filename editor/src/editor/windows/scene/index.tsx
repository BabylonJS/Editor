import { dirname } from "path/posix";
import { ipcRenderer } from "electron";

import { Component, ReactNode } from "react";

import { loadScene } from "../../../project/load/scene";
import { onProjectConfigurationChangedObservable, projectConfiguration } from "../../../project/configuration";

import { waitUntil } from "../../../tools/tools";
import { onProjectSavedObservable } from "../../../tools/observables";

import { Editor } from "../../main";

export interface ISceneEditorWindowProps {
    scenePath: string;
    projectPath: string;
}

export default class SceneEditorWindow extends Component<ISceneEditorWindowProps> {
    private _editor: Editor | null = null;

    public constructor(props: ISceneEditorWindowProps) {
        super(props);
    }

    public render(): ReactNode {
        return (
            <Editor
                ref={(r) => this._editor = r}
                projectPath={this.props.projectPath}
                editedScenePath={this.props.scenePath}
            />
        );
    }

    public async componentDidMount(): Promise<void> {
        if (!this._editor) {
            return;
        }

        await waitUntil(() => this._editor!.layout?.preview?.scene);

        projectConfiguration.path = this.props.projectPath;
        onProjectConfigurationChangedObservable.notifyObservers(projectConfiguration);

        this._editor.setState({
            lastOpenedScenePath: this.props.scenePath,
        });

        const directory = dirname(this.props.projectPath);

        await loadScene(this._editor, directory, this.props.scenePath);

        this._editor.layout.graph.refresh();
        this._editor.layout.inspector.setEditedObject(this._editor.layout.preview.scene);

        onProjectSavedObservable.add(() => {
            ipcRenderer.send("editor:asset-updated", "scene", this.props.scenePath);
        });
    }
}
