import { ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";

import { Button } from "../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";
import { HiOutlineTrash } from "react-icons/hi2";
import { IoAddSharp } from "react-icons/io5";

import type { VFXEffectNode } from "../VFX";
import { VFXParticleSystem, VFXSolidParticleSystem } from "../VFX";
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

	// Get behavior configurations from system
	let behaviorConfigs: any[] = [];
	if (system instanceof VFXParticleSystem) {
		behaviorConfigs = system.behaviorConfigs || [];
	} else if (system instanceof VFXSolidParticleSystem) {
		behaviorConfigs = system.behaviorConfigs || [];
	}

	const handleAddBehavior = (behaviorType: string): void => {
		const newBehavior = createDefaultBehaviorData(behaviorType);
		newBehavior.id = `behavior-${Date.now()}-${Math.random()}`;

		// Directly modify the array - proxy will automatically update functions
		behaviorConfigs.push(newBehavior);
		onChange();
	};

	const handleRemoveBehavior = (index: number): void => {
		// Directly modify the array - proxy will automatically update functions
		behaviorConfigs.splice(index, 1);
		onChange();
	};

	const handleBehaviorChange = (): void => {
		// When behavior properties change, the proxy automatically detects it
		// and updates the behavior functions. We just need to trigger UI update.
		onChange();
	};

	return (
		<>
			{behaviorConfigs.length === 0 && <div className="px-2 text-muted-foreground">No behaviors. Click "Add Behavior" to add one.</div>}
			{behaviorConfigs.map((behavior, index) => {
				const definition = getBehaviorDefinition(behavior.type);
				const title = definition?.label || behavior.type || `Behavior ${index + 1}`;

				return (
					<EditorInspectorSectionField
						key={behavior.id || `behavior-${index}`}
						title={
							<div className="flex items-center justify-between w-full">
								<span>{title}</span>
								<Button
									variant="ghost"
									className="p-2 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
									onClick={(e) => {
										e.stopPropagation();
										handleRemoveBehavior(index);
									}}
								>
									<HiOutlineTrash className="w-4 h-4" />
								</Button>
							</div>
						}
					>
						<BehaviorProperties behavior={behavior} onChange={handleBehaviorChange} />
					</EditorInspectorSectionField>
				);
			})}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="secondary" className="flex items-center gap-2 w-full">
						<IoAddSharp className="w-6 h-6" /> Add Behavior
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					{Object.values(BehaviorRegistry).map((definition) => (
						<DropdownMenuItem key={definition.type} onClick={() => handleAddBehavior(definition.type)}>
							{definition.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
