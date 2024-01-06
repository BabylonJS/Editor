import { platform } from "os";
import { join, sep } from "path/posix";
import { webFrame, ipcRenderer } from "electron";

import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { OverlayToaster, Toaster, HotkeysTarget2 } from "@blueprintjs/core";

import { saveProject } from "../project/save/save";
import { onProjectConfigurationChangedObservable, projectConfiguration } from "../project/configuration";

import { EditorLayout } from "./layout";
import { loadProject } from "../project/load/load";

import { CommandPalette } from "../ui/command-palette/command-palette";

import "./nodes/camera";

export function createEditor(): void {
    const div = document.getElementById("babylonjs-editor-main-div")!;

    const root = createRoot(div);
    root.render(
        <div className="w-screen h-screen">
            <Editor />
        </div>
    );
}

export interface IEditorState {
    /**
     * The path of the project.
     */
    projectPath: string | null;
    /**
     * The path of the last opened scene.
     */
    lastOpenedScenePath: string | null;
}

export class Editor extends Component<{}, IEditorState> {
    /**
     * The layout of the editor.
     */
    public layout: EditorLayout;
    /**
     * The toaster of the editor.
     */
    public toaster: Toaster;
    /**
     * The command palette of the editor.
     */
    public commandPalette: CommandPalette;

    public constructor(props: {}) {
        super(props);

        this.state = {
            projectPath: null,
            lastOpenedScenePath: null,
        };

        webFrame.setZoomFactor(0.8);
    }

    public render(): ReactNode {
        return (
            <>
                <HotkeysTarget2 hotkeys={[
                    {
                        global: true,
                        combo: platform() === "darwin"
                            ? "cmd + p"
                            : "ctrl + p",
                        preventDefault: true,
                        label: "Show Command Palette",
                        onKeyDown: () => this.commandPalette.setOpen(true),
                    },
                ]}>
                    <EditorLayout
                        editor={this}
                        ref={ref => this.layout = ref!}
                    />
                </HotkeysTarget2>

                <CommandPalette ref={(r) => this.commandPalette = r!} editor={this} />
                <OverlayToaster ref={(r) => this.toaster = r!} usePortal position="bottom-right" />
            </>
        );
    }

    public componentDidMount(): void {
        ipcRenderer.on("save", () => saveProject(this));
        ipcRenderer.on("editor:open", (_, path) => this._handleOpenProject(join(path)));

        ipcRenderer.send("editor:ready");
    }

    private async _handleOpenProject(path: string): Promise<void> {
        path = path.replace(/\\/g, sep);

        projectConfiguration.path = path;

        await loadProject(this, path);

        onProjectConfigurationChangedObservable.notifyObservers(projectConfiguration);
    }
}
