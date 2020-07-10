import { ipcRenderer, shell } from "electron";
import { join } from "path";
import { pathExists } from "fs-extra";

import { IPCRequests } from "../../shared/ipc";
import { IStringDictionary, Nullable, Undefinable } from "../../shared/types";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Toaster, Position, ProgressBar, Intent, Classes, IToastProps, IconName, MaybeElement } from "@blueprintjs/core";

import { Engine, Scene, Observable, ISize, Node, BaseTexture, Material, Vector3, CannonJSPlugin, SubMesh, Animation, AbstractMesh, IParticleSystem, Sound } from "babylonjs";

import GoldenLayout from "golden-layout";

import { Overlay } from "./gui/overlay";
import { ActivityIndicator } from "./gui/acitivity-indicator";
import { Confirm } from "./gui/confirm";

import { Tools } from "./tools/tools";
import { IPCTools } from "./tools/ipc";
import { IObjectModified, IEditorPreferences } from "./tools/types";
import { undoRedo } from "./tools/undo-redo";
import { AbstractEditorPlugin } from "./tools/plugin";
import { LayoutUtils } from "./tools/layout-utils";
import { EditorUpdater } from "./tools/updater";

import { IFile } from "./project/files";
import { WorkSpace } from "./project/workspace";
import { Project } from "./project/project";
import { ProjectImporter } from "./project/project-importer";
import { ProjectExporter } from "./project/project-exporter";
import { WelcomeDialog } from "./project/welcome/welcome";

import { SceneSettings } from "./scene/settings";
import { GizmoType } from "./scene/gizmo";
import { SceneUtils } from "./scene/utils";

import { SandboxMain } from "../sandbox/main";

import { IPlugin } from "./plugins/plugin";
import { IPluginToolbar } from "./plugins/toolbar";

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
import "./inspectors/ground-inspector";

import "./inspectors/lights/light-inspector";
import "./inspectors/lights/directional-light-inspector";
import "./inspectors/lights/spot-light-inspector";
import "./inspectors/lights/point-light-inspector";
import "./inspectors/lights/hemispheric-inspector";
import "./inspectors/lights/shadows-inspector";

import "./inspectors/cameras/camera-inspector";
import "./inspectors/cameras/free-camera-inspector";
import "./inspectors/cameras/arc-rotate-camera-inspector";

import "./inspectors/materials/standard-material-inspector";
import "./inspectors/materials/pbr-material-inspector";
import "./inspectors/materials/sky-material-inspector";
import "./inspectors/materials/node-material-inspector";

import "./inspectors/textures/texture-inspector";

import "./inspectors/particle-systems/particle-system-inspector";

import "./inspectors/sound-inspector";

// Assets
import "./assets/meshes";
import "./assets/textures";
import "./assets/materials";
import "./assets/prefabs";
import "./assets/scripts";
import "./assets/sounds";
import "./assets/graphs";

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
     * Reference to the scene utils.
     */
    public sceneUtils: SceneUtils;

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
     * Notifies observers that a particle system has been selected in the editor (preview or graph).
     */
    public selectedParticleSystemObservable: Observable<IParticleSystem> = new Observable<IParticleSystem>();
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
     * Notifies observers that a sound has been selected in the editor (graph, preview).
     */
    public selectedSoundObservable: Observable<Sound> = new Observable<Sound>();
    /**
     * Notifies observers that a node has been added in the editor.
     */
    public addedNodeObservable: Observable<Node> = new Observable<Node>();
    /**
     * Notifies observers that a particle system has been added in the editor.
     */
    public addedParticleSystemObservable: Observable<IParticleSystem> = new Observable<IParticleSystem>();
    /**
     * Notifies observers that a sound has been added in the editor.
     */
    public addedSoundObservable: Observable<Sound> = new Observable<Sound>();
    /**
     * Notifies observers that a node has been removed in the editor (graph, preview, etc.).
     */
    public removedNodeObservable: Observable<Node> = new Observable<Node>();
    /**
     * Notifies observers that a particle system has been removed in the editor (graph, preview, etc.).
     */
    public removedParticleSystemObservable: Observable<IParticleSystem> = new Observable<IParticleSystem>();
    /**
     * Notifies observers that a sound has been removed in the editor (graph, preview, etc.).
     */
    public removedSoundObservable: Observable<Sound> = new Observable<Sound>();
    
    /**
     * Defines the current editor version.
     * @hidden
     */
    public _packageJson: any = { };
    /**
     * @hidden
     */
    public _byPassBeforeUnload: boolean;
    /**
     * @hidden
     */
    public _toaster: Nullable<Toaster> = null;

    private _components: IStringDictionary<any> = { };
    private _stacks: IStringDictionary<any> = { };

    private _taskFeedbacks: IStringDictionary<{
        message: string;
        amount: number;
        timeout: number;
    }> = { };

    private _activityIndicator: Nullable<ActivityIndicator> = null;
    private _refHandlers = {
        getToaster: (ref: Toaster) => (this._toaster = ref),
        getActivityIndicator: (ref: ActivityIndicator) => (this._activityIndicator = ref),
    };

    private _isInitialized: boolean = false;
    private _closing: boolean = false;
    private _pluginWindows: number[] = [];

    /**
     * Defines the current version of the layout.
     */
    public static readonly LayoutVersion = "3.0.0";
    /**
     * Defines the dictionary of all loaded plugins in the editor.
     */
    public static LoadedPlugins: IStringDictionary<{ name: string }> = { };
    /**
     * Defines the dictionary of all loaded external plugins in the editor.
     */
    public static LoadedExternalPlugins: IStringDictionary<IPlugin> = { };

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
        this._packageJson = JSON.parse(await Tools.LoadFile("../package.json", false));
        document.title = `Babylon.JS Editor v${this._packageJson.version}`;

        // Create default layout
        const layoutVersion = localStorage.getItem('babylonjs-editor-layout-version');
        const layoutStateItem = (layoutVersion === Editor.LayoutVersion) ? localStorage.getItem('babylonjs-editor-layout-state') : null;
        const layoutState = layoutStateItem ? JSON.parse(layoutStateItem) : null;

        if (layoutState) { LayoutUtils.ConfigureLayoutContent(this, layoutState.content); }

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
            c.container.on("show", () => this.resize());
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
            Editor.LoadedPlugins = JSON.parse(loadedPluginsItem);
            for (const key in Editor.LoadedPlugins) {
                const plugin = require(`../tools/${Editor.LoadedPlugins[key].name}`);
                this.layout.registerComponent(key, plugin.default);
            }
        }

        try {
            this.layout.init();
        } catch (e) {
            this._resetEditor();
        }

        // Don't forget to listen closing plugins
        for (const key in Editor.LoadedPlugins) {
            const item = this.layout.root.getItemsById(key)[0];
            if (!item) { continue; }

            const plugin = require(`../tools/${Editor.LoadedPlugins[key].name}`);
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
        this.console.resize();
        
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
     * @param icon optional icon to show in the toast.
     */
    public notifyMessage(message: string, timeout: number = 1000, icon: IconName | MaybeElement = "notifications"): void {
        this._toaster?.show({
            message,
            timeout,
            className: Classes.DARK,
            icon,
        }, message);
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

        this.resize();
    }

    /**
     * Adds a new plugin handled by its own window.
     * @param name the name of the plugin to load.
     * @param windowId the id of the window that is possibly already opened.
     * @param args optional arguments to pass the plugn's .init function.
     */
    public async addWindowedPlugin(name: string, windowId?: Undefinable<number>, ...args: any[]): Promise<Nullable<number>> {
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
        await IPCTools.SendWindowMessage(popupId, "pluginName", { name, args });
        await Tools.Wait(100);

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
        // await ProjectExporter.Save(this, true);
        await ProjectExporter.ExportFinalScene(this);

        const task = this.addTaskFeedback(0, "Running Server");
        const workspace = WorkSpace.Workspace!;

        await IPCTools.CallWithPromise(IPCRequests.StartGameServer, WorkSpace.DirPath!, workspace.serverPort);

        this.updateTaskFeedback(task, 100);
        this.closeTaskFeedback(task, 500);

        if (integratedBrowser) {
            this.addWindowedPlugin("play", undefined, workspace);
        } else {
            shell.openExternal(`http://localhost:${workspace.serverPort}`);
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
        if (Editor.LoadedPlugins[plugin.title]) {
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
        Editor.LoadedPlugins[plugin.title] = { name };

        // Listen to events
        const container = stack?.getActiveContentItem()["container"];
        this._bindPluginEvents(container, plugin);

        // Resize
        this.resize();
    }

    /**
     * Binds the plugin's events. 
     */
    private _bindPluginEvents(container: any, plugin: any): void {
        container?.on("destroy", () => delete Editor.LoadedPlugins[plugin.title]);
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

        // Animations
        Animation.AllowMatricesInterpolation = true;

        // Utils
        this.sceneUtils = new SceneUtils(this);

        this._bindEvents();
        this.resize();

        // Hide overlay
        Overlay.Hide();

        // Reveal console
        this.revealPanel("console");

        // Init sandbox
        await SandboxMain.Init();

        // Refresh preferences
        this._applyPreferences();

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
            // Plugins
            for (const p in workspace.pluginsPreferences ?? { }) {
                const plugin = Editor.LoadedExternalPlugins[p];
                if (!plugin?.setWorkspacePreferences) { continue; }

                const preferences = workspace.pluginsPreferences![p];
                
                try {
                    plugin.setWorkspacePreferences(preferences);
                } catch (e) {
                    console.error(e);
                }
            }

            // First load?
            const hasNodeModules = await pathExists(join(WorkSpace.DirPath!, "node_modules"));
            const hasPackageJson = await pathExists(join(WorkSpace.DirPath!, "package.json"));
            if (!hasNodeModules && hasPackageJson) {
                await ProjectExporter.ExportFinalScene(this);
                await WorkSpace.InstallAndBuild(this);
            }

            // Watch typescript project.
            await WorkSpace.WatchTypeScript(this);

            // Watch project?
            if (workspace.watchProject) {
                await WorkSpace.WatchProject(this);
            }
        }

        // Check for updates
        EditorUpdater.CheckForUpdates(this, false);
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
        ipcRenderer.on(IPCRequests.SendWindowMessage, async (_, message) => {
            switch (message.id) {
                // A window has been closed
                case "close-window":
                    const index = this._pluginWindows.indexOf(message.windowId);
                    if (index !== -1) { this._pluginWindows.splice(index, 1); }
                    break;

                // An editor function should be executed
                case "execute-editor-function":
                    const caller = Tools.GetEffectiveProperty(this, message.data.functionName);
                    const fn = Tools.GetProperty<(...args: any[]) => any>(this, message.data.functionName);

                    try {
                        const result = await fn.call(caller, ...message.data.args);
                        IPCTools.SendWindowMessage(message.data.popupId, "execute-editor-function", result);
                    } catch (e) {
                        IPCTools.SendWindowMessage(message.data.popupId, "execute-editor-function");
                    }
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
            this.preview.gizmo.setAttachedNode(o.getMesh());

            if (ev.target !== this.graph) { this.graph.setSelected(o.getMesh()); }
        });
        this.selectedParticleSystemObservable.add((o, ev) => {
            this.inspector.setSelectedObject(o);
            if (o.emitter instanceof AbstractMesh) {
                this.preview.gizmo.setAttachedNode(o.emitter);
            }

            if (ev.target !== this.graph) { this.graph.setSelected(o); }
        });
        this.selectedSoundObservable.add((o, ev) => {
            this.inspector.setSelectedObject(o);
            if (o["_connectedTransformNode"]) {
                this.preview.gizmo.setAttachedNode(o);
            }

            if (ev.target !== this.graph) { this.graph.setSelected(o); }
        });
        
        this.selectedSceneObservable.add((s) => this.inspector.setSelectedObject(s));
        this.selectedTextureObservable.add((t) => this.inspector.setSelectedObject(t));
        this.selectedMaterialObservable.add((m) => this.inspector.setSelectedObject(m));

        this.objectModigyingObservable.add(() => {
            // Nothing to to now...
        });

        this.removedNodeObservable.add(() => {
            this.preview.picker.reset();
        });
        this.removedParticleSystemObservable.add(() => {
            this.preview.picker.reset();
        });
        this.removedSoundObservable.add(() => {
            this.preview.picker.reset();
        });

        this.addedNodeObservable.add(() => {
            // Nothing to do now...
        });

        // Resize
        window.addEventListener("resize", () => {
            this.layout.updateSize();
            this.resize();
        });

        // Close window
        ipcRenderer.on("quit", async () => {
            if (!WorkSpace.HasWorkspace()) {
                return ipcRenderer.send("quit", true);
            }

            const shouldQuit = await Confirm.Show("Quit Editor?", "Are you sure to quit the editor? All unsaved work will be lost.");
            if (shouldQuit) { this._byPassBeforeUnload = true; }

            ipcRenderer.send("quit", shouldQuit);
        });

        // Save
        ipcRenderer.on("save", () => ProjectExporter.Save(this));
        ipcRenderer.on("save-as", () => ProjectExporter.SaveAs(this));
        
        // Undo / Redo
        ipcRenderer.on("undo", () => !(document.activeElement instanceof HTMLInputElement) && undoRedo.undo());
        ipcRenderer.on("redo", () => !(document.activeElement instanceof HTMLInputElement) && undoRedo.redo());

        // Copy / Paste
        document.addEventListener("copy", () => {
            if (this.preview.canvasFocused) { return this.preview.copySelectedNode(); }
        });
        document.addEventListener("paste", () => {
            if (this.preview.canvasFocused) { return this.preview.pasteCopiedNode(); }
        });

        // Search
        ipcRenderer.on("search", () => this.preview.showSearchBar());

        // Project
        ipcRenderer.on("build-project", () => WorkSpace.BuildProject(this));
        ipcRenderer.on("build-and-run-project", async () => {
            await WorkSpace.BuildProject(this);
            this.runProject(true);
        });
        ipcRenderer.on("run-project", () => this.runProject(true));

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
            if (this.preview.canvasFocused) {
                if (ev.key === "t") { return this.preview.setGizmoType(GizmoType.Position); }
                if (ev.key === "r") { return this.preview.setGizmoType(GizmoType.Rotation); }
                if (ev.key === "w") { return this.preview.setGizmoType(GizmoType.Scaling); }
                if (ev.key === "f") { return this.preview.focusSelectedNode(); }
                
                if (ev.keyCode === 46) { return this.preview.removeSelectedNode(); }
                
                // if ((ev.ctrlKey || ev.metaKey) && ev.key === "c") { return this.preview.copySelectedNode(); }
                // if ((ev.ctrlKey || ev.metaKey) && ev.key === "v") { return this.preview.pasteCopiedNode(); }
            }
        });

        // State
        window.addEventListener("beforeunload", async (e) => {
            if (this._byPassBeforeUnload) { return; }

            if (WorkSpace.HasWorkspace() && !this._closing) {
                e.returnValue = false;
                this._closing = await Confirm.Show("Close project?", "Are you sure to close the project? All unsaved work will be lost.");

                if (this._closing) { window.location.reload(); }
                return;
            }

            // Windows
            this._pluginWindows.forEach((id) => IPCTools.Send(IPCRequests.CloseWindow, id));

            // Processes
            if (WorkSpace.HasWorkspace()) { WorkSpace.KillAllProcesses(); }
        });
    }

    /**
     * Saves the editor configuration.
     * @hidden
     */
    public _saveEditorConfig(): void {
        const config = this.layout.toConfig();
        LayoutUtils.ClearLayoutContent(this, config.content);

        localStorage.setItem("babylonjs-editor-layout-state", JSON.stringify(config));
        localStorage.setItem("babylonjs-editor-layout-version", Editor.LayoutVersion);
        localStorage.setItem("babylonjs-editor-loaded-plugins", JSON.stringify(Editor.LoadedPlugins));
    }

    /**
     * Resets the editor.
     * @hidden
     */
    public _resetEditor(): void {
        localStorage.removeItem("babylonjs-editor-layout-state");
        localStorage.removeItem("babylonjs-editor-layout-version");
        localStorage.removeItem("babylonjs-editor-loaded-plugins");

        window.location.reload();
    }

    /**
     * Called by the workspace settings windows.
     * @hidden
     */
    public async _refreshWorkSpace(): Promise<void> {
        await WorkSpace.ReadWorkSpaceFile(WorkSpace.Path!);

        const workspace = WorkSpace.Workspace;
        if (!workspace) { return; }

        if (workspace.watchProject && !WorkSpace.IsWatchingProject) {
            await WorkSpace.WatchProject(this);
        } else if (!workspace.watchProject && WorkSpace.IsWatchingProject) {
            WorkSpace.StopWatchingProject();
        }
    }

    /**
     * @hidden
     */
    public _applyPreferences(): void {
        const preferences = this.getPreferences();

        document.body.style.zoom = preferences.zoom ?? document.body.style.zoom;
        this.engine?.setHardwareScalingLevel(preferences.scalingLevel ?? 1);

        // Gizmo steps
        if (preferences.positionGizmoSnapping) {
            this.preview?.setState({ availableGizmoSteps: preferences.positionGizmoSnapping });
        }

        // Plugins
        const plugins = preferences.plugins ?? [];
        const pluginToolbars: IPluginToolbar[] = [];

        for (const p of plugins) {
            if (Editor.LoadedExternalPlugins[p.name]) {
                if (!p.enabled) {
                    delete Editor.LoadedExternalPlugins[p.name];
                } else {
                    pluginToolbars.push.apply(pluginToolbars, Editor.LoadedExternalPlugins[p.name].toolbar);
                }

                continue;
            }

            try {
                const exports = require(p.path);
                const plugin = exports.registerEditorPlugin(this) as IPlugin;

                Editor.LoadedExternalPlugins[p.name] = plugin;

                // this.mainToolbar.setState({ plugins: plugin.toolbarElements });
                pluginToolbars.push.apply(pluginToolbars, plugin.toolbar);
            } catch (e) {
                console.error(e);
            }
        }

        this.mainToolbar?.setState({ plugins: pluginToolbars });

        this.layout.updateSize();
    }
}
