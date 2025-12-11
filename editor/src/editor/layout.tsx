import { platform } from "os";

import { Component, ReactNode } from "react";
import { Actions, IJsonModel, Layout, Model, TabNode } from "flexlayout-react";

import { Tools } from "babylonjs";

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

export interface IEditorLayoutProps {
	/**
	 * The editor reference.
	 */
	editor: Editor;
}

export class EditorLayout extends Component<IEditorLayoutProps> {
	/**
	 * The preview of the editor.
	 */
	public preview: EditorPreview;
	/**
	 * The console of the editor.
	 */
	public console: EditorConsole;
	/**
	 * The inspector of the editor.
	 */
	public inspector: EditorInspector;
	/**
	 * The graph of the editor.
	 */
	public graph: EditorGraph;
	/**
	 * The assets browser of the editor.
	 */
	public assets: EditorAssetsBrowser;
	/**
	 * The animation editor of the editor.
	 */
	public animations: EditorAnimation;

	private _layoutRef: Layout | null = null;
	private _model: Model = Model.fromJson(layoutModel as any);
	private _components: Record<string, ReactNode> = {
		console: <EditorConsole editor={this.props.editor} ref={(r) => (this.console = r!)} />,
		preview: <EditorPreview editor={this.props.editor} ref={(r) => (this.preview = r!)} />,
		inspector: <EditorInspector editor={this.props.editor} ref={(r) => (this.inspector = r!)} />,
		graph: <EditorGraph editor={this.props.editor} ref={(r) => (this.graph = r!)} />,
		"assets-browser": <EditorAssetsBrowser editor={this.props.editor} ref={(r) => (this.assets = r!)} />,
		animations: <EditorAnimation editor={this.props.editor} ref={(r) => (this.animations = r!)} />,
	};

	private _layoutVersion: string = "5.0.0-alpha.2";

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

				<div className="relative w-full h-full">
					<Layout model={this._model} ref={(r) => (this._layoutRef = r)} factory={(n) => this._layoutFactory(n)} onModelChange={(m) => this._saveLayout(m)} />
				</div>
			</div>
		);
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
	}

	/**
	 * Makes the tab identified by the given id active.
	 * If the tab is hidden, makes it visible and selected.
	 * @param tabId defines the id of the tab to make active.
	 */
	public selectTab(tabId: "graph" | "preview" | "assets-browser" | "console" | "inspector" | (string & {})): void {
		this._layoutRef?.props.model.doAction(Actions.selectTab(tabId));
	}

	/**
	 * Adds a new tab to the layout.
	 * @param title defines the title of the tab.
	 * @param component defines the reference to the React component to draw in.
	 */
	public addLayoutTab(title: string, component: ReactNode): void {
		const id = Tools.RandomId();

		this._components[id] = component;
		this._layoutRef?.addTabToActiveTabSet({
			id,
			name: title,
			type: "tab",
			component: id,
		});
	}
}
