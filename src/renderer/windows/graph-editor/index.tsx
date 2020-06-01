import { ipcRenderer } from "electron";

import { Nullable, IStringDictionary } from "../../../shared/types";

import * as React from "react";
import { Button, Divider, ButtonGroup, Popover, Position, Menu, MenuItem, MenuDivider, Toaster, Intent } from "@blueprintjs/core";
import GoldenLayout from "golden-layout";

import { ISize } from "babylonjs";

import { Icon } from "../../editor/gui/icon";

import { Tools } from "../../editor/tools/tools";
import { LayoutUtils } from "../../editor/tools/layout-utils";

import { GraphCode } from "../../editor/graph/graph";
import { GraphCodeGenerator } from "../../editor/graph/generate";

import { Inspector } from "./components/inspector";
import { Preview } from "./components/preview";
import { Graph } from "./components/graph";
import { Logs } from "./components/logs";
import { CallStack } from "./components/call-stack";
import { IPCTools } from "../../editor/tools/ipc";
import { Confirm } from "../../editor/gui/confirm";

export const title = "Graph Editor";

export interface IGraphEditorWindowProps {

}

export interface IGraphEditorWindowState {
    /**
     * Defines wether or not the graph is plaging.
     */
    playing: boolean;
}

export default class GraphEditorWindow extends React.Component<IGraphEditorWindowProps, IGraphEditorWindowState> {
    /**
     * Reference to the layout used to create the editor's sections.
     */
    public layout: GoldenLayout;
    /**
     * Defines the reference to the graph.
     */
    public graph: Graph;
    /**
     * Defines the reference to the preview.
     */
    public preview: Preview;
    /**
     * Defines the reference to the logs.
     */
    public logs: Logs;
    /**
     * Defines the reference to the call stack.
     */
    public callStack: CallStack;
    /**
     * Defines the reference to the inspector.
     */
    public inspector: Inspector;
    
    private _layoutDiv: Nullable<HTMLDivElement> = null;
    private _toaster: Nullable<Toaster> = null;
    private _refHandler = {
        getLayoutDiv: (ref: HTMLDivElement) => this._layoutDiv = ref,
        getToaster: (ref: Toaster) => (this._toaster = ref),
    };

    private _path: Nullable<string> = null;
    private _components: IStringDictionary<any> = { };
    private _isSaving: boolean = false;
    private _closing: boolean = false;

    /**
     * Defines the current version of the layout.
     */
    public static readonly LayoutVersion = "3.0.0";

    /**
     * Constructor
     * @param props the component's props.
     */
    public constructor(props: any) {
        super(props);

        this.state = {
            playing: false,
        };

        GraphCode.Init();
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const file =
            <Menu>
                <MenuItem text="Load From..." icon={<Icon src="folder-open.svg" />} onClick={() => this._save()} />
                <MenuDivider />
                <MenuItem text="Save (CTRL + S)" icon={<Icon src="copy.svg" />} onClick={() => this._save()} />
            </Menu>;
        
        return (
            <>
                <div className="bp3-dark" style={{ width: "100%", height: "80px", backgroundColor: "#444444" }}>
                    <ButtonGroup style={{ paddingTop: "4px" }}>
                        <Popover content={file} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="folder-open.svg"/>} rightIcon="caret-down" text="File"/>
                        </Popover>
                    </ButtonGroup>
                    <Divider />
                    <ButtonGroup style={{ position: "relative", left: "50%", transform: "translate(-50%)" }}>
                        <Button disabled={this.state.playing} icon={<Icon src="play.svg" />} text="Play" onClick={() => this.start()} />
                        <Button disabled={!this.state.playing} icon={<Icon src="square-full.svg" />} text="Stop" onClick={() => this.stop()} />
                    </ButtonGroup>
                    <Divider />
                </div>
                <div ref={this._refHandler.getLayoutDiv} className="bp3-dark" style={{ width: "100%", height: "calc(100% - 80px)" }}></div>
                <Toaster canEscapeKeyClear={true} position={Position.TOP_RIGHT} ref={this._refHandler.getToaster}></Toaster>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public async componentDidMount(): Promise<void> {
        if (!this._layoutDiv) { return; }

        // Window configuration
        const windowDimensions = JSON.parse(localStorage.getItem("babylonjs-editor-graph-window-dimensions") ?? "null");
        if (windowDimensions) {
            window.resizeTo(windowDimensions.width, windowDimensions.height);
        }

        // Layout configuration
        const layoutVersion = localStorage.getItem('babylonjs-editor-graph-layout-version');
        const layoutStateItem = (layoutVersion === GraphEditorWindow.LayoutVersion) ? localStorage.getItem('babylonjs-editor-graph-layout-state') : null;
        const layoutState = layoutStateItem ? JSON.parse(layoutStateItem) : null;

        if (layoutState) { LayoutUtils.ConfigureLayoutContent(this, layoutState.content); }

        // Create layout
        this.layout = new GoldenLayout(layoutState ?? {
            settings: { showPopoutIcon: false, showCloseIcon: false, showMaximiseIcon: false },
            dimensions: { minItemWidth: 240, minItemHeight: 50 },
            labels: { close: "Close", maximise: "Maximize", minimise: "Minimize" },
            content: [{
                type: "row", content: [
                    { type: "column", width: 1, content: [
                        { type: "react-component", id: "inspector", component: "inspector", componentName: "Inspector", title: "Inspector", isClosable: false, props: {
                            editor: this,
                        } },
                        { type: "react-component", id: "preview", component: "preview", componentName: "Preview", title: "Preview", isClosable: false, props: {
                            editor: this,
                        } },
                        { type: "react-component", id: "logs", component: "logs", componentName: "Logs", title: "Logs", isClosable: false, props: {
                            editor: this,
                        } },
                        { type: "react-component", id: "call-stack", component: "call-stack", componentName: "Call Stack", title: "Call Stack", isClosable: false, props: {
                            editor: this,
                        } },
                    ]},
                    { type: "react-component", id: "graph", component: "graph", componentName: "graph", title: "Graph", width: 1, isClosable: false, props: {
                        editor: this,
                    } },
                ],
            }],
        }, this._layoutDiv);

        // Register layout events
        this.layout.on("componentCreated", (c) => {
            this._components[c.config.component] = c;
            c.container.on("resize", () => this.resize());
            c.container.on("show", () => this.resize());
        });

        this.layout.registerComponent("inspector", Inspector);
        this.layout.registerComponent("preview", Preview);
        this.layout.registerComponent("logs", Logs);
        this.layout.registerComponent("call-stack", CallStack);
        this.layout.registerComponent("graph", Graph);

        // Initialize layout
        try {
            await Tools.Wait(0);
            this.layout.init();
            await Tools.Wait(0);
        } catch (e) {
            localStorage.removeItem("babylonjs-editor-graph-layout-state");
            localStorage.removeItem("babylonjs-editor-graph-layout-version");
            localStorage.removeItem("babylonjs-editor-graph-window-dimensions");
        }
        // Initialize code generation
        await GraphCodeGenerator.Init();

        // Initialize components
        this.logs.clear();
        await this.graph.initGraph(this._path!);

        // Bind all events
        this._bindEvents();

        this.layout.updateSize();
    }

    /**
     * Inits the plugin.
     * @param path defines the path of the JSON graph to load.
     */
    public async init(path: string): Promise<void> {
        this._path = path;
    }

    /**
     * Called on the window is being closed.
     */
    public async onClose(e: BeforeUnloadEvent): Promise<boolean> {
        if (!this._closing) {
            e.returnValue = false;

            this._closing = await Confirm.Show("Close?", "Are you sure to close?");
            if (this._closing) {
                window.close();
            }

            return false;
        }

        IPCTools.SendWindowMessage<{ error: boolean; }>(-1, "graph-json", {
            path: this._path,
            closed: true,
        });

        return true;
    }

    /**
     * Called on the window or layout is resized.
     */
    public resize(): void {
        this.graph?.resize();
        this.preview?.resize();
        this.inspector?.resize();
        this.logs?.resize();
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
     * Starts the graph.
     */
    public async start(): Promise<void> {
        await this.preview.reset();

        this.logs.clear();
        this.graph.start(this.preview.getScene());

        this.setState({ playing: true });
    }

    /**
     * Stops the graph.
     */
    public stop(): void {
        this.graph.stop();
        this.callStack.clear();

        this.setState({ playing: false });
    }

    /**
     * Saves the current graph.
     */
    private async _save(closed: boolean = false): Promise<void> {
        if (this._isSaving) { return; }
        this._isSaving = true;

        const result = await IPCTools.SendWindowMessage<{ error: boolean; }>(-1, "graph-json", {
            path: this._path,
            json: this.graph.graph?.serialize(),
            preview: this.graph.graphCanvas?.canvas.toDataURL(),
            closed,
        });
        
        this._isSaving = false;

        if (result.data.error) {
            this._toaster?.show({ message: "Failed to save.", intent: Intent.DANGER, timeout: 1000 });
        } else {
            this._toaster?.show({ message: "Saved.", intent: Intent.SUCCESS, timeout: 1000 });
        }

        // Save state
        const config = this.layout.toConfig();
        LayoutUtils.ClearLayoutContent(this, config.content);

        localStorage.setItem("babylonjs-editor-graph-layout-state", JSON.stringify(config));
        localStorage.setItem("babylonjs-editor-graph-layout-version", GraphEditorWindow.LayoutVersion);
        localStorage.setItem("babylonjs-editor-graph-window-dimensions", JSON.stringify({ width: innerWidth, height: innerHeight }));
    }

    /**
     * Binds all the events.
     */
    private _bindEvents(): void {
        // Resize
        window.addEventListener("resize", () => {
            this.layout.updateSize();
            this.resize();
        });

        // Shortcuts
        ipcRenderer.on("save", () => this._save());
    }
}
