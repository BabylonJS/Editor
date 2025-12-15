import { Component, ReactNode } from "react";

import { FXEditorParticleRendererProperties } from "./particle-renderer";
import { IFXEditor } from "..";
import type { VFXEffectNode } from "../VFX";

export interface IFXEditorRendererPropertiesTabProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	editor: IFXEditor;
	getNodeData: (nodeId: string | number) => VFXEffectNode | null;
}

export class FXEditorRendererPropertiesTab extends Component<IFXEditorRendererPropertiesTabProps> {
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
				<FXEditorParticleRendererProperties nodeData={nodeData} editor={this.props.editor} onChange={() => this.forceUpdate()} />
			</div>
		);
	}
}

