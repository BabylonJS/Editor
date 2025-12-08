import { Component, ReactNode } from "react";
import { IJsonModel, Layout, Model, TabNode } from "flexlayout-react";

import { waitNextAnimationFrame } from "../../../tools/tools";

import { FXEditorPreview } from "./preview";
import { FXEditorGraph } from "./graph";
import { FXEditorAnimation } from "./animation";
import { FXEditorProperties } from "./properties";
import { FXEditorResources } from "./resources";

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
}

export interface IFXEditorLayoutState {
	selectedNodeId: string | number | null;
	resources: any[];
}

export class FXEditorLayout extends Component<IFXEditorLayoutProps, IFXEditorLayoutState> {
	public preview: FXEditorPreview;
	public graph: FXEditorGraph;
	public animation: FXEditorAnimation;
	public properties: FXEditorProperties;
	public resources: FXEditorResources;

	private _model: Model = Model.fromJson(layoutModel as any);

	private _components: Record<string, React.ReactNode> = {};

	public constructor(props: IFXEditorLayoutProps) {
		super(props);

		this.state = {
			selectedNodeId: null,
			resources: [],
		};
	}

	public componentDidMount(): void {
		this._updateComponents();
	}

	public componentDidUpdate(): void {
		this._updateComponents();
	}

	private _handleNodeSelected = (nodeId: string | number | null): void => {
		this.setState({ selectedNodeId: nodeId }, () => {
			// Force update properties component after state change
			if (this.properties) {
				this.properties.forceUpdate();
			}
		});
	};

	private _updateComponents(): void {
		this._components = {
			preview: (
				<FXEditorPreview
					ref={(r) => (this.preview = r!)}
					filePath={this.props.filePath}
					onSceneReady={(scene) => {
						// Update graph when scene is ready
						if (this.graph) {
							this.graph.forceUpdate();
						}
					}}
				/>
			),
			graph: (
				<FXEditorGraph
					ref={(r) => (this.graph = r!)}
					filePath={this.props.filePath}
					onNodeSelected={this._handleNodeSelected}
					scene={this.preview?.scene || undefined}
					onResourcesLoaded={(resources) => {
						this.setState({ resources });
					}}
				/>
			),
			resources: (
				<FXEditorResources
					ref={(r) => (this.resources = r!)}
					resources={this.state.resources}
				/>
			),
			animation: <FXEditorAnimation ref={(r) => (this.animation = r!)} filePath={this.props.filePath} />,
			properties: (
				<FXEditorProperties
					key={this.state.selectedNodeId || "none"}
					ref={(r) => (this.properties = r!)}
					filePath={this.props.filePath}
					selectedNodeId={this.state.selectedNodeId}
					scene={this.preview?.scene || undefined}
					onNameChanged={() => {
						// Update graph node names when name changes
						if (this.graph) {
							this.graph.updateNodeNames();
						}
					}}
					getOrCreateParticleData={(nodeId) => this.graph?.getOrCreateParticleData(nodeId)!}
					getOrCreateGroupData={(nodeId) => this.graph?.getOrCreateGroupData(nodeId)!}
					isGroupNode={(nodeId) => this.graph?.isGroupNode(nodeId) ?? false}
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

		const component = this._components[componentName];
		if (!component) {
			return <div>Error, see console...</div>;
		}

		node.setEventListener("resize", () => {
			waitNextAnimationFrame().then(() => this.preview?.resize());
		});

		return component;
	}
}
