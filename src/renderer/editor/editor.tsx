import { ipcRenderer, remote, shell } from "electron";
import { dirname, join } from "path";
import { pathExists } from "fs-extra";

import { IPCRequests, IPCResponses } from "../../shared/ipc";
import { IStringDictionary, Nullable, Undefinable } from "../../shared/types";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Toaster, Position, ProgressBar, Intent, Classes, IToastProps, IconName, MaybeElement } from "@blueprintjs/core";
import { Layout, Model, TabNode, Rect, Actions } from "flexlayout-react";

import {
    Engine, Scene, Observable, ISize, Node, BaseTexture, Material, Vector3, CannonJSPlugin,
    SubMesh, Animation, AbstractMesh, IParticleSystem, Sound, KeyboardInfo, KeyboardEventTypes,
    Color4, SceneLoader, Skeleton,
} from "babylonjs";

import { Overlay } from "./gui/overlay";
import { ActivityIndicator } from "./gui/acitivity-indicator";
import { Confirm } from "./gui/confirm";

import { Tools } from "./tools/tools";
import { IPCTools } from "./tools/ipc";
import { IObjectModified, IEditorPreferences, EditorPlayMode } from "./tools/types";
import { undoRedo } from "./tools/undo-redo";
import { AbstractEditorPlugin } from "./tools/plugin";
import { EditorUpdater } from "./tools/update/updater";
import { TouchBarHelper } from "./tools/touch-bar";

import { IFile } from "./project/files";
import { WorkSpace } from "./project/workspace";
import { Project } from "./project/project";
import { ProjectImporter } from "./project/project-importer";
import { ProjectExporter } from "./project/project-exporter";
import { WelcomeDialog } from "./project/welcome/welcome";
import { SceneExporter } from "./project/scene-exporter";
import { WorkspaceConverter } from "./project/converter/converter";

import { SceneSettings } from "./scene/settings";
import { GizmoType } from "./scene/gizmo";
import { SceneUtils } from "./scene/utils";

import { SandboxMain } from "../sandbox/main";

import { IPluginToolbar } from "./plugins/toolbar";
import { IPlugin, IPluginConfiguration } from "./plugins/plugin";

import "./painting/material-mixer/material";

// Loaders
import { FBXLoader } from "./loaders/fbx/loader";

// Components
import { Inspector } from "./components/inspector";
import { Graph } from "./components/graph";
import { Assets } from "./components/assets";
import { AssetsBrowser } from "./components/assets-browser";
import { Preview, PreviewFocusMode } from "./components/preview";
import { MainToolbar } from "./components/main-toolbar";
import { ToolsToolbar } from "./components/tools-toolbar";
import { Console } from "./components/console";

// Assets
import { AssetsBrowserItem } from "./components/assets-browser/files/item";

// Augmentations
import "./gui/augmentations/index";

// Inspectors
import "./components/inspectors/scene/scene-inspector";
import "./components/inspectors/scene/rendering-inspector";
import "./components/inspectors/scene/animation-groups-inspector";

import "./components/inspectors/node-inspector";
import "./components/inspectors/node/mesh-inspector";
import "./components/inspectors/node/transform-node-inspector";
import "./components/inspectors/node/sub-mesh-proxy-inspector";
import "./components/inspectors/node/sub-mesh-inspector";
import "./components/inspectors/node/ground-inspector";

import "./components/inspectors/lights/light-inspector";
import "./components/inspectors/lights/directional-light-inspector";
import "./components/inspectors/lights/spot-light-inspector";
import "./components/inspectors/lights/point-light-inspector";
import "./components/inspectors/lights/hemispheric-light-inspector";
import "./components/inspectors/lights/shadows-inspector";

import "./components/inspectors/cameras/camera-inspector";
import "./components/inspectors/cameras/free-camera-inspector";
import "./components/inspectors/cameras/arc-rotate-camera-inspector";

import "./components/inspectors/materials/standard-inspector";
import "./components/inspectors/materials/pbr-inspector";
import "./components/inspectors/materials/sky-inspector";
import "./components/inspectors/materials/node-inspector";
import "./components/inspectors/materials/cell-inspector";
import "./components/inspectors/materials/fire-inspector";
import "./components/inspectors/materials/lava-inspector";
import "./components/inspectors/materials/water-inspector";
import "./components/inspectors/materials/tri-planar-inspector";

import "./components/inspectors/textures/texture-inspector";

import "./components/inspectors/particle-systems/particle-system-inspector";
import "./components/inspectors/particle-systems/particle-system-gradients-inspector";

import "./components/inspectors/sound/sound-inspector";

// Assets
import { MaterialAssets } from "./assets/materials";
import { TextureAssets } from "./assets/textures";
import { PrefabAssets } from "./assets/prefabs";

// Extensions
import { WebpackProgressExtension } from "./extensions/webpack-progress";

// Json
import layoutConfiguration from "./layout.json";

export interface ILayoutTabNodeConfiguration {
    /**
     * Defines the name of the layout tab node.
     */
    componentName: "preview" | "inspector" | "console" | "assets" | "graph" | string;
    /**
     * Defines the name of the tab component.
     */
    name: string;
    /**
     * Defines the id of the layout tab node.
     */
    id: string;
    /**
     * Defines the id of the tab node in the layout.
     */
    rect: Rect;
}

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
    public layout: Layout;

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
     * Defines the reference to the assets browser component.
     */
    public assetsBrowser: AssetsBrowser;

    /**
     * Defines the dictionary of all avaiable loaded plugins in the editor.
     */
    public plugins: IStringDictionary<AbstractEditorPlugin<any>> = {};

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
     * Notifies observers that a skeleton has been selected in the editor (graph).
     */
    public selectedSkeletonObservable: Observable<Skeleton> = new Observable<Skeleton>();
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
     * Notifies observers that a keyboard event has been fired.
     */
    public keyboardEventObservable: Observable<KeyboardInfo> = new Observable<KeyboardInfo>();
    /**
     * Notifies observers that the project will be saved.
     */
    public beforeSaveProjectObservable: Observable<string> = new Observable<string>();
    /**
     * Notifies observers that the project has been saved.
     */
    public afterSaveProjectObservable: Observable<string> = new Observable<string>();
    /**
     * Notifies observers that the scene will be generated.
     */
    public beforeGenerateSceneObservable: Observable<string> = new Observable<string>();
    /**
     * Notifies observers that the scene has been generated.
     */
    public afterGenerateSceneObservable: Observable<string> = new Observable<string>();

    /**
     * Defines the current editor version.
     * @hidden
     */
    public _packageJson: any = {};
    /**
     * @hidden
     */
    public _byPassBeforeUnload: boolean;
    /**
     * @hidden
     */
    public _toaster: Nullable<Toaster> = null;

    /**
     * Defines the dictionary of all configurations for all tab nodes. This configuration is updated each time a node
     * event is triggered, like "resize".
     * @hidden
     */
    public readonly _layoutTabNodesConfigurations: Record<string, ILayoutTabNodeConfiguration> = {};

    private _components: IStringDictionary<React.ReactNode> = {};

    private _taskFeedbacks: IStringDictionary<{
        message: string;
        amount: number;
        timeout: number;
    }> = {};

    private _activityIndicator: Nullable<ActivityIndicator> = null;
    private _refHandlers = {
        getToaster: (ref: Toaster) => (this._toaster = ref),
        getActivityIndicator: (ref: ActivityIndicator) => (this._activityIndicator = ref),
    };

    private _isInitialized: boolean = false;
    private _isProjectReady: boolean = false;

    private _closing: boolean = false;
    private _pluginWindows: number[] = [];

    private _preferences: Nullable<IEditorPreferences> = null;

    /**
     * Defines the current version of the layout.
     */
    public static readonly LayoutVersion = "4.1.0";
    /**
     * Defines the dictionary of all loaded plugins in the editor.
     */
    public static LoadedPlugins: IStringDictionary<{ name: string; fullPath?: boolean; }> = {};
    /**
     * Defines the dictionary of all loaded external plugins in the editor.
     */
    public static LoadedExternalPlugins: IStringDictionary<IPlugin> = {};

    /**
     * Constructor.
     */
    public constructor() {
        // Register assets
        MaterialAssets.Register();
        TextureAssets.Register();
        PrefabAssets.Register();

        // Register loaders
        SceneLoader.RegisterPlugin(new FBXLoader());

        // Create toolbar
        ReactDOM.render(<MainToolbar editor={this} />, document.getElementById("BABYLON-EDITOR-MAIN-TOOLBAR"));
        ReactDOM.render(<ToolsToolbar editor={this} />, document.getElementById("BABYLON-EDITOR-TOOLS-TOOLBAR"));

        // Toaster
        ReactDOM.render(<Toaster canEscapeKeyClear={true} position={Position.BOTTOM_LEFT} ref={this._refHandlers.getToaster}></Toaster>, document.getElementById("BABYLON-EDITOR-TOASTS"));

        // Activity Indicator
        ReactDOM.render(
            <ActivityIndicator size={25} ref={this._refHandlers.getActivityIndicator} onClick={() => this._revealAllTasks()}></ActivityIndicator>,
            document.getElementById("BABYLON-EDITOR-ACTIVITY-INDICATOR"),
        );

        // Empty touchbar
        TouchBarHelper.SetTouchBarElements([]);

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

        // Register default components
        this._components["preview"] = <Preview editor={this} />;
        this._components["inspector"] = <Inspector editor={this} />;
        this._components["assets"] = <Assets editor={this} />;
        this._components["graph"] = <Graph editor={this} />;
        this._components["console"] = <Console editor={this} />;
        this._components["assets-browser"] = <AssetsBrowser editor={this} />;

        // Retrieve preview layout state for plugins.
        try {
            const loadedPluginsItem = localStorage.getItem("babylonjs-editor-loaded-plugins");
            if (loadedPluginsItem) {
                Editor.LoadedPlugins = JSON.parse(loadedPluginsItem);
                for (const key in Editor.LoadedPlugins) {
                    const name = Editor.LoadedPlugins[key].name;
                    const plugin = Editor.LoadedPlugins[key].fullPath ? require(name) : require(`../tools/${name}`);

                    this._components[name] = <plugin.default editor={this} id={plugin.title} />;
                }
            }
        } catch (e) {
            this._resetEditor();
        }

        // Mount layout
        const layoutVersion = localStorage.getItem('babylonjs-editor-layout-version');
        const layoutStateItem = (layoutVersion === Editor.LayoutVersion) ? localStorage.getItem('babylonjs-editor-layout-state') : null;
        const layoutState = layoutStateItem ? JSON.parse(layoutStateItem) : layoutConfiguration;

        const layoutModel = Model.fromJson(layoutState);

        ReactDOM.render((
            <Layout ref={(r) => this.layout = r!} model={layoutModel} factory={(n) => this._layoutFactory(n)} />
        ), document.getElementById("BABYLON-EDITOR"), () => {
            setTimeout(() => this._init(), 0);
        });
    }

    /**
     * Called each time a FlexLayout.TabNode is mounted by React.
     */
    private _layoutFactory(node: TabNode): React.ReactNode {
        const componentName = node.getComponent();
        if (!componentName) {
            this.console.logError("Can't mount layout node without component name.");
            return <div>Error, see console...</div>;
        }

        const component = this._components[componentName];
        if (!component) {
            this.console.logError(`No react component available for "${componentName}".`);
            return <div>Error, see console...</div>;
        }

        this._layoutTabNodesConfigurations[componentName] ??= {
            componentName,
            id: node.getId(),
            name: node.getName(),
            rect: node.getRect(),
        };

        node.setEventListener("resize", (ev: { rect: Rect }) => {
            const configuration = this._layoutTabNodesConfigurations[componentName];
            configuration.rect = ev.rect;

            setTimeout(() => this.resize(), 0);
        });

        if (Editor.LoadedPlugins[componentName]) {
            node.setEventListener("close", () => {
                setTimeout(() => this.closePlugin(componentName), 0);
            });

            node.setEventListener("visibility", (p) => {
                const plugin = this.plugins[node.getName()];
                if (p.visible) {
                    plugin?.onShow();
                } else {
                    plugin?.onHide();
                }
            });
        }

        return component;
    }

    /**
     * Resizes the editor.
     */
    public resize(): void {
        this.engine!.resize();
        this.inspector.resize();
        this.assets.resize();
        this.console.resize();

        this.engine?.resize();

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
     * Returns wether or not the project is fully ready.
     */
    public get isProjectReady(): boolean {
        return this._isProjectReady;
    }

    /**
     * Returns the current size of the panel identified by the given id.
     * @param panelId the id of the panel to retrieve its size.
     */
    public getPanelSize(panelId: string): ISize {
        let configuration: Nullable<ILayoutTabNodeConfiguration> = null; // = this._layoutTabNodesConfigurations[panelId];
        for (const key in this._layoutTabNodesConfigurations) {
            if (key === panelId || this._layoutTabNodesConfigurations[key].name === panelId) {
                configuration = this._layoutTabNodesConfigurations[key];
            }
        }

        if (!configuration) {
            return { width: 0, height: 0 };
        }

        return { width: configuration.rect.width, height: configuration.rect.height };
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
     * @param message defines the message to notify.
     * @param timeout defines the time in ms before hidding the notification.
     * @param icon odefines the ptional icon to show in the toast.
     * @param intent defines the visual intent color.
     */
    public notifyMessage(message: string, timeout: number = 1000, icon: IconName | MaybeElement = "notifications", intent: Intent = "none"): void {
        this._toaster?.show({
            message,
            timeout,
            className: Classes.DARK,
            icon,
            intent,
        }, message);
    }

    /**
     * Adds a new plugin to the layout.
     * @param name the name of the plugin to laod.
     * @param openParameters defines the optional reference to the opening parameters.
     */
    public addBuiltInPlugin(name: string, openParameters: any = {}): void {
        const plugin = require(`../tools/${name}`);
        this._addPlugin(plugin, name, false, openParameters);
    }

    /**
     * Adds the given plugin to the editor's layout.
     * @param path defines the path of the plugin.
     * @param openParameters defines the optional reference to the opening parameters.
     */
    public addPluginFromPath(path: string, openParameters: any = {}): void {
        const plugin = require(path);
        this._addPlugin(plugin, path, true, openParameters);
    }

    /**
     * Closes the plugin identified by the given name.
     * @param pluginName the name of the plugin to close.
     */
    public closePlugin(pluginName: string): void {
        let effectiveKey = pluginName;
        for (const key in this._layoutTabNodesConfigurations) {
            if (this._layoutTabNodesConfigurations[key].name === pluginName) {
                effectiveKey = this._layoutTabNodesConfigurations[key].componentName;
                break;
            }
        }

        this.layout.props.model.doAction(Actions.deleteTab(effectiveKey));

        const configuration = this._layoutTabNodesConfigurations[pluginName];
        if (configuration && this.plugins[configuration.name]) {
            delete this.plugins[configuration.name];
        }

        delete this._components[effectiveKey];
        delete Editor.LoadedPlugins[effectiveKey];

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

                webPreferences: {
                    nodeIntegration: true,
                    zoomFactor: parseFloat(this.getPreferences()?.zoom ?? "1"),
                },
            },
            url: "./plugin.html",
            autofocus: true,
        });

        this._pluginWindows.push(popupId);

        ipcRenderer.once(IPCRequests.SendWindowMessage, (_, data) => {
            if (data.id === "pluginName" && data.popupId === popupId) {
                IPCTools.SendWindowMessage(popupId, "pluginName", { name, args });
            }
        });

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

        this._addPlugin(plugin, "preview", false);
    }

    /**
     * Runs the project.
     * @param integratedBrowser defines wether or not the integrated browser should be used to run the project.
     * @param https defines wether or not an HTTPS server should be used to serve the project.
     */
    public async runProject(mode: EditorPlayMode, https: boolean): Promise<void> {
        await SceneExporter.ExportFinalScene(this);

        const task = this.addTaskFeedback(0, "Running Server");
        const workspace = WorkSpace.Workspace!;

        const httpsConfig = https ? workspace.https : undefined;
        const serverResult = await IPCTools.CallWithPromise<{ ips?: string[]; error?: string }>(IPCRequests.StartGameServer, WorkSpace.DirPath!, workspace.serverPort, httpsConfig);

        this.updateTaskFeedback(task, 100);
        this.closeTaskFeedback(task, 500);

        if (serverResult?.error) {
            return this.notifyMessage(`Failed to run server: ${serverResult.error}`, 3000, null, "danger");
        }

        const protocol = https ? "https" : "http";

        this.console.logSection("Running Game Server");

        if (serverResult.ips) {
            this.console.logCustom(
                <>
                    <span style={{ color: "green" }}>Server is running:</span>
                    <ul>{serverResult.ips!.map((ip) => <li style={{ color: "green" }}>{protocol}://{ip}:{workspace.serverPort}</li>)}</ul>
                </>
            );
        } else {
            this.console.logInfo("Server is running.");
        }

        switch (mode) {
            case EditorPlayMode.EditorPanelBrowser:
                this.addBuiltInPlugin("run");
                break;
            case EditorPlayMode.IntegratedBrowser:
                this.addWindowedPlugin("run", undefined, workspace);
                break;
            case EditorPlayMode.ExternalBrowser:
                shell.openExternal(`${protocol}://localhost:${workspace.serverPort}`);
                break;
        }
    }

    /**
     * Reveals the panel identified by the given Id.
     * @param panelId the id of the panel to reveal.
     */
    public revealPanel(panelId: string): void {
        this.layout.props.model.doAction(Actions.selectTab(panelId));
    }

    /**
     * Returns the current settings of the editor.
     */
    public getPreferences(): IEditorPreferences {
        return this._preferences ?? Tools.GetEditorPreferences();
    }

    /**
     * Sets wether or not the editor's scene should be rendered.
     * @param render defines wether or not the render loop should render the editor's scene.
     */
    public runRenderLoop(render: boolean): void {
        if (!render) {
            this.engine?.stopRenderLoop();
            this.engine?.clear(new Color4(0, 0, 0, 1), true, true, true);
        } else {
            this.engine?.runRenderLoop(() => {
                this.scene!.render();
                SceneSettings.UpdateArcRotateCameraPanning();
            });
        }
    }

    /**
     * Shows the tag identified by the given name.
     * @param tabName defines the name of the tab to show.
     */
    public showTab(tabName: string): void {
        this.layout.props.model.doAction(Actions.selectTab(tabName));
    }

    /**
     * Adds the given plugin into the layout.
     */
    private _addPlugin(plugin: any, name: string, fullPath: boolean, openParameters: any = {}): void {
        if (this._components[name]) {
            this.layout.props.model.doAction(Actions.selectTab(name));
            return;
        }

        // Register plugin
        Editor.LoadedPlugins[name] = { name, fullPath };

        // Add component
        this._components[name] = <plugin.default editor={this} id={plugin.title} openParameters={openParameters} />;
        this.layout.addTabToActiveTabSet({ type: "tab", name: plugin.title, component: name, id: name });
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

        this.runRenderLoop(true);

        // Camera
        this.scene.activeCamera = SceneSettings.Camera ?? SceneSettings.GetArcRotateCamera(this);

        // Post-processes
        SceneSettings.GetSSAORenderingPipeline(this);
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
            const needsUpdate = await WorkspaceConverter.NeedsConversion(workspacePath);
            if (needsUpdate) {
                await WorkspaceConverter.Convert(this, workspacePath);
            }

            await WorkSpace.ReadWorkSpaceFile(workspacePath);
            await WorkSpace.RefreshAvailableProjects();
        }

        // Initialize assets browser
        if (workspacePath) {
            await AssetsBrowser.Init(this);
            this.assetsBrowser.setWorkspaceDirectoryPath(dirname(workspacePath));
        }

        // Get opening project
        const projectPath = workspacePath ? WorkSpace.GetProjectPath() : await Project.GetOpeningProject();
        if (projectPath) {
            await ProjectImporter.ImportProject(this, projectPath);

            // Assets
            this.assets.getComponent(TextureAssets)?.refreshCompressedTexturesFiles();
        } else {
            this.graph.refresh();
            WelcomeDialog.Show(this, false);
        }

        // Console
        this.console.overrideLogger();

        // Refresh
        this.mainToolbar.setState({ hasWorkspace: workspacePath !== null });
        this.toolsToolbar.setState({ hasWorkspace: WorkSpace.HasWorkspace() });

        // Now initialized!
        this._isInitialized = true;

        const workspace = WorkSpace.Workspace;
        if (workspace) {
            // Plugins
            for (const p in workspace.pluginsPreferences ?? {}) {
                const plugin = Editor.LoadedExternalPlugins[p];
                if (!plugin?.setWorkspacePreferences) { continue; }

                const preferences = workspace.pluginsPreferences![p];

                try {
                    plugin.setWorkspacePreferences(preferences);
                } catch (e) {
                    console.error(e);
                }
            }
        }

        // Notify!
        this.editorInitializedObservable.notifyObservers();
        this.selectedSceneObservable.notifyObservers(this.scene!);

        // If has workspace, od workspace stuffs.
        if (workspace) {
            // Set editor touch bar
            this._setTouchBar();

            // Extensions
            WebpackProgressExtension.Initialize(this);

            // First load?
            if (!(await pathExists(join(WorkSpace.DirPath!, "scenes", WorkSpace.GetProjectName())))) {
                await SceneExporter.ExportFinalScene(this);
            }

            const hasNodeModules = await pathExists(join(WorkSpace.DirPath!, "node_modules"));
            const hasPackageJson = await pathExists(join(WorkSpace.DirPath!, "package.json"));
            if (!hasNodeModules && hasPackageJson) {
                await WorkSpace.InstallAndBuild(this);
            }

            // Watch typescript project.
            await WorkSpace.WatchTypeScript(this);

            // Watch project?
            if (workspace.watchProject) {
                await WorkSpace.WatchProject(this);
            }
        }

        this._isProjectReady = true;

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

            if (ev.target !== this.graph) { this.graph.setSelected(o, ev.userInfo?.ctrlDown); }
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
        this.selectedSkeletonObservable.add((s) => this.inspector.setSelectedObject(s));

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
        // ipcRenderer.on("save-as", () => ProjectExporter.SaveAs(this));

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
            this.runProject(EditorPlayMode.IntegratedBrowser, false);
        });

        ipcRenderer.on("run-project", () => this.runProject(EditorPlayMode.IntegratedBrowser, false));
        ipcRenderer.on("generate-project", () => SceneExporter.ExportFinalScene(this));

        ipcRenderer.on("play-project", () => this.toolsToolbar.handlePlay());

        // Drag'n'drop
        document.addEventListener("dragover", (ev) => ev.preventDefault());
        document.addEventListener("drop", (ev) => {
            if (!ev.dataTransfer || !ev.dataTransfer.files.length) { return; }

            const files: IFile[] = [];
            const sources = ev.dataTransfer.files;
            for (let i = 0; i < sources.length; i++) {
                const file = sources.item(i);
                if (file) {
                    files.push({ path: file.path, name: file.name } as IFile);
                }
            }

            if (files.length) {
                // TODO: this.assets.addDroppedFiles(ev, files);
            }
        });

        // Shortcuts
        window.addEventListener("keyup", (ev) => {
            this.keyboardEventObservable.notifyObservers(new KeyboardInfo(KeyboardEventTypes.KEYUP, ev));

            if (this.preview.canvasFocused) {
                if (ev.key === "t") { return this.preview.setGizmoType(GizmoType.Position); }
                if (ev.key === "r") { return this.preview.setGizmoType(GizmoType.Rotation); }
                if (ev.key === "w") { return this.preview.setGizmoType(GizmoType.Scaling); }
                if (ev.key === "f") { return this.preview.focusSelectedNode(PreviewFocusMode.Target); }
                if (ev.key === "F") { return this.preview.focusSelectedNode(PreviewFocusMode.Target | PreviewFocusMode.Position); }
                if (ev.key === "i") { return this.preview.toggleIsolatedMode(); }

                if (ev.key === "Delete") { return this.preview.removeSelectedNode(); }

                if (ev.key === "Escape") {
                    if (this.preview.state.isIsolatedMode) { return this.preview.toggleIsolatedMode(); }
                }

                // Zoom
                if (ev.ctrlKey) {
                    if (ev.key === "0") { return this.preview.focusSelectedNode(PreviewFocusMode.Target | PreviewFocusMode.Bottom); }
                    if (ev.key === "5") { return this.preview.focusSelectedNode(PreviewFocusMode.Target | PreviewFocusMode.Top); }
                    if (ev.key === "4") { return this.preview.focusSelectedNode(PreviewFocusMode.Target | PreviewFocusMode.Left); }
                    if (ev.key === "6") { return this.preview.focusSelectedNode(PreviewFocusMode.Target | PreviewFocusMode.Right); }
                    if (ev.key === "8") { return this.preview.focusSelectedNode(PreviewFocusMode.Target | PreviewFocusMode.Back); }
                    if (ev.key === "2") { return this.preview.focusSelectedNode(PreviewFocusMode.Target | PreviewFocusMode.Front); }
                }
            }

            if (!ev.ctrlKey && SceneSettings.Camera?.metadata.detached) {
                SceneSettings.Camera.metadata.detached = false;

                for (const i in SceneSettings.Camera.inputs.attached) {
                    const input = SceneSettings.Camera.inputs.attached[i];
                    SceneSettings.Camera.inputs.attachInput(input as any);
                }
            }
        });

        window.addEventListener("keydown", (ev) => {
            this.keyboardEventObservable.notifyObservers(new KeyboardInfo(KeyboardEventTypes.KEYDOWN, ev));

            if (ev.ctrlKey && SceneSettings.Camera) {
                for (const i in SceneSettings.Camera.inputs.attached) {
                    const input = SceneSettings.Camera.inputs.attached[i];
                    input.detachControl();
                }

                SceneSettings.Camera.metadata = SceneSettings.Camera.metadata ?? {};
                SceneSettings.Camera.metadata.detached = true;
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
     * Sets the editor touch bar for Mac OS systems.
     */
    private _setTouchBar(): void {
        // Touch bar
        TouchBarHelper.SetTouchBarElements([
            {
                // label: "Generate...",
                click: "generate-project",
                iconPosition: "overlay",
                icon: "assets/extras/generate.png",
            },
            {
                // label: "Run...",
                // click: "run-project",
                iconPosition: "overlay",
                icon: "assets/extras/play.png",
                click: () => this.toolsToolbar.handlePlay(),
            },
            {
                separator: true,
            },
            {
                label: "Build...",
                click: "build-project",
            },
        ]);
    }

    /**
     * Saves the editor configuration.
     * @hidden
     */
    public _saveEditorConfig(): void {
        const config = this.layout.props.model.toJson();

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

        this.toolsToolbar?.forceUpdate();
    }

    /**
     * @hidden
     */
    public async _applyPreferences(): Promise<void> {
        this._preferences = null;
        this._preferences = this.getPreferences();

        remote.getCurrentWebContents()?.setZoomFactor(parseFloat(this._preferences.zoom ?? "1"));
        this.engine?.setHardwareScalingLevel(this._preferences.scalingLevel ?? 1);

        // Gizmo steps
        if (this._preferences.positionGizmoSnapping) {
            this.preview?.setState({ availableGizmoSteps: this._preferences.positionGizmoSnapping });
        }

        // Picker
        if (this.preview?.picker) {
            this.preview.picker.drawOverlayOnOverElement = !this._preferences.noOverlayOnDrawElement;
        }

        // Plugins
        const plugins = this._preferences.plugins ?? [];
        const pluginToolbars: IPluginToolbar[] = [];

        for (const p in Editor.LoadedExternalPlugins) {
            const pluginReference = Editor.LoadedExternalPlugins[p];
            const exists = plugins.find((p2) => p2.name === p);
            if (exists) { continue; }

            if (pluginReference.onDispose) { pluginReference.onDispose(); }

            delete Editor.LoadedExternalPlugins[p];
        }

        for (const p of plugins) {
            if (Editor.LoadedExternalPlugins[p.name]) {
                if (!p.enabled) {
                    const pluginReference = Editor.LoadedExternalPlugins[p.name];
                    if (pluginReference.onDispose) { pluginReference.onDispose(); }

                    delete Editor.LoadedExternalPlugins[p.name];
                } else {
                    pluginToolbars.push.apply(pluginToolbars, Editor.LoadedExternalPlugins[p.name].toolbar);
                }

                continue;
            }

            if (!p.enabled) { continue; }

            try {
                const exports = require(p.path);
                const plugin = exports.registerEditorPlugin(this, {
                    pluginAbsolutePath: p.path,
                } as IPluginConfiguration) as IPlugin;

                Editor.LoadedExternalPlugins[p.name] = plugin;

                // Toolbar
                if (plugin.toolbar) {
                    pluginToolbars.push.apply(pluginToolbars, plugin.toolbar);
                }

                // Inspectors
                plugin.inspectors?.forEach((i) => Inspector.RegisterObjectInspector(i));

                // Assets
                plugin.assets?.forEach((a) => {
                    if (a.itemHandler) {
                        AssetsBrowserItem.RegisterItemHandler(a.itemHandler);
                    }

                    if (a.moveItemhandler) {
                        AssetsBrowserItem.RegisterItemMoveHandler(a.moveItemhandler);
                    }
                });
            } catch (e) {
                console.error(e);
            }
        }

        this.mainToolbar?.setState({ plugins: pluginToolbars });
        this.resize();

        // Devtools
        await new Promise<void>((resolve) => {
            ipcRenderer.once(IPCResponses.EnableDevTools, () => resolve());
            ipcRenderer.send(IPCRequests.EnableDevTools, this._preferences!.developerMode);
        });

        // Assets
        this.assets.getComponent(TextureAssets)?.refreshCompressedTexturesFiles();
    }
}
