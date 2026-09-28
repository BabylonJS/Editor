import { platform } from "os";

import { Component, ReactNode } from "react";
import { ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Actions, ICloseType, IJsonModel, Layout, Model, TabNode, TabSetNode } from "flexlayout-react";

import { Observable, Tools } from "babylonjs";

import { waitNextAnimationFrame } from "../tools/tools";

import { Editor } from "./main";

import layoutModel from "./layout.json";
import { EditorGraph } from "./layout/graph";
import { EditorPreview } from "./layout/preview";
import { EditorToolbar } from "./layout/toolbar";
import { EditorConsole } from "./layout/console";
import { EditorInspector } from "./layout/inspector";
import { EditorAnimation } from "./layout/animation";
import { EditorAssetsBrowser } from "./layout/assets-browser";
import { EditorTerminal } from "./layout/terminal";
import { EditorMarketplaceBrowser } from "./layout/marketplace";
import { EditorAssistant } from "./layout/assistant";

export interface IEditorLayoutProps {
	/**
	 * The editor reference.
	 */
	editor: Editor;
}

export interface IEditorLayoutTabOptions {
	id?: string;
	title: string;

	neighborId?: "inspector" | "assets-browser";

	enableClose?: boolean;
	setAsActiveTab?: boolean;
}

export class EditorLayout extends Component<IEditorLayoutProps> {
	/**
	 * The preview of the editor.
	 */
	public preview!: EditorPreview;
	/**
	 * The console of the editor.
	 */
	public console!: EditorConsole;
	/**
	 * The inspector of the editor.
	 */
	public inspector!: EditorInspector;
	/**
	 * The graph of the editor.
	 */
	public graph!: EditorGraph;
	/**
	 * The assets browser of the editor.
	 */
	public assets!: EditorAssetsBrowser;
	/**
	 * The animation editor of the editor.
	 */
	public animations!: EditorAnimation;
	/**
	 * The terminal of the editor.
	 */
	public terminal!: EditorTerminal;
	/**
	 * The marketplace browser of the editor.
	 */
	public marketplace: EditorMarketplaceBrowser | null = null;
	/**
	 * The AI assistant docked on the right of the editor.
	 */
	public assistant: EditorAssistant | null = null;

	/**
	 * Observable for when the layout has changed.
	 */
	public onLayoutChanged: Observable<void> = new Observable<void>();

	private _layoutRef: Layout | null = null;
	private _model: Model = Model.fromJson(layoutModel as any);
	private _components: Record<string, ReactNode> = {
		console: <EditorConsole editor={this.props.editor} ref={(r) => (this.console = r!)} />,
		preview: <EditorPreview editor={this.props.editor} ref={(r) => (this.preview = r!)} />,
		inspector: <EditorInspector editor={this.props.editor} ref={(r) => (this.inspector = r!)} />,
		graph: <EditorGraph editor={this.props.editor} ref={(r) => (this.graph = r!)} />,
		"assets-browser": <EditorAssetsBrowser editor={this.props.editor} ref={(r) => (this.assets = r!)} />,
		animations: <EditorAnimation editor={this.props.editor} ref={(r) => (this.animations = r!)} />,
		terminal: <EditorTerminal editor={this.props.editor} ref={(r) => (this.terminal = r!)} />,
		marketplace: <EditorMarketplaceBrowser editor={this.props.editor} ref={(r) => (this.marketplace = r)} />,
	};

	private _layoutVersion: string = "5.0.0-alpha.3";

	private _assistantSize: number = 30;
	private _assistantLayoutSize: number | null = null;
	private _assistantPanel: ImperativePanelHandle | null = null;

	public constructor(props: IEditorLayoutProps) {
		super(props);

		try {
			const layoutData = JSON.parse(localStorage.getItem("babylonjs-editor-layout") as string);
			if (layoutData.version !== this._layoutVersion) {
				throw new Error("Resetting layout as base layout configuration changed.");
			}

			this._model = Model.fromJson(layoutData);
		} catch (e) {
			this._model = Model.fromJson(layoutModel as any);
		}
	}

	public render(): ReactNode {
		return (
			<div className={`flex flex-col w-screen h-screen ${platform() === "darwin" ? "pt-10" : ""}`}>
				<EditorToolbar editor={this.props.editor} />

				<PanelGroup direction="horizontal" className="w-full h-full min-h-0" onLayout={(sizes) => this._handleSplitLayout(sizes)}>
					<Panel id="editor-layout" order={1} minSize={30}>
						<div className="relative w-full h-full">
							<Layout model={this._model} ref={(r) => (this._layoutRef = r)} factory={(n) => this._layoutFactory(n)} onModelChange={(m) => this._saveLayout(m)} />
						</div>
					</Panel>

					<PanelResizeHandle
						disabled={!this.props.editor.state.assistantOpen}
						className={this.props.editor.state.assistantOpen ? "w-1 bg-border/40 hover:bg-primary/40 transition-colors duration-300" : "hidden"}
					/>

					<Panel
						id="editor-assistant"
						order={2}
						collapsible
						collapsedSize={0}
						minSize={15}
						maxSize={70}
						defaultSize={0}
						ref={(r) => (this._assistantPanel = r)}
						onCollapse={() => this.props.editor.setAssistantOpen(false)}
					>
						{this.props.editor.state.enableExperimentalFeatures && (
							<EditorAssistant editor={this.props.editor} open={this.props.editor.state.assistantOpen} ref={(r) => (this.assistant = r)} />
						)}
					</Panel>
				</PanelGroup>
			</div>
		);
	}

	public componentDidUpdate(): void {
		this._syncAssistantPanel();
	}

	/**
	 * Expands or collapses the panel of the assistant to match the state of the editor. The panel can only be resized
	 * once the group computed its first layout: until then, its default size already matches the state.
	 */
	private _syncAssistantPanel(): void {
		const panel = this._assistantPanel;
		if (!panel || this._assistantLayoutSize === null) {
			return;
		}

		const isOpen = this.props.editor.state.assistantOpen;
		const isCollapsed = this._assistantLayoutSize === 0;

		if (isOpen && isCollapsed) {
			panel.resize(this._assistantSize);
		} else if (!isOpen && !isCollapsed) {
			panel.collapse();
		}
	}

	private _handleSplitLayout(sizes: number[]): void {
		const isFirstLayout = this._assistantLayoutSize === null;
		const assistantSize = sizes[1] ?? 0;

		this._assistantLayoutSize = assistantSize;

		if (assistantSize > 0) {
			this._assistantSize = assistantSize;
		}

		// The assistant may have been toggled before the first layout.
		if (isFirstLayout) {
			this._syncAssistantPanel();
		}
	}

	public componentDidCatch(): void {
		localStorage.removeItem("babylonjs-editor-layout");
		window.location.reload();
	}

	private _layoutFactory(node: TabNode): ReactNode {
		const componentName = node.getComponent();
		if (!componentName) {
			return <div>Error, see console...</div>;
		}

		const component = this._components[componentName];
		if (!component) {
			setTimeout(() => {
				this._layoutRef?.props.model.doAction(Actions.deleteTab(componentName));
			}, 0);

			return <div>Error, see console...</div>;
		}

		node.setEventListener("resize", () => {
			waitNextAnimationFrame().then(() => this.preview?.resize());
		});

		return component;
	}

	private _saveLayout(model: Model): void {
		const layoutData = model.toJson() as IJsonModel & {
			version: string;
		};

		layoutData.version = this._layoutVersion;

		localStorage.setItem("babylonjs-editor-layout", JSON.stringify(layoutData));

		const trackableTabs = ["marketplace"];
		const openedTabs = trackableTabs.filter((t) => !!model.getNodeById(t));
		const prev = this.props.editor.state.openedTabs ?? [];
		const changed = openedTabs.length !== prev.length || openedTabs.some((t) => !prev.includes(t));

		if (changed) {
			this.props.editor.setState({ openedTabs }, () => this.props.editor.updateMenu());
		}

		this.onLayoutChanged.notifyObservers();
	}

	/**
	 * Returns whether or not the tab identified by the given id is maximized.
	 * @param tabId defines the id of the tab to check.
	 */
	public isTabMaximized(tabId: string): boolean {
		const node = this._model.getNodeById(tabId);
		if (!node || !(node instanceof TabNode)) {
			return false;
		}

		const parent = node.getParent();
		if (parent instanceof TabSetNode) {
			return parent.isMaximized();
		}

		return false;
	}

	/**
	 * Makes the tab identified by the given id active.
	 * If the tab is hidden, makes it visible and selected.
	 * @param tabId defines the id of the tab to make active.
	 */
	public selectTab(tabId: "graph" | "preview" | "assets-browser" | "console" | "terminal" | "inspector" | (string & {})): void {
		this._layoutRef?.props.model.doAction(Actions.selectTab(tabId));
	}

	/**
	 * Adds a new tab to the layout.
	 * @param component defines the reference to the React component to draw in.
	 * @param options defines the options of the tab such as the title etc.
	 */
	public addLayoutTab(component: ReactNode, options: IEditorLayoutTabOptions): string {
		options.id ??= Tools.RandomId();

		const activeTabId = this._layoutRef?.props.model.getActiveTabset()?.getSelectedNode()?.getId();

		let tabsetId: string | undefined;

		const existingNode = this._layoutRef?.props.model.getNodeById(options.id);
		if (existingNode) {
			tabsetId = existingNode.getParent()?.getId();

			if (tabsetId) {
				this._layoutRef?.props.model.doAction(Actions.deleteTab(options.id));
			}
		}

		if (!tabsetId && options.neighborId) {
			const neighborNode = this._layoutRef?.props.model.getNodeById(options.neighborId);
			if (neighborNode) {
				tabsetId = neighborNode.getParent()?.getId();
			}
		}

		if (!tabsetId) {
			tabsetId = this._layoutRef?.props.model.getActiveTabset()?.getId();
		}

		this._components[options.id!] = component;
		this._layoutRef?.addTabToTabSet(tabsetId!, {
			id: options.id,
			name: options.title,
			type: "tab",
			component: options.id,
			enableClose: options.enableClose,
			closeType: ICloseType.Visible,
		});

		if (activeTabId && !options.setAsActiveTab) {
			this._layoutRef?.props.model.doAction(Actions.selectTab(activeTabId));
		}

		return options.id;
	}

	/**
	 * Removes the tab identified by the given id from the layout. The react component mounted in the tab will be unmounted
	 * before the tab is removed completely to ensure proper resource cleanup.
	 * @param tabId defines the id of the tab to remove from the layout.
	 */
	public removeLayoutTab(tabId: string): void {
		const existingNode = this._layoutRef?.props.model.getNodeById(tabId);
		if (existingNode) {
			this._layoutRef?.props.model.doAction(Actions.deleteTab(tabId));
		}
	}
}
