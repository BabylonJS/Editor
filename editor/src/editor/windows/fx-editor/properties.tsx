import { Component, ReactNode } from "react";

import { EditorInspectorSectionField } from "../../layout/inspector/fields/section";

import { FXEditorObjectProperties } from "./properties/object";
import { FXEditorEmitterShapeProperties } from "./properties/emitter-shape";
import { FXEditorParticleRendererProperties } from "./properties/particle-renderer";
import { FXEditorEmissionProperties } from "./properties/emission";
import { FXEditorParticleInitializationProperties } from "./properties/particle-initialization";
import { FXEditorBehaviorsProperties } from "./properties/behaviors";
import { IFXParticleData, IFXGroupData } from "./properties/types";
import { IFXEditor } from ".";

export interface IFXEditorPropertiesProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	editor: IFXEditor;
	onNameChanged?: () => void;
	getOrCreateParticleData: (nodeId: string | number) => IFXParticleData;
	getOrCreateGroupData: (nodeId: string | number) => IFXGroupData;
	isGroupNode: (nodeId: string | number) => boolean;
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

		// Always get fresh data from graph, don't rely on cached values
		const isGroup = this.props.isGroupNode(nodeId);

		if (isGroup) {
			// For groups, show only Object properties
			const groupData = this.props.getOrCreateGroupData(nodeId);
			// Convert group data to particle data format for Object properties component
			const groupDataAsParticle = {
				id: groupData.id,
				name: groupData.name,
				visibility: groupData.visibility,
				position: groupData.position,
				rotation: groupData.rotation,
				scale: groupData.scale,
			} as any;

			return (
				<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
					<EditorInspectorSectionField title="Object">
						<FXEditorObjectProperties 
							particleData={groupDataAsParticle} 
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
		const particleData = this.props.getOrCreateParticleData(nodeId);

		return (
			<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
				<EditorInspectorSectionField title="Object">
					<FXEditorObjectProperties 
						particleData={particleData} 
						onChange={() => {
							this.forceUpdate();
							this.props.onNameChanged?.();
						}}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Emitter Shape">
					<FXEditorEmitterShapeProperties particleData={particleData} onChange={() => this.forceUpdate()} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Particle Renderer">
					<FXEditorParticleRendererProperties particleData={particleData} editor={this.props.editor} onChange={() => this.forceUpdate()} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Emission">
					<FXEditorEmissionProperties particleData={particleData} onChange={() => this.forceUpdate()} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Particle Initialization">
					<FXEditorParticleInitializationProperties particleData={particleData} onChange={() => this.forceUpdate()} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Behaviors">
					<FXEditorBehaviorsProperties particleData={particleData} onChange={() => this.forceUpdate()} />
				</EditorInspectorSectionField>
			</div>
		);
	}
}
