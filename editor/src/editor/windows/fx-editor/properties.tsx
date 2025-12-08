import { Component, ReactNode } from "react";
import { Scene } from "babylonjs";

import { EditorInspectorSectionField } from "../../layout/inspector/fields/section";

import { FXEditorObjectProperties } from "./properties/object";
import { FXEditorEmitterShapeProperties } from "./properties/emitter-shape";
import { FXEditorParticleRendererProperties } from "./properties/particle-renderer";
import { FXEditorEmissionProperties } from "./properties/emission";
import { FXEditorParticleInitializationProperties } from "./properties/particle-initialization";
import { FXEditorBehaviorsProperties } from "./properties/behaviors";
import { IFXParticleData, IFXGroupData } from "./properties/types";

export interface IFXEditorPropertiesProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	scene?: Scene;
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

	public render(): ReactNode {
		if (!this.props.selectedNodeId) {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">No particle selected</p>
				</div>
			);
		}

		// Check if this is a group by checking if group data exists
		const nodeId = this.props.selectedNodeId;
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
					<FXEditorParticleRendererProperties particleData={particleData} scene={this.props.scene} onChange={() => this.forceUpdate()} />
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
