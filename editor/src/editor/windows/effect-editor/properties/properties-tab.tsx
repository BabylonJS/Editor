import { Component, ReactNode } from "react";
import type { EffectNode } from "babylonjs-editor-tools";
import { IEffectEditor } from "..";
import { EffectEditorObjectProperties } from "./object";
import { EffectEditorEmitterShapeProperties } from "./emitter-shape";
import { EffectEditorParticleRendererProperties } from "./particle-renderer";
import { EffectEditorEmissionProperties } from "./emission";
import { EffectEditorParticleInitializationProperties } from "./particle-initialization";
import { EffectEditorBehaviorsProperties } from "./behaviors";

export interface IEffectEditorPropertiesTabProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	editor: IEffectEditor;
	tabType: "object" | "emitter" | "renderer" | "emission" | "initialization" | "behaviors";
	onNameChanged?: () => void;
	getNodeData: (nodeId: string | number) => EffectNode | null;
}

export class EffectEditorPropertiesTab extends Component<IEffectEditorPropertiesTabProps> {
	public render(): ReactNode {
		const { selectedNodeId, tabType, getNodeData, editor, onNameChanged } = this.props;

		if (!selectedNodeId) {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">{tabType === "object" ? "No node selected" : "No particle selected"}</p>
				</div>
			);
		}

		const nodeData = getNodeData(selectedNodeId);

		if (!nodeData) {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">Node not found</p>
				</div>
			);
		}

		// For groups, only show object properties
		if (nodeData.type === "group" && tabType !== "object") {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">Select a particle system</p>
				</div>
			);
		}

		// For particles, check if system exists
		if (nodeData.type === "particle" && !nodeData.system && tabType !== "object") {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">Select a particle system</p>
				</div>
			);
		}

		const commonProps = {
			nodeData,
			onChange: () => {
				this.forceUpdate();
				onNameChanged?.();
			},
		};

		switch (tabType) {
			case "object":
				return (
					<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
						<EffectEditorObjectProperties {...commonProps} />
					</div>
				);
			case "emitter":
				return (
					<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
						<EffectEditorEmitterShapeProperties {...commonProps} />
					</div>
				);
			case "renderer":
				return (
					<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
						<EffectEditorParticleRendererProperties {...commonProps} editor={editor} />
					</div>
				);
			case "emission":
				return (
					<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
						<EffectEditorEmissionProperties {...commonProps} />
					</div>
				);
			case "initialization":
				return (
					<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
						<EffectEditorParticleInitializationProperties {...commonProps} />
					</div>
				);
			case "behaviors":
				return (
					<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
						<EffectEditorBehaviorsProperties {...commonProps} />
					</div>
				);
			default:
				return null;
		}
	}
}
