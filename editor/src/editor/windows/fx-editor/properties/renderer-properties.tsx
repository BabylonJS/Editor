import { Component, ReactNode } from "react";

import { EffectEditorParticleRendererProperties } from "./particle-renderer";
import { IEffectEditor } from "..";
import type { EffectNode } from "babylonjs-editor-tools";

export interface IEffectEditorRendererPropertiesTabProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	editor: IEffectEditor;
	getNodeData: (nodeId: string | number) => EffectNode | null;
}

export class EffectEditorRendererPropertiesTab extends Component<IEffectEditorRendererPropertiesTabProps> {
	public render(): ReactNode {
		const nodeId = this.props.selectedNodeId;

		if (!nodeId) {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">No particle selected</p>
				</div>
			);
		}

		const nodeData = this.props.getNodeData(nodeId);

		if (!nodeData || nodeData.type !== "particle" || !nodeData.system) {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">Select a particle system</p>
				</div>
			);
		}

		return (
			<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
				<EffectEditorParticleRendererProperties nodeData={nodeData} editor={this.props.editor} onChange={() => this.forceUpdate()} />
			</div>
		);
	}
}
