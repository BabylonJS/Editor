import { Component, ReactNode } from "react";

import { EditorInspectorSectionField } from "../../layout/inspector/fields/section";

import { FXEditorObjectProperties } from "./properties/object";
import { FXEditorEmitterShapeProperties } from "./properties/emitter-shape";
import { FXEditorParticleRendererProperties } from "./properties/particle-renderer";
import { FXEditorEmissionProperties } from "./properties/emission";
import { FXEditorParticleInitializationProperties } from "./properties/particle-initialization";
import { FXEditorBehaviorsProperties } from "./properties/behaviors";
import { IFXEditor } from ".";
import type { VFXEffectNode } from "./VFX";

export interface IFXEditorPropertiesProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	editor: IFXEditor;
	onNameChanged?: () => void;
	getNodeData: (nodeId: string | number) => VFXEffectNode | null;
}

export interface IFXEditorPropertiesState {}

export class FXEditorProperties extends Component<IFXEditorPropertiesProps, IFXEditorPropertiesState> {
	public constructor(props: IFXEditorPropertiesProps) {
		super(props);
		this.state = {};
	}

	public componentDidUpdate(prevProps: IFXEditorPropertiesProps): void {
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
				<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
					<EditorInspectorSectionField title="Object">
						<FXEditorObjectProperties
							nodeData={nodeData}
							onChange={() => {
								this.forceUpdate();
								this.props.onNameChanged?.();
							}}
						/>
					</EditorInspectorSectionField>
				</div>
			);
		}

		// For particles, show all properties
		if (nodeData.type === "particle" && nodeData.system) {
			return (
				<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
					<EditorInspectorSectionField title="Object">
						<FXEditorObjectProperties
							nodeData={nodeData}
							onChange={() => {
								this.forceUpdate();
								this.props.onNameChanged?.();
							}}
						/>
					</EditorInspectorSectionField>

					<EditorInspectorSectionField title="Emitter Shape">
						<FXEditorEmitterShapeProperties nodeData={nodeData} onChange={() => this.forceUpdate()} />
					</EditorInspectorSectionField>

					<EditorInspectorSectionField title="Particle Renderer">
						<FXEditorParticleRendererProperties nodeData={nodeData} editor={this.props.editor} onChange={() => this.forceUpdate()} />
					</EditorInspectorSectionField>

					<EditorInspectorSectionField title="Emission">
						<FXEditorEmissionProperties nodeData={nodeData} onChange={() => this.forceUpdate()} />
					</EditorInspectorSectionField>

					<EditorInspectorSectionField title="Particle Initialization">
						<FXEditorParticleInitializationProperties nodeData={nodeData} onChange={() => this.forceUpdate()} />
					</EditorInspectorSectionField>

					<EditorInspectorSectionField title="Behaviors">
						<FXEditorBehaviorsProperties nodeData={nodeData} onChange={() => this.forceUpdate()} />
					</EditorInspectorSectionField>
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
