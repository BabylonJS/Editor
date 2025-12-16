import { Component, ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/shadcn/ui/tabs";

import { EffectEditorObjectProperties } from "./properties/object";
import { EffectEditorEmitterShapeProperties } from "./properties/emitter-shape";
import { EffectEditorParticleRendererProperties } from "./properties/particle-renderer";
import { EffectEditorEmissionProperties } from "./properties/emission";
import { EffectEditorParticleInitializationProperties } from "./properties/particle-initialization";
import { EffectEditorBehaviorsProperties } from "./properties/behaviors";
import { IEffectEditor } from ".";
import type { EffectNode } from "babylonjs-editor-tools";

export interface IEffectEditorPropertiesProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	editor: IEffectEditor;
	onNameChanged?: () => void;
	getNodeData: (nodeId: string | number) => EffectNode | null;
}

export interface IEffectEditorPropertiesState {}

export class EffectEditorProperties extends Component<IEffectEditorPropertiesProps, IEffectEditorPropertiesState> {
	public constructor(props: IEffectEditorPropertiesProps) {
		super(props);
		this.state = {};
	}

	public componentDidUpdate(prevProps: IEffectEditorPropertiesProps): void {
		// Force update when selectedNodeId changes to ensure we show the correct node's properties
		if (prevProps.selectedNodeId !== this.props.selectedNodeId) {
			// Use setTimeout to ensure the update happens after flexlayout-react processes the change
			setTimeout(() => {
				this.forceUpdate();
			}, 0);
		}
	}

	public componentDidMount(): void {
		// Force update on mount if a node is already selected
		if (this.props.selectedNodeId) {
			this.forceUpdate();
		}
	}

	public render(): ReactNode {
		const nodeId = this.props.selectedNodeId;

		if (!nodeId) {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">No particle selected</p>
				</div>
			);
		}

		// Get node data from graph
		const nodeData = this.props.getNodeData(nodeId);

		if (!nodeData) {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">Node not found</p>
				</div>
			);
		}

		// For groups, show only Object properties
		if (nodeData.type === "group" && nodeData.group) {
			return (
				<div className="flex flex-col w-full h-full overflow-hidden">
					<Tabs defaultValue="object" className="flex flex-col w-full h-full">
						<TabsList className="w-full rounded-none border-b">
							<TabsTrigger value="object" className="flex-1">
								Object
							</TabsTrigger>
						</TabsList>
						<TabsContent value="object" className="flex-1 overflow-auto p-2 m-0">
							<EffectEditorObjectProperties
								nodeData={nodeData}
								onChange={() => {
									this.forceUpdate();
									this.props.onNameChanged?.();
								}}
							/>
						</TabsContent>
					</Tabs>
				</div>
			);
		}

		// For particles, show all properties in tabs
		if (nodeData.type === "particle" && nodeData.system) {
			return (
				<div className="flex flex-col w-full h-full overflow-hidden">
					<Tabs defaultValue="object" className="flex flex-col w-full h-full">
						<TabsList className="w-full rounded-none border-b grid grid-cols-6">
							<TabsTrigger value="object" className="text-xs">
								Object
							</TabsTrigger>
							<TabsTrigger value="emitter" className="text-xs">
								Emitter
							</TabsTrigger>
							<TabsTrigger value="renderer" className="text-xs">
								Renderer
							</TabsTrigger>
							<TabsTrigger value="emission" className="text-xs">
								Emission
							</TabsTrigger>
							<TabsTrigger value="initialization" className="text-xs">
								Initialization
							</TabsTrigger>
							<TabsTrigger value="behaviors" className="text-xs">
								Behaviors
							</TabsTrigger>
						</TabsList>

						<TabsContent value="object" className="flex-1 overflow-auto p-2 m-0">
							<EffectEditorObjectProperties
								nodeData={nodeData}
								onChange={() => {
									this.forceUpdate();
									this.props.onNameChanged?.();
								}}
							/>
						</TabsContent>

						<TabsContent value="emitter" className="flex-1 overflow-auto p-2 m-0">
							<EffectEditorEmitterShapeProperties nodeData={nodeData} onChange={() => this.forceUpdate()} />
						</TabsContent>

						<TabsContent value="renderer" className="flex-1 overflow-auto p-2 m-0">
							<EffectEditorParticleRendererProperties nodeData={nodeData} editor={this.props.editor} onChange={() => this.forceUpdate()} />
						</TabsContent>

						<TabsContent value="emission" className="flex-1 overflow-auto p-2 m-0">
							<EffectEditorEmissionProperties nodeData={nodeData} onChange={() => this.forceUpdate()} />
						</TabsContent>

						<TabsContent value="initialization" className="flex-1 overflow-auto p-2 m-0">
							<EffectEditorParticleInitializationProperties nodeData={nodeData} onChange={() => this.forceUpdate()} />
						</TabsContent>

						<TabsContent value="behaviors" className="flex-1 overflow-auto p-2 m-0">
							<EffectEditorBehaviorsProperties nodeData={nodeData} onChange={() => this.forceUpdate()} />
						</TabsContent>
					</Tabs>
				</div>
			);
		}

		return (
			<div className="flex items-center justify-center w-full h-full bg-tertiary">
				<p className="text-tertiary-foreground">Invalid node type</p>
			</div>
		);
	}
}
