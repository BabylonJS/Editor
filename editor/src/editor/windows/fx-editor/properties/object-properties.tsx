import { Component, ReactNode } from "react";

import { EffectEditorObjectProperties } from "./object";
import { IEffectEditor } from "..";
import type { EffectNode } from "babylonjs-editor-tools";

export interface IEffectEditorObjectPropertiesTabProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	editor: IEffectEditor;
	onNameChanged?: () => void;
	getNodeData: (nodeId: string | number) => EffectNode | null;
}

export class EffectEditorObjectPropertiesTab extends Component<IEffectEditorObjectPropertiesTabProps> {
	public render(): ReactNode {
		const nodeId = this.props.selectedNodeId;

		if (!nodeId) {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">No node selected</p>
				</div>
			);
		}

		const nodeData = this.props.getNodeData(nodeId);

		if (!nodeData) {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">Node not found</p>
				</div>
			);
		}

		return (
			<div className="flex flex-col gap-2 w-full h-full p-2 overflow-auto">
				<EffectEditorObjectProperties
					nodeData={nodeData}
					onChange={() => {
						this.forceUpdate();
						this.props.onNameChanged?.();
					}}
				/>
			</div>
		);
	}
}
