import { Component, ReactNode } from "react";
import { Scene } from "babylonjs";

import { EditorInspectorSectionField } from "../../layout/inspector/fields/section";

import { FXEditorObjectProperties } from "./properties/object";
import { FXEditorEmitterShapeProperties } from "./properties/emitter-shape";
import { FXEditorParticleRendererProperties } from "./properties/particle-renderer";
import { FXEditorEmissionProperties } from "./properties/emission";
import { FXEditorParticleInitializationProperties } from "./properties/particle-initialization";
import { FXEditorBehaviorsProperties, FXEditorBehaviorsDropdown } from "./properties/behaviors";
import { getOrCreateParticleData } from "./properties/data";

export interface IFXEditorPropertiesProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	scene?: Scene;
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

		const particleData = getOrCreateParticleData(this.props.selectedNodeId);

		return (
			<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
				<EditorInspectorSectionField title="Object">
					<FXEditorObjectProperties particleData={particleData} />
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
					<FXEditorParticleInitializationProperties particleData={particleData} />
				</EditorInspectorSectionField>

				<EditorInspectorSectionField
					title={
						<div className="flex items-center justify-between w-full">
							<span>Behaviors</span>
							<FXEditorBehaviorsDropdown particleData={particleData} onChange={() => this.forceUpdate()} />
						</div>
					}
				>
					<FXEditorBehaviorsProperties particleData={particleData} onChange={() => this.forceUpdate()} />
				</EditorInspectorSectionField>
			</div>
		);
	}

}
