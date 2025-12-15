import { Component, ReactNode } from "react";

import { FXEditorObjectProperties } from "./object";
import { IFXEditor } from "..";
import type { VFXEffectNode } from "../VFX";

export interface IFXEditorObjectPropertiesTabProps {
	filePath: string | null;
	selectedNodeId: string | number | null;
	editor: IFXEditor;
	onNameChanged?: () => void;
	getNodeData: (nodeId: string | number) => VFXEffectNode | null;
}

export class FXEditorObjectPropertiesTab extends Component<IFXEditorObjectPropertiesTabProps> {
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
				<FXEditorObjectProperties
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

