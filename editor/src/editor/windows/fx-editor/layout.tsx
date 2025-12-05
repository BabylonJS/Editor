import { Component, ReactNode } from "react";
import { IJsonModel, Layout, Model, TabNode } from "flexlayout-react";

import { waitNextAnimationFrame } from "../../../tools/tools";

import { FXEditorPreview } from "./preview";
import { FXEditorGraph } from "./graph";
import { FXEditorAnimation } from "./animation";
import { FXEditorProperties } from "./properties";

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

export class FXEditorLayout extends Component<IFXEditorLayoutProps> {
	public preview: FXEditorPreview;
	public graph: FXEditorGraph;
	public animation: FXEditorAnimation;
	public properties: FXEditorProperties;

	private _layoutRef: Layout | null = null;
	private _model: Model = Model.fromJson(layoutModel as any);

	private _components: Record<string, React.ReactNode> = {};

	public constructor(props: IFXEditorLayoutProps) {
		super(props);

		this._components = {
			preview: <FXEditorPreview ref={(r) => (this.preview = r!)} filePath={this.props.filePath} />,
			graph: <FXEditorGraph ref={(r) => (this.graph = r!)} filePath={this.props.filePath} />,
			animation: <FXEditorAnimation ref={(r) => (this.animation = r!)} filePath={this.props.filePath} />,
			properties: <FXEditorProperties ref={(r) => (this.properties = r!)} filePath={this.props.filePath} />,
		};
	}

	public render(): ReactNode {
		return (
			<div className="relative w-full h-full">
				<Layout model={this._model} ref={(r) => (this._layoutRef = r)} factory={(n) => this._layoutFactory(n)} />
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

