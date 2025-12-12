import { Component, ReactNode } from "react";
import { IJsonModel, Layout, Model, TabNode } from "flexlayout-react";

import { waitNextAnimationFrame } from "../../../tools/tools";

import { FXEditorPreview } from "./preview";
import { FXEditorGraph } from "./graph";
import { FXEditorAnimation } from "./animation";
import { FXEditorProperties } from "./properties";
import { FXEditorResources } from "./resources";
import { IFXEditor } from ".";

const layoutModel: IJsonModel = {
	global: {
		tabSetEnableMaximize: true,
		tabEnableRename: false,
		tabSetMinHeight: 50,
		tabSetMinWidth: 240,
		enableEdgeDock: false,
	},
	layout: {
		type: "row",
		width: 100,
		height: 100,
		children: [
			{
				type: "row",
				weight: 75,
				children: [
					{
						type: "tabset",
						weight: 75,
						children: [
							{
								type: "tab",
								id: "preview",
								name: "Preview",
								component: "preview",
								enableClose: false,
								enableRenderOnDemand: false,
							},
						],
					},
					{
						type: "tabset",
						weight: 25,
						children: [
							{
								type: "tab",
								id: "animation",
								name: "Animation",
								component: "animation",
								enableClose: false,
								enableRenderOnDemand: false,
							},
						],
					},
				],
			},
			{
				type: "row",
				weight: 25,
				children: [
					{
						type: "tabset",
						weight: 40,
						children: [
							{
								type: "tab",
								id: "graph",
								name: "Particles",
								component: "graph",
								enableClose: false,
								enableRenderOnDemand: false,
							},
							{
								type: "tab",
								id: "resources",
								name: "Resources",
								component: "resources",
								enableClose: false,
								enableRenderOnDemand: false,
							},
						],
					},
					{
						type: "tabset",
						weight: 60,
						children: [
							{
								type: "tab",
								id: "properties",
								name: "Properties",
								component: "properties",
								enableClose: false,
								enableRenderOnDemand: false,
							},
						],
					},
				],
			},
		],
	},
};

export interface IFXEditorLayoutProps {
	filePath: string | null;
	editor: IFXEditor;
}

export interface IFXEditorLayoutState {
	selectedNodeId: string | number | null;
	resources: any[];
	propertiesKey: number;
}

export class FXEditorLayout extends Component<IFXEditorLayoutProps, IFXEditorLayoutState> {
	private _model: Model = Model.fromJson(layoutModel as any);

	private _components: Record<string, React.ReactNode> = {};

	public constructor(props: IFXEditorLayoutProps) {
		super(props);

		this.state = {
			selectedNodeId: null,
			resources: [],
			propertiesKey: 0,
		};
	}

	public componentDidMount(): void {
		this._updateComponents();
	}

	public componentDidUpdate(): void {
		this._updateComponents();
	}

	private _handleNodeSelected = (nodeId: string | number | null): void => {
		this.setState(
			(prevState) => ({
				selectedNodeId: nodeId,
				propertiesKey: prevState.propertiesKey + 1, // Increment key to force component recreation
			}),
			() => {
				// Update components immediately after state change
				this._updateComponents();
				// Force update properties component after state change
				if (this.props.editor.properties) {
					this.props.editor.properties.forceUpdate();
				}
				// Force update layout to ensure flexlayout-react sees the new component
				this.forceUpdate();
			}
		);
	};

	private _updateComponents(): void {
		this._components = {
			preview: (
				<FXEditorPreview
					ref={(r) => (this.props.editor.preview = r!)}
					filePath={this.props.filePath}
					onSceneReady={() => {
						// Update graph when scene is ready
						if (this.props.editor.graph) {
							this.props.editor.graph.forceUpdate();
						}
					}}
				/>
			),
			graph: (
				<FXEditorGraph
					ref={(r) => (this.props.editor.graph = r!)}
					filePath={this.props.filePath}
					onNodeSelected={this._handleNodeSelected}
					editor={this.props.editor}
					// onResourcesLoaded={(resources) => {
					// 	this.setState({ resources });
					// }}
				/>
			),
			resources: <FXEditorResources ref={(r) => (this.props.editor.resources = r!)} resources={this.state.resources} />,
			animation: <FXEditorAnimation ref={(r) => (this.props.editor.animation = r!)} filePath={this.props.filePath} editor={this.props.editor} />,
			properties: (
				<FXEditorProperties
					key={`properties-${this.state.selectedNodeId || "none"}-${this.state.propertiesKey}`}
					ref={(r) => (this.props.editor.properties = r!)}
					filePath={this.props.filePath}
					selectedNodeId={this.state.selectedNodeId}
					editor={this.props.editor}
					onNameChanged={() => {
						// Update graph node names when name changes
						if (this.props.editor.graph) {
							this.props.editor.graph.updateNodeNames();
						}
					}}
					getNodeData={(nodeId) => this.props.editor.graph?.getNodeData(nodeId) || null}
				/>
			),
		};
	}

	public render(): ReactNode {
		return (
			<div className="relative w-full h-full">
				<Layout model={this._model} factory={(n) => this._layoutFactory(n)} />
			</div>
		);
	}

	private _layoutFactory(node: TabNode): ReactNode {
		const componentName = node.getComponent();
		if (!componentName) {
			return <div>Error, see console...</div>;
		}

		// Always update components before returning, especially for properties tab
		// This ensures flexlayout-react gets the latest component with updated props
		if (componentName === "properties") {
			this._updateComponents();
		}

		const component = this._components[componentName];
		if (!component) {
			return <div>Error, see console...</div>;
		}

		node.setEventListener("resize", () => {
			waitNextAnimationFrame().then(() => this.props.editor.preview?.resize());
		});

		return component;
	}
}
