import { platform } from "os";
import { join, sep } from "path/posix";
import { webFrame, ipcRenderer } from "electron";

import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { HotkeysTarget2 } from "@blueprintjs/core";

import { isDarwin } from "../tools/os";
import { waitUntil } from "../tools/tools";
import { onRedoObservable, onUndoObservable, redo, undo } from "../tools/undoredo";
import { tryGetExperimentalFeaturesEnabledFromLocalStorage } from "../tools/local-storage";
import { checkNodeJSAvailable, checkVisualStudioCodeAvailable, checkYarnAvailable } from "../tools/process";

import { saveProject } from "../project/save/save";
import { onProjectConfigurationChangedObservable, projectConfiguration } from "../project/configuration";

import { loadProject } from "../project/load/load";
import { exportProject } from "../project/export/export";

import { disposeVLSPostProcess } from "./rendering/vls";
import { disposeSSRRenderingPipeline } from "./rendering/ssr";
import { disposeSSAO2RenderingPipeline } from "./rendering/ssao";
import { disposeMotionBlurPostProcess } from "./rendering/motion-blur";
import { disposeDefaultRenderingPipeline } from "./rendering/default-pipeline";

import { CommandPalette } from "./dialogs/command-palette/command-palette";
import { EditorEditProjectComponent } from "./dialogs/edit-project/edit-project";
import { EditorEditPreferencesComponent } from "./dialogs/edit-preferences/edit-preferences";

import { Toaster } from "../ui/shadcn/ui/sonner";

import { EditorLayout } from "./layout";

import "./nodes/camera";
import "./nodes/scene-link";

export function createEditor(): void {
    const theme = localStorage.getItem("editor-theme") ?? "dark";
    if (theme === "dark") {
        document.body.classList.add("dark");
    }

    const div = document.getElementById("babylonjs-editor-main-div")!;
    if (!isDarwin()) {
        div.classList.add("electron-rounded-corners");
    }

    const root = createRoot(div);
    root.render(
        <div className="w-screen h-screen">
            <Editor projectPath={null} />
        </div>
    );
}

export interface IEditorProps {
    /**
     * The path of the project.
     */
    projectPath: string | null;

    /**
     * Defines the path to the currently edited scene path.
     */
    editedScenePath?: string | null;
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
    /**
     * Defines the list of all plugins to load.
     */
    plugins: string[];

    /**
     * Defines wether or not compressed textures are enabled.
     */
    compressedTexturesEnabled: boolean;

    /**
     * Defines wether or not experimental features are enabled.
     */
    enableExperimentalFeatures: boolean;

    /**
     * Defines if the project is being edited.
     */
    editProject: boolean;
    /**
     * Defines if the preferences are being edited.
     */
    editPreferences: boolean;
}

export class Editor extends Component<IEditorProps, IEditorState> {
    /**
     * The layout of the editor.
     */
    public layout: EditorLayout;
    /**
     * The command palette of the editor.
     */
    public commandPalette: CommandPalette;

    /**
     * Defines the path to the editor application.
     * This comes from electron `app.getAppPath();`
     */
    public path: string | null = null;

    public constructor(props: IEditorProps) {
        super(props);

        this.state = {
            plugins: [],
            lastOpenedScenePath: null,
            projectPath: props.projectPath,

            compressedTexturesEnabled: false,
            enableExperimentalFeatures: tryGetExperimentalFeaturesEnabledFromLocalStorage(),

            editProject: false,
            editPreferences: false,
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

                <EditorEditProjectComponent
                    editor={this}
                    open={this.state.editProject}
                    onClose={() => this.setState({ editProject: false })}
                />

                <EditorEditPreferencesComponent
                    editor={this}
                    open={this.state.editPreferences}
                    onClose={() => this.setState({ editPreferences: false })}
                />

                <CommandPalette ref={(r) => this.commandPalette = r!} editor={this} />
                <Toaster />
            </>
        );
    }

    public async componentDidMount(): Promise<void> {
        ipcRenderer.on("save", () => saveProject(this));
        ipcRenderer.on("export", () => exportProject(this, { optimize: true }));

        ipcRenderer.on("editor:edit-project", () => this.setState({ editProject: true }));
        ipcRenderer.on("editor:edit-preferences", () => this.setState({ editPreferences: true }));

        ipcRenderer.on("editor:open", (_, path) => this.openProject(join(path)));

        ipcRenderer.on("editor:quit-app", () => this.quitApp());
        ipcRenderer.on("editor:close-window", () => this.close());

        ipcRenderer.on("editor:path", (_, path) => this.path = path.replace(/\\/g, sep));

        // Undo-redo
        ipcRenderer.on("undo", () => undo());
        ipcRenderer.on("redo", () => redo());

        onUndoObservable.add(() => {
            this.layout.graph.refresh();
            this.layout.inspector.forceUpdate();
            this.layout.animations.forceUpdate();
        });

        onRedoObservable.add(() => {
            this.layout.graph.refresh();
            this.layout.inspector.forceUpdate();
            this.layout.animations.forceUpdate();
        });

        await Promise.all([
            await checkNodeJSAvailable(),
            await checkYarnAvailable(),
            await checkVisualStudioCodeAvailable(),
        ]);

        // Ready
        ipcRenderer.send("editor:ready");
    }

    /**
     * Opens the project located at the given absolute path.
     * @param absolutePath defines the absolute path to the project to open.
     */
    public async openProject(absolutePath: string): Promise<void> {
        await waitUntil(() => this.layout.preview.scene);

        ipcRenderer.send("editor:maximize-window");

        absolutePath = absolutePath.replace(/\\/g, sep);

        projectConfiguration.path = absolutePath;

        disposeVLSPostProcess(this);
        disposeSSRRenderingPipeline();
        disposeMotionBlurPostProcess();
        disposeSSAO2RenderingPipeline();
        disposeDefaultRenderingPipeline();

        await loadProject(this, absolutePath);

        onProjectConfigurationChangedObservable.notifyObservers(projectConfiguration);
    }

    /**
     * Closes the current editor window after asking for confirmation.
     */
    public close(): void {
        ipcRenderer.send("window:close");
    }

    /**
     * Quits the app after asking for confirmation.
     */
    public quitApp(): void {
        ipcRenderer.send("app:quit");
    }
}
