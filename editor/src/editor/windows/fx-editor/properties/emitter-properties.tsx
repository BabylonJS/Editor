import { Component, ReactNode } from "react";

import { EffectEditorEmitterShapeProperties } from "./emitter-shape";
import type { EffectNode } from "babylonjs-editor-tools";

export interface IEffectEditorEmitterPropertiesTabProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	getNodeData: (nodeId: string | number) => EffectNode | null;
}

export class EffectEditorEmitterPropertiesTab extends Component<IEffectEditorEmitterPropertiesTabProps> {
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
				<EffectEditorEmitterShapeProperties nodeData={nodeData} onChange={() => this.forceUpdate()} />
			</div>
		);
	}
}
