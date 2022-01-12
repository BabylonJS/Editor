import { ipcRenderer } from "electron";
import { writeJson } from "fs-extra";
import { extname, basename } from "path";

import { Nullable, IStringDictionary, Undefinable } from "../../../shared/types";

import * as React from "react";
import { Layout, Model, TabNode, Rect } from "flexlayout-react";
import {
    Button, Divider, ButtonGroup, Popover, Position, Menu, MenuItem, MenuDivider, Toaster, Intent,
    ContextMenu, Classes,
} from "@blueprintjs/core";

import { ISize } from "babylonjs";

import { Icon } from "../../editor/gui/icon";
import { Code } from "../../editor/gui/code";
import { Alert } from "../../editor/gui/alert";
import { Confirm } from "../../editor/gui/confirm";

import { Tools } from "../../editor/tools/tools";
import { IPCTools } from "../../editor/tools/ipc";
import { undoRedo } from "../../editor/tools/undo-redo";
import { TouchBarHelper, ITouchBarButton } from "../../editor/tools/touch-bar";

import { GraphCode } from "../../editor/graph/graph";
import { GraphCodeGenerator } from "../../editor/graph/generate";

import { Logs } from "./components/logs";
import { Graph } from "./components/graph";
import { Preview } from "./components/preview";
import { Inspector } from "./components/inspector";
import { CallStack } from "./components/call-stack";

import { GraphEditorTemplate } from "./template";

import "./augmentations";

// Json
import layoutConfiguration from "./layout.json";

export interface ILayoutTabNodeConfiguration {
    /**
     * Defines the name of the layout tab node.
     */
    componentName: "preview" | "inspector" | "console" | "stack" | string;
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

export const title = "Graph Editor";

export interface IGraphEditorTemplate {
    /**
     * Defines the name of the template.
     */
    name: string;
    /**
     * Defines the path to the file.
     */
    file: string;
}

export interface IGraphEditorWindowProps {

}

export interface IGraphEditorWindowState {
    /**
     * Defines wether or not the graph is plaging.
     */
    playing: boolean;
    /**
     * Defines wether or not the graph is played in standalone mode.
     */
    standalone: boolean;
    /**
     * Defines the list of all existing templates.
     */
    templates: IGraphEditorTemplate[];
}

export default class GraphEditorWindow extends React.Component<IGraphEditorWindowProps, IGraphEditorWindowState> {
    /**
     * Reference to the layout used to create the editor's sections.
     */
    public layout: Layout;
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

    private _toaster: Nullable<Toaster> = null;
    private _refHandler = {
        getToaster: (ref: Toaster) => (this._toaster = ref),
    };

    private _path: Nullable<string> = null;
    private _linkPath: Nullable<string> = null;

    private _components: IStringDictionary<any> = {};
    private _isSaving: boolean = false;
    private _closing: boolean = false;

    /**
     * Defines the dictionary of all configurations for all tab nodes. This configuration is updated each time a node
     * event is triggered, like "resize".
     * @hidden
     */
    public readonly _layoutTabNodesConfigurations: Record<string, ILayoutTabNodeConfiguration> = {};

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
            standalone: false,
            templates: [],
        };

        this._components["graph"] = <Graph editor={this} />;
        this._components["console"] = <Logs editor={this} />;
        this._components["preview"] = <Preview editor={this} />;
        this._components["call-stack"] = <CallStack editor={this} />;
        this._components["inspector"] = <Inspector editor={this as any} toolId={Tools.RandomId()} _objectRef={null} />;

        GraphCode.Init();
        TouchBarHelper.SetTouchBarElements([]);
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const layoutVersion = localStorage.getItem("babylonjs-editor-graph-layout-version");
        const layoutStateItem = (layoutVersion === GraphEditorWindow.LayoutVersion) ? localStorage.getItem("babylonjs-editor-graph-layout-state") : null;
        const layoutState = layoutStateItem ? JSON.parse(layoutStateItem) : layoutConfiguration;

        const file = (
            <Menu>
                <MenuItem text="Load From..." icon={<Icon src="folder-open.svg" />} onClick={() => this._handleLoadFrom()} />
                <MenuDivider />
                <MenuItem text="Save (CTRL + S)" icon={<Icon src="copy.svg" />} onClick={() => this._handleSave()} />
                <MenuItem text="Save As... (CTRL + SHIFT + S)" icon={<Icon src="copy.svg" />} onClick={() => this._handleSaveAs()} />
            </Menu>
        );

        const edit = (
            <Menu>
                <MenuItem text="Undo (CTRL + Z)" icon={<Icon src="undo.svg" />} onClick={() => undoRedo.undo()} />
                <MenuItem text="Redo (CTRL + Y)" icon={<Icon src="redo.svg" />} onClick={() => undoRedo.redo()} />
                <MenuDivider />
                <MenuItem text="Clear..." icon={<Icon src="recycle.svg" />} onClick={() => this._handleClearGraph()} />
            </Menu>
        );

        const view = (
            <Menu>
                <MenuItem text="Show Generated Code..." icon="code" onClick={() => this._handleShowGeneratedCode()} />
                <MenuDivider />
                <MenuItem text="Show Infos" icon={this._getCheckedIcon(this.graph?.graphCanvas?.show_info ?? true)} onClick={() => this._handleGraphCanvasOption("show_info")} />
                <MenuItem text="Render Execution Order" icon={this._getCheckedIcon(this.graph?.graphCanvas?.render_execution_order ?? true)} onClick={() => this._handleGraphCanvasOption("render_execution_order")} />
                <MenuItem text="Render Collapsed Slots" icon={this._getCheckedIcon(this.graph?.graphCanvas?.render_collapsed_slots ?? true)} onClick={() => this._handleGraphCanvasOption("render_collapsed_slots")} />
            </Menu>
        );

        const snippets = (
            <Menu>
                <MenuItem text="Refresh..." icon="refresh" onClick={() => this._loadTemplates()} />
                <MenuDivider />
                {this.state.templates.length ? this.state.templates.map((t) => (
                    <MenuItem text={t.name} onClick={() => GraphEditorTemplate.ApplyTemplate(t, this.graph)} />
                )) : undefined}
            </Menu>
        );

        return (
            <>
                <div className="bp3-dark" style={{ width: "100%", height: "80px", backgroundColor: "#444444" }}>
                    <ButtonGroup style={{ paddingTop: "4px" }}>
                        <Popover content={file} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="folder-open.svg" />} rightIcon="caret-down" text="File" />
                        </Popover>
                        <Popover content={edit} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="edit.svg" />} rightIcon="caret-down" text="Edit" />
                        </Popover>
                        <Popover content={view} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="eye.svg" />} rightIcon="caret-down" text="View" />
                        </Popover>
                        <Popover content={snippets} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="grip-lines.svg" />} rightIcon="caret-down" text="Snippets" />
                        </Popover>
                    </ButtonGroup>
                    <Divider />
                    <ButtonGroup style={{ position: "relative", left: "50%", transform: "translate(-50%)" }}>
                        <Button disabled={this.state.playing} icon={<Icon src="play.svg" />} rightIcon="caret-down" text="Play" onContextMenu={(e) => this._handlePlayContextMenu(e)} onClick={() => this.start(false)} />
                        <Button disabled={!this.state.playing} icon={<Icon src="square-full.svg" />} text="Stop" onClick={() => this.stop()} />
                        <Button disabled={!this.state.playing} icon="reset" text="Restart" onClick={() => {
                            this.stop();
                            this.start(this.state.standalone);
                        }} />
                    </ButtonGroup>
                    <Divider />
                </div>
                <Layout ref={(r) => this.layout = r!} model={Model.fromJson(layoutState)} factory={(n) => this._layoutFactory(n)} classNameMapper={(d) => {
                    switch (d) {
                        case "flexlayout__layout": return "graphEditorFlexLayout";
                        default: return d;
                    }
                }} />
                <Toaster canEscapeKeyClear={true} position={Position.TOP_RIGHT} ref={this._refHandler.getToaster}></Toaster>
            </>
        );
    }

    /**
     * Called each time a FlexLayout.TabNode is mounted by React.
     */
    private _layoutFactory(node: TabNode): React.ReactNode {
        const componentName = node.getComponent();
        if (!componentName) {
            return <div>Error, see console...</div>;
        }

        const component = this._components[componentName];
        if (!component) {
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

        return component;
    }

    /**
     * Called on the component did mount.
     */
    public async componentDidMount(): Promise<void> {
        // Window configuration
        // const windowDimensions = JSON.parse(localStorage.getItem("babylonjs-editor-graph-window-dimensions") ?? "null");
        // if (windowDimensions) {
        //     window.resizeTo(windowDimensions.width, windowDimensions.height);

        //     const x = windowDimensions.x ?? screenLeft;
        //     const y = windowDimensions.y ?? screenTop;
        //     window.moveTo(x, y);
        // }

        // Initialize code generation
        await GraphCodeGenerator.Init();

        // Initialize components
        this.logs.clear();
        await this.graph.initGraph(this._path!);

        // Bind all events
        this._bindEvents();

        // Init templates
        await this._loadTemplates();
    }

    /**
     * Called on the component did update.
     */
    public componentDidUpdate(): void {
        const buttons: ITouchBarButton[] = [];
        if (!this.state.playing) {
            buttons.push({ label: "Play", click: () => this.start(false) });
        } else {
            buttons.push({ label: "Stop", click: () => this.stop() });
            buttons.push({ label: "Restart", click: () => {
                this.stop();
                this.start(this.state.standalone);
            } });
        }

        TouchBarHelper.SetTouchBarElements(buttons);
    }

    /**
     * Inits the plugin.
     * @param path defines the path of the JSON graph to load.
     */
    public async init(path: string, linkPath: string): Promise<void> {
        this._path = path;
        this._linkPath = linkPath;
        document.title = `${document.title} - ${basename(path)}`;
    }

    /**
     * Gets the link path of the graph in case it is attached to nodes.
     */
    public get linkPath(): Nullable<string> {
        return this._linkPath;
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
        this.logs?.resize();
        this.graph?.resize();
        this.preview?.resize();
        this.inspector?.resize();
    }

    /**
     * Returns the current size of the panel identified by the given id.
     * @param panelId the id of the panel to retrieve its size.
     */
    public getPanelSize(panelId: string): ISize {
        const panel = this._layoutTabNodesConfigurations[panelId];
        if (!panel) {
            return { width: 0, height: 0 };
        }

        return { width: panel.rect.width, height: panel.rect.height };
    }

    /**
     * Starts the graph.
     * @param standalone defines wehter or not only the current graph will be executed.
     */
    public async start(standalone: boolean): Promise<void> {
        await this.logs.clear();

        await this.preview.reset(standalone);
        await this.graph.start(this.preview.getScene());

        this.setState({ playing: true, standalone });
    }

    /**
     * Stops the graph.
     */
    public stop(): void {
        this.graph.stop();
        this.preview.stop();
        this.callStack.clear();

        this.setState({ playing: false });
    }

    /**
     * Saves the current graph.
     */
    private async _handleSave(closed: boolean = false): Promise<void> {
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
        localStorage.setItem("babylonjs-editor-graph-layout-state", JSON.stringify(this.layout.props.model.toJson()));
        localStorage.setItem("babylonjs-editor-graph-layout-version", GraphEditorWindow.LayoutVersion);
        localStorage.setItem("babylonjs-editor-graph-window-dimensions", JSON.stringify({ x: screenLeft, y: screenTop, width: innerWidth, height: innerHeight }));

        if (this.graph?.graphCanvas) {
            localStorage.setItem("babylonjs-editor-graph-preferences", JSON.stringify({
                show_info: this.graph.graphCanvas.show_info,
                render_execution_order: this.graph.graphCanvas.render_execution_order,
                render_collapsed_slots: this.graph.graphCanvas.render_collapsed_slots,
            }));
        }
    }

    /**
     * Saves the current graph as...
     */
    private async _handleSaveAs(): Promise<void> {
        const json = this.graph.graph?.serialize();
        if (!json) { return; }

        let path = await Tools.ShowSaveFileDialog("Save Graph...");
        const extension = extname(path).toLowerCase();

        if (extension !== ".json") {
            path += ".json";
        }

        await writeJson(path, json, {
            encoding: "utf-8",
            spaces: "\t",
        });
    }

    /**
     * Loads the current graph from...
     */
    private async _handleLoadFrom(): Promise<void> {
        const path = await Tools.ShowOpenFileDialog("Load Graph From...");

        try {
            const override = await Confirm.Show("Override Current Graph?", "Are you sure to override the current graph? Existing graph will be overwritten and all changes will be lost.");
            if (!override) { return; }

            this.graph.initGraph(path);
        } catch (e) {
            Alert.Show("Failed To Parse Graph", `Failed to parse graph: ${e.message}`);
        }
    }

    /**
     * Called on the user wants to change a graph canvas option.
     */
    private _handleGraphCanvasOption(option: string): void {
        if (this.graph?.graphCanvas) {
            this.graph.graphCanvas[option] = !this.graph.graphCanvas[option];
            this.graph.graphCanvas.setDirty(true, true);
        }

        this.forceUpdate();
    }

    /**
     * Called on the user right-clicks on the "play" button.
     */
    private _handlePlayContextMenu(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Play" icon={<Icon src="play.svg" />} onClick={() => this.start(false)} />
                <MenuItem text="Play Only Current Graph" icon={<Icon src="play.svg" />} onClick={() => this.start(true)} />
            </Menu>,
            { left: e.clientX, top: e.clientY },
        );
    }

    /**
     * Called on the user wants to show the generated code.
     */
    private async _handleShowGeneratedCode(): Promise<void> {
        if (!this.graph.graph) { return; }

        const code = GraphCodeGenerator.GenerateCode(this.graph.graph);
        if (!code) { return; }

        Alert.Show("Generated Code", "", undefined, (
            <Code code={code} language="typescript" readonly={true} style={{ width: "800px", height: "600px" }} />
        ), {
            style: { width: "840px", height: "700px" }
        });
    }

    /**
     * Called on the user wants to clear the graph.
     */
    private async _handleClearGraph(): Promise<void> {
        const clear = await Confirm.Show("Clear whole graph?", "Are you sure to clear the whole graph? All work will be lost.");
        if (!clear) { return; }

        const graph = this.graph.graph;
        if (!graph) { return; }

        graph.clear();
    }

    /**
     * Binds all the events.
     */
    private _bindEvents(): void {
        // Resize
        window.addEventListener("resize", () => {
            this.resize();
        });

        // Shortcuts
        ipcRenderer.on("save", () => this._handleSave());
        ipcRenderer.on("save-as", () => this._handleSaveAs());

        ipcRenderer.on("undo", () => undoRedo.undo());
        ipcRenderer.on("redo", () => undoRedo.redo());

        // Misc.
        window.focus();
    }

    /**
     * Returns the check icon if the given "checked" property is true.
     */
    private _getCheckedIcon(checked: Undefinable<boolean>): Undefinable<JSX.Element> {
        return checked ? <Icon src="check.svg" /> : undefined;
    }

    /**
     * Loads the list of all existing templates.
     */
    private async _loadTemplates(): Promise<void> {
        try {
            const templates = await GraphEditorTemplate.GetTemplatesList();
            this.setState({ templates });
        } catch (e) {
            // Catch silently.
        }
    }
}
