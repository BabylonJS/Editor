import { ipcRenderer, shell } from "electron";
import { join } from "path";
import { pathExists } from "fs-extra";

import { IPCRequests } from "../../shared/ipc";
import { IStringDictionary, Nullable, Undefinable } from "../../shared/types";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Toaster, Position, ProgressBar, Intent, Classes, IToastProps } from "@blueprintjs/core";

import { Engine, Scene, Observable, ISize, Node, BaseTexture, Material, Vector3, CannonJSPlugin, SubMesh } from "babylonjs";

import GoldenLayout from "golden-layout";

import { Overlay } from "./gui/overlay";
import { ActivityIndicator } from "./gui/acitivity-indicator";

import { Tools } from "./tools/tools";
import { IPCTools } from "./tools/ipc";
import { IObjectModified, IEditorPreferences } from "./tools/types";
import { undoRedo } from "./tools/undo-redo";
import { AbstractEditorPlugin } from "./tools/plugin";

import { IFile } from "./project/files";
import { WorkSpace } from "./project/workspace";
import { Project } from "./project/project";
import { ProjectImporter } from "./project/project-importer";
import { ProjectExporter } from "./project/project-exporter";
import { WelcomeDialog } from "./project/welcome/welcome";

import { SceneSettings } from "./scene/settings";
import { GizmoType } from "./scene/gizmo";

// Components
import { Inspector } from "./components/inspector";
import { Graph } from "./components/graph";
import { Assets } from "./components/assets";
import { Preview } from "./components/preview";
import { MainToolbar } from "./components/main-toolbar";
import { ToolsToolbar } from "./components/tools-toolbar";
import { Console } from "./components/console";

// Augmentations
import "./gui/augmentations/index";

// Inspectors
import "./inspectors/scene-inspector";
import "./inspectors/rendering-inspector";

import "./inspectors/node-inspector";
import "./inspectors/mesh-inspector";
import "./inspectors/transform-node-inspector";
import "./inspectors/instanced-mesh-inspector";
import "./inspectors/sub-mesh-inspector";

import "./inspectors/lights/light-inspector";
import "./inspectors/lights/directional-light-inspector";
import "./inspectors/lights/point-light-inspector";
import "./inspectors/lights/shadows-inspector";

import "./inspectors/cameras/camera-inspector";
import "./inspectors/cameras/free-camera-inspector";
import "./inspectors/cameras/arc-rotate-camera-inspector";
import "./inspectors/cameras/editor-camera-inspector";

import "./inspectors/materials/standard-material-inspector";
import "./inspectors/materials/pbr-material-inspector";
import "./inspectors/materials/sky-material-inspector";
import "./inspectors/materials/node-material-inspector";

import "./inspectors/textures/texture-inspector";

// Assets
import "./assets/meshes";
import "./assets/textures";
import "./assets/materials";
import "./assets/prefabs";
import "./assets/scripts";

export class Editor {
    /**
     * Reference to the Babylon.JS engine used to render the preview scene.
     */
    public engine: Nullable<Engine> = null;
    /**
     * Reference to the Babylon.JS scene rendered by the preview component.
     */
    public scene: Nullable<Scene> = null;

    /**
     * Reference to the layout used to create the editor's sections.
     */
    public layout: GoldenLayout;

    /**
     * Reference to the inspector tool used to edit objects in the scene.
     */
    public inspector: Inspector;
    /**
     * Reference to the graph tool used to show and edit hierarchy in the scene..
     */
    public graph: Graph;
    /**
     * Reference to the assets tool used to show and edit assets of the project (meshes, prefabs, etc.)..
     */
    public assets: Assets;
    /**
     * Reference to the preview element used to draw the project's scene.
     */
    public preview: Preview;
    /**
     * Reference to the main toolbar.
     */
    public mainToolbar: MainToolbar;
    /**
     * Reference to the tools toolbar.
     */
    public toolsToolbar: ToolsToolbar;
    /**
     * Reference to the console.
     */
    public console: Console;

    /**
     * Defines the dictionary of all avaiable loaded plugins in the editor.
     */
    public plugins: IStringDictionary<AbstractEditorPlugin<any>> = { };

    /**
     * Notifies observers once the editor has been initialized.
     */
    public editorInitializedObservable: Observable<void> = new Observable<void>();
    /**
     * Notifies observers on the editor is resized (window, layout, etc.).
     */
    public resizeObservable: Observable<void> = new Observable<void>();
    /**
     * Notifies observers on the editor modified an object (typically inspectors).
     */
    public objectModifiedObservable: Observable<IObjectModified<any>> = new Observable<IObjectModified<any>>();
    /**
     * Notifies observers on the editor modfies an object (typically inspectors).
     */
    public objectModigyingObservable: Observable<IObjectModified<any>> = new Observable<IObjectModified<any>>();
    /**
     * Notifies observers that a node has been selected in the editor (preview or graph).
     */
    public selectedNodeObservable: Observable<Node> = new Observable<Node>();
    /**
     * Notifies observers that a submesh has been selected in the editor (preview or graph).
     */
    public selectedSubMeshObservable: Observable<SubMesh> = new Observable<SubMesh>();
    /**
     * Notifies observers that a texture has been selected in the editor (assets).
     */
    public selectedTextureObservable: Observable<BaseTexture> = new Observable<BaseTexture>();
    /**
     * Notifies observers that a material has been selected in the editor (assets).
     */
    public selectedMaterialObservable: Observable<Material> = new Observable<Material>();
    /**
     * Notifies observers that the scene has been selected in the editor (graph).
     */
    public selectedSceneObservable: Observable<Scene> = new Observable<Scene>();
    /**
     * Notifies observers that a node has been added in the editor.
     */
    public addedNodeObservable: Observable<Node> = new Observable<Node>();
    /**
     * Notifies observers that a node has been removed in the editor (graph, preview, etc.).
     */
    public removedNodeObservable: Observable<Node> = new Observable<Node>();

    /**
     * Defines the current editor version.
     * @hidden
     */
    public _packageJson: any = { };

    private _components: IStringDictionary<any> = { };
    private _stacks: IStringDictionary<any> = { };

    private _resetting: boolean = false;
    private _taskFeedbacks: IStringDictionary<{
        message: string;
        amount: number;
        timeout: number;
    }> = { };

    private _toaster: Nullable<Toaster> = null;
    private _activityIndicator: Nullable<ActivityIndicator> = null;
    private _refHandlers = {
        getToaster: (ref: Toaster) => (this._toaster = ref),
        getActivityIndicator: (ref: ActivityIndicator) => (this._activityIndicator = ref),
    };

    private _isInitialized: boolean = false;
    private _pluginWindows: number[] = [];

    /**
     * Defines the current version of the layout.
     */
    public static readonly LayoutVersion = "3.0.0";

    private static _loadedPlugins: IStringDictionary<{ name: string }> = { };

    /**
     * Constructor.
     */
    public constructor() {
        // Create toolbar
        ReactDOM.render(<MainToolbar editor={this} />, document.getElementById("BABYLON-EDITOR-MAIN-TOOLBAR"));
        ReactDOM.render(<ToolsToolbar editor={this} />, document.getElementById("BABYLON-EDITOR-TOOLS-TOOLBAR"));

        // Toaster
        ReactDOM.render(<Toaster canEscapeKeyClear={true} position={Position.TOP} ref={this._refHandlers.getToaster}></Toaster>, document.getElementById("BABYLON-EDITOR-TOASTS"));

        // Activity Indicator
        ReactDOM.render(
            <ActivityIndicator size={25} ref={this._refHandlers.getActivityIndicator} onClick={() => this._revealAllTasks()}></ActivityIndicator>,
            document.getElementById("BABYLON-EDITOR-ACTIVITY-INDICATOR"),
        );

        // Init!
        this.init();
    }

    /**
     * Called on the component did mount.
     */
    public async init(): Promise<void> {
        document.getElementById("BABYLON-START-IMAGE")?.remove();
        Overlay.Show("Loading Editor...", true);

        // Get version
        this._packageJson = JSON.parse(await Tools.LoadFile("./package.json", false));

        // Create default layout
        const layoutVersion = localStorage.getItem('babylonjs-editor-layout-version');
        const layoutStateItem = (layoutVersion === Editor.LayoutVersion) ? localStorage.getItem('babylonjs-editor-layout-state') : null;
        const layoutState = layoutStateItem ? JSON.parse(layoutStateItem) : null;

        if (layoutState) { this._configureLayoutContent(layoutState.content); }

        this.layout = new GoldenLayout(layoutState ?? {
            settings: {
                showPopoutIcon: false,
                showCloseIcon: false,
                showMaximiseIcon: true
            },
            dimensions: {
                minItemWidth: 240,
                minItemHeight: 50
            },
            labels: {
                close: "Close",
                maximise: "Maximize",
                minimise: "Minimize"
            },
            content: [{
                type: "row", content: [
                    { type: "react-component", id: "inspector", component: "inspector", componentName: "Inspector", title: "Inspector", width: 20, isClosable: false, props: {
                        editor: this,
                    } },
                    { type: "column", content: [
                        { type: "react-component", id: "preview", component: "preview", componentName: "Preview", title: "Preview", isClosable: false, props: {
                            editor: this,
                        } },
                        { type: "stack", id: "edit-panel", componentName: "edit-panel", content: [
                            { type: "react-component", id: "assets", component: "assets", componentName: "Assets", title: "Assets", width: 10, isClosable: false, props: {
                                editor: this,
                            } },
                            { type: "react-component", id: "console", component: "console", componentName: "Console", title: "Console", width: 10, isClosable: false, props: {
                                editor: this,
                            } }
                        ] },
                    ] },
                    { type: "stack", content: [
                        { type: "react-component", id: "graph", component: "graph", componentName: "Graph", title: "Graph", width: 2, isClosable: false, props: {
                            editor: this,
                        } },
                    ] }
                ]
            }],
        }, $("#BABYLON-EDITOR"));

        // Register layout events
        this.layout.on("componentCreated", (c) => {
            this._components[c.config.component] = c;
            c.container.on("resize", () => this.resize());
        });
        this.layout.on("stackCreated", (s) => {
            if (s.config?.componentName) {
                this._stacks[s.config.componentName] = s;
            }
        });

        // Register components
        this.layout.registerComponent("inspector", Inspector);
        this.layout.registerComponent("preview", Preview);
        this.layout.registerComponent("assets", Assets);
        this.layout.registerComponent("graph", Graph);
        this.layout.registerComponent("console", Console);

        // Retrieve preview layout state for plugins.
        const loadedPluginsItem = localStorage.getItem("babylonjs-editor-loaded-plugins");
        if (loadedPluginsItem) {
            Editor._loadedPlugins = JSON.parse(loadedPluginsItem);
            for (const key in Editor._loadedPlugins) {
                const plugin = require(`../tools/${Editor._loadedPlugins[key].name}`);
                this.layout.registerComponent(key, plugin.default);
            }
        }

        try {
            this.layout.init();
        } catch (e) {
            this._resetEditor();
        }

        // Don't forget to listen closing plugins
        for (const key in Editor._loadedPlugins) {
            const item = this.layout.root.getItemsById(key)[0];
            if (!item) { continue; }

            const plugin = require(`../tools/${Editor._loadedPlugins[key].name}`);
            this._bindPluginEvents(item["container"], plugin);
        }

        // Init!
        setTimeout(() => this._init(), 0);
    }

    /**
     * Resizes the editor.
     */
    public resize(): void {
        this.engine!.resize();
        this.inspector.resize();
        this.assets.resize();
        
        for (const p in this.plugins) {
            const panel = this.getPanelSize(p);
            this.plugins[p].resize(panel.width, panel.height);
        }

        this.resizeObservable.notifyObservers();
    }

    /**
     * Returns wether or not the editor has been initialized.
     */
    public get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Returns the current size of the panel identified by the given id.
     * @param panelId the id of the panel to retrieve its size.
     */
    public getPanelSize(panelId: string): ISize {
        const panel = this._components[panelId];
        if (!panel) {
            return { width: 0, height: 0 };
        }

        return { width: panel.container.width, height: panel.container.height };
    }

    /**
     * Adds a new task feedback (typically when saving the project).
     * @param amount the amount of progress for the task in interval [0; 100].
     * @param message the message to show.
     */
    public addTaskFeedback(amount: number, message: string, timeout: number = 10000): string {
        const key = this._toaster?.show(this._renderTaskFeedback(amount, message, timeout));
        if (!key) { throw "Can't create a new task feedback" }

        this._activityIndicator?.setState({ enabled: true });
        this._taskFeedbacks[key] = { amount, message, timeout };
        return key;
    }

    /**
     * Updates the task feedback identified by the given key.
     * @param key the key that identifies the task feedback.
     * @param amount the new amount of the progress bar.
     * @param message the new message to show.
     */
    public updateTaskFeedback(key: string, amount: number, message?: string): void {
        const task = this._taskFeedbacks[key];
        if (task === undefined) { throw "Can't update an unexisting feedback."; }

        task.message = message ?? task.message;
        this._toaster?.show(this._renderTaskFeedback(amount ?? task.amount, task.message, task.timeout), key);
    }

    /**
     * Closes the toast identified by the given id.
     * @param key the key of the existing toast.
     * @param timeout the time in Ms to wait before dismiss.
     */
    public closeTaskFeedback(key: string, timeout: number = 0): void {
        setTimeout(() => {
            this._toaster?.dismiss(key);
            delete this._taskFeedbacks[key];

            if (!Object.keys(this._taskFeedbacks).length) {
                this._activityIndicator?.setState({ enabled: false });
            }
        }, timeout);
    }

    /**
     * Notifies the user the given message.
     * @param message the message to notify.
     * @param timeout the time in ms before hidding the notification.
     */
    public notifyMessage(message: string, timeout: number = 1000): void {
        const task = this.addTaskFeedback(100, message);
        this.closeTaskFeedback(task, timeout);
    }

    /**
     * Adds a new plugin to the layout.
     * @param name the name of the plugin to laod.
     */
    public addPlugin(name: string): void {
        const plugin = require(`../tools/${name}`);
        this._addPlugin(plugin, name);
    }

    /**
     * Closes the plugin identified by the given name.
     * @param pluginName the name of the plugin to close.
     */
    public closePlugin(pluginName: string): void {
        const container = this._components[pluginName]?.container;
        if (!container) { return; }

        // Close plugin
        container.emit("destroy");

        // Close container
        container.off("show");
        container.off("resize");
        container.off("destroy");

        try {
            container.close();
        } catch (e) {
            // Catch silently.
        }
    }

    /**
     * Adds a new plugin handled by its own window.
     * @param name the name of the plugin to load.
     * @param windowId the id of the window that is possibly already opened.
     * @param initData optional data to send for the initialization of the plugin.
     */
    public async addWindowedPlugin(name: string, windowId?: Undefinable<number>, initData?: Undefinable<any>): Promise<Nullable<number>> {
        // Check if the provided window id exists. If exists, just restore.
        if (windowId) {
            const index = this._pluginWindows.indexOf(windowId);
            if (index !== -1) {
                IPCTools.Send(IPCRequests.FocusWindow, windowId);
                return null;
            }
        }

        const width = 1280;
        const height = 800;
        const popupId = await IPCTools.CallWithPromise<number>(IPCRequests.OpenWindowOnDemand, {
            options: {
                title: name,
                width,
                height,
                x: window.screenX + Math.max(window.outerWidth - width, 0) / 2,
                y: window.screenY + Math.max(window.outerHeight - height, 0) / 2,
                resizable: true,
                autoHideMenuBar: true,
                webPreferences: { nodeIntegration: true }
            },
            url: "./plugin.html",
            autofocus: true,
        });

        this._pluginWindows.push(popupId);

        await Tools.Wait(100);
        await IPCTools.SendWindowMessage(popupId, "pluginName", { name });
        await Tools.Wait(100);

        if (initData !== undefined) {
            IPCTools.SendWindowMessage(popupId, "init", initData);
        }

        return popupId;
    }

    /**
     * Adds a new preview.
     */
    public addPreview(): void {
        const preview = require("../tools/preview");
        const plugin = {
            title: "Preview 1",
            default: preview.default,
        };

        this._addPlugin(plugin, "preview");
    }

    /**
     * Runs the project.
     * @param integratedBrowser defines wether or not the integrated browser should be used to run the project.
     */
    public async runProject(integratedBrowser: boolean): Promise<void> {
        await ProjectExporter.Save(this);
        await ProjectExporter.ExportFinalScene(this);

        const task = this.addTaskFeedback(0, "Running Server");

        await IPCTools.CallWithPromise(IPCRequests.StartGameServer, WorkSpace.DirPath!);

        this.updateTaskFeedback(task, 100);
        this.closeTaskFeedback(task, 500);

        if (integratedBrowser) {
            this.addWindowedPlugin("play", undefined, WorkSpace.Workspace);
        } else {
            shell.openExternal(`http://localhost:${WorkSpace.Workspace!.serverPort}`);
        }
    }

    /**
     * Reveals the panel identified by the given Id.
     * @param panelId the id of the panel to reveal.
     */
    public revealPanel(panelId: string): void {
        const item = this.layout.root.getItemsById(panelId)[0];
        if (!item) { return; }

        const stack = item.parent;
        if (!stack) { return ;}

        try { stack.setActiveContentItem(item); } catch (e) { /* Catch silently */ }
    }

    /**
     * Returns the current settings of the editor.
     */
    public getPreferences(): IEditorPreferences {
        const settings = JSON.parse(localStorage.getItem("babylonjs-editor-preferences") ?? "{ }") as IEditorPreferences;
        return settings;
    }

    /**
     * Adds the given plugin into the layout.
     */
    private _addPlugin(plugin: any, name: string): void {
        // Existing or register.
        try {
            this.layout.getComponent(plugin.title);
        } catch (e) {
            this.layout.registerComponent(plugin.title, plugin.default);
        }

        // Plugin already loaded?
        if (Editor._loadedPlugins[plugin.title]) {
            return this.revealPanel(plugin.title);
        }

        const stack = this._stacks["edit-panel"] ?? this.layout.root.getItemsByType("stack").find((s) => s.config.id === "edit-panel" || s.config.id?.indexOf("edit-panel") !== -1);
        stack?.addChild({
            type: "react-component",
            id: plugin.title,
            componentName: plugin.title,
            component: plugin.title,
            title: plugin.title,
            props: {
                editor: this,
                id: plugin.title,
            },
        });

        // Register plugin
        Editor._loadedPlugins[plugin.title] = { name };

        // Listen to events
        const container = stack?.getActiveContentItem()["container"];
        this._bindPluginEvents(container, plugin);
    }

    /**
     * Binds the plugin's events. 
     */
    private _bindPluginEvents(container: any, plugin: any): void {
        container?.on("destroy", () => delete Editor._loadedPlugins[plugin.title]);
        container?.on("show", () => {
            const pluginSize = this.getPanelSize(plugin.title);
            if (!pluginSize) { return; }
            this.plugins[plugin.title]?.resize(pluginSize.width, pluginSize.height);
        });
    }

    /**
     * Inits the launch of the editor's project.
     */
    private async _init(): Promise<void> {
        // Create Babylon.JS stuffs
        this.engine = new Engine(document.getElementById("renderCanvas") as HTMLCanvasElement, true, {
            antialias: true,
            audioEngine: true,
            disableWebGL2Support: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
            useHighPrecisionFloats: true,
            preserveDrawingBuffer: true,
            stencil: true,
        }, true);
        this.scene = new Scene(this.engine);
        this.engine.runRenderLoop(() => this.scene!.render());

        // Camera
        this.scene.activeCamera = SceneSettings.Camera ?? SceneSettings.GetArcRotateCamera(this);
        
        // Post-processes
        SceneSettings.GetSSAORenderingPipeline(this);
        SceneSettings.GetStandardRenderingPipeline(this);
        SceneSettings.GetDefaultRenderingPipeline(this);

        // Physics
        this.scene.enablePhysics(Vector3.Zero(), new CannonJSPlugin());

        this._bindEvents();
        this.resize();

        // Hide overlay
        Overlay.Hide();

        // Reveal console
        this.revealPanel("console");

        // Check workspace
        const workspacePath = await WorkSpace.GetOpeningWorkspace();
        if (workspacePath) {
            await WorkSpace.ReadWorkSpaceFile(workspacePath);
            await WorkSpace.RefreshAvailableProjects();
        }
        
        // Get opening project
        const projectPath = workspacePath ? WorkSpace.GetProjectPath() : await Project.GetOpeningProject();
        if (projectPath) {
            await ProjectImporter.ImportProject(this, projectPath);
        } else {
            this.graph.refresh();
            WelcomeDialog.Show(false);
        }

        // Refresh
        this.mainToolbar.setState({ hasWorkspace: workspacePath !== null });
        this.toolsToolbar.setState({ hasWorkspace: WorkSpace.HasWorkspace() });

        // Now initialized!
        this._isInitialized = true;
        
        // Notify!
        this.editorInitializedObservable.notifyObservers();
        this.selectedSceneObservable.notifyObservers(this.scene!);

        // If has workspace, od workspace stuffs.
        const workspace = WorkSpace.Workspace;
        if (workspace) {
            // First load?
            const hasNodeModules = await pathExists(join(WorkSpace.DirPath!, "node_modules"));
            if (!hasNodeModules) {
                await ProjectExporter.ExportFinalScene(this);
                await WorkSpace.InstallAndBuild(this);
            }

            if (workspace.watchProject) {
                WorkSpace.WatchProject(this);
            }
        }
    }

    /**
     * Renders a task with the given amount (progress bar) and message.
     */
    private _renderTaskFeedback(amount: number, message: string, timeout: number): IToastProps {
        return {
            icon: "cloud-upload",
            timeout,
            className: Classes.DARK,
            message: (
                <>
                    <p><strong>{message}</strong></p>
                    <ProgressBar
                        intent={amount < 100 ? Intent.PRIMARY : Intent.SUCCESS}
                        value={amount / 100}
                    />
                </>
            ),
        }
    }

    /**
     * Called on the user wants to reveal all the tasks for information.
     */
    private _revealAllTasks(): void {
        if (!Object.keys(this._taskFeedbacks).length) { return; }
        for (const key in this._taskFeedbacks) {
            const task = this._taskFeedbacks[key];
            this.updateTaskFeedback(key, task.amount, task.message);
        }
    }

    /**
     * Binds the events of the overall editor main events;
     */
    private _bindEvents(): void {
        // IPC
        ipcRenderer.on(IPCRequests.SendWindowMessage, async (_, data) => {
            switch (data.id) {
                // A window has been closed
                case "close-window":
                    const index = this._pluginWindows.indexOf(data.windowId);
                    if (index !== -1) { this._pluginWindows.splice(index, 1); }
                    break;

                // An editor function should be executed
                case "execute-editor-function":
                    const result = await this[data.functionName](...data.args);
                    IPCTools.SendWindowMessage(data.popupId, "execute-editor-function", result)
                    break;
            }
        });

        // Editor events coordinator
        this.selectedNodeObservable.add((o, ev) => {
            this.inspector.setSelectedObject(o);
            this.preview.gizmo.setAttachedNode(o);
            
            if (ev.target !== this.graph) { this.graph.setSelected(o); }
        });
        this.selectedSubMeshObservable.add((o, ev) => {
            this.inspector.setSelectedObject(o);

            if (ev.target !== this.graph) { this.graph.setSelected(o.getMesh()); }
        });
        
        this.selectedSceneObservable.add((s) => this.inspector.setSelectedObject(s));
        this.selectedTextureObservable.add((t) => this.inspector.setSelectedObject(t));
        this.selectedMaterialObservable.add((m) => this.inspector.setSelectedObject(m));

        this.objectModigyingObservable.add(() => {
            this.preview.setDirty();
        });

        this.removedNodeObservable.add(() => {
            this.preview.setDirty();
            this.preview.picker.reset();
        });

        this.addedNodeObservable.add(() => {
            this.preview.setDirty();
        });

        // Events
        window.addEventListener("resize", () => {
            this.layout.updateSize();
            this.resize();
        });

        // Drag'n'drop
        document.addEventListener("dragover", (ev) => ev.preventDefault());
        document.addEventListener("drop", (ev) => {
            if (!ev.dataTransfer || !ev.dataTransfer.files.length) { return; }

            const files: IFile[] = [];
            const sources = ev.dataTransfer.files;
            for (let i = 0; i < sources.length; i++) {
                const file = sources.item(i);
                if (file) { files.push({ path: file.path, name: file.name } as IFile); }
            }

            if (files.length) { this.assets.addDroppedFiles(ev, files); }
        });

        // Shortcuts
        window.addEventListener("keyup", (ev) => {
            if ((ev.ctrlKey || ev.metaKey) && ev.key === "s") { return ProjectExporter.Save(this); }
            if ((ev.ctrlKey || ev.metaKey) && ev.key === "S") { return ProjectExporter.SaveAs(this); }

            if ((ev.ctrlKey || ev.metaKey) && ev.key === "z") { return undoRedo.undo(); }
            if (ev.ctrlKey && ev.key === "y") { return undoRedo.redo(); }
            if (ev.metaKey && ev.key === "Z") { return undoRedo.redo(); }

            if (this.preview.canvasFocused) {
                if (ev.key === "t") { return this.preview.setGizmoType(GizmoType.Position); }
                if (ev.key === "r") { return this.preview.setGizmoType(GizmoType.Rotation); }
                if (ev.key === "w") { return this.preview.setGizmoType(GizmoType.Scaling); }
                if (ev.key === "f") { return this.preview.focusSelectedNode(); }
                if (ev.keyCode === 46) { return this.preview.removeSelectedNode(); }

                if ((ev.ctrlKey || ev.metaKey) && ev.key === "c") { return this.preview.copySelectedNode(); }
                if ((ev.ctrlKey || ev.metaKey) && ev.key === "v") { return this.preview.pasteCopiedNode(); }
            }
        });

        // State
        window.addEventListener("beforeunload", () => {
            // Windows
            this._pluginWindows.forEach((id) => IPCTools.Send(IPCRequests.CloseWindow, id));

            // Processes
            if (WorkSpace.HasWorkspace()) { WorkSpace.KillAllProcesses(); }

            // Save state
            if (this._resetting) { return; }

            const config = this.layout.toConfig();
            this._clearLayoutContent(config.content);

            localStorage.setItem("babylonjs-editor-layout-state", JSON.stringify(config));
            localStorage.setItem("babylonjs-editor-layout-version", Editor.LayoutVersion);
            localStorage.setItem("babylonjs-editor-loaded-plugins", JSON.stringify(Editor._loadedPlugins));
        });
    }

    /**
     * Clears the contents of the serialized layout.
     */
    private _clearLayoutContent(content: Nullable<any[]>): void {
        if (!content) { return; }
        content.forEach((c) => {
            if (c.props) { c.props = { }; }
            if (c.componentState) { delete c.componentState; }

            this._clearLayoutContent(c.content);
        });
    }

    /**
     * Configures the contents of the serialized layout.
     */
    private _configureLayoutContent(content: Nullable<any[]>): void {
        if (!content) { return; }
        content.forEach((c) => {
            if (c.props) { c.props = { editor: this, id: c.id }; }
            this._configureLayoutContent(c.content);
        });
    }

    /**
     * Resets the editor.
     * @hidden
     */
    public _resetEditor(): void {
        this._resetting = true;
        localStorage.removeItem("babylonjs-editor-layout-state");
        localStorage.removeItem("babylonjs-editor-layout-version");
        localStorage.removeItem("babylonjs-editor-loaded-plugins");

        window.location.reload();
    }

    /**
     * Called by the workspace settings windows.
     */
    public async _refreshWorkSpace(): Promise<void> {
        await WorkSpace.ReadWorkSpaceFile(WorkSpace.Path!);

        const workspace = WorkSpace.Workspace;
        if (!workspace) { return; }

        if (workspace.watchProject && !WorkSpace.IsWatching) {
            WorkSpace.WatchProject(this);
        } else if (!workspace.watchProject && WorkSpace.IsWatching) {
            WorkSpace.StopWatching();
        }
    }
}
