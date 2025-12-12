import { ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";

import { Button } from "../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";
import { HiOutlineTrash } from "react-icons/hi2";
import { IoAddSharp } from "react-icons/io5";

import type { VFXEffectNode } from "../VFX";
import { BehaviorRegistry, createDefaultBehaviorData, getBehaviorDefinition } from "./behaviors/registry";
import { BehaviorProperties } from "./behaviors/behavior-properties";

export interface IFXEditorBehaviorsPropertiesProps {
	nodeData: VFXEffectNode;
	onChange: () => void;
}

export function FXEditorBehaviorsProperties(props: IFXEditorBehaviorsPropertiesProps): ReactNode {
	const { nodeData, onChange } = props;

	if (nodeData.type !== "particle" || !nodeData.system) {
		return null;
	}

	const system = nodeData.system;
	// Get behaviors from system (system.behaviors for VFXParticleSystem)
	const behaviors: any[] = (system as any).behaviors || [];

	return (
		<>
			{behaviors.length === 0 && <div className="px-2 text-muted-foreground">No behaviors. Behaviors are applied as functions to particles.</div>}
			{behaviors.map((behavior, index) => {
				// Behaviors are functions, not objects with properties
				// We can show function name or type if available
				const behaviorName = behavior.name || `Behavior ${index + 1}`;

				return (
					<EditorInspectorSectionField key={`behavior-${index}`} title={behaviorName}>
						<div className="px-2 text-sm text-muted-foreground">Behavior function (editing not yet supported)</div>
					</EditorInspectorSectionField>
				);
			})}

			{/* TODO: Add ability to add/remove behaviors */}
		</>
	);
}
