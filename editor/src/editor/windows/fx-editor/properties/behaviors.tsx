import { ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";

import { Button } from "../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";
import { HiOutlineTrash } from "react-icons/hi2";
import { IoAddSharp } from "react-icons/io5";

import { IFXParticleData } from "./types";
import { BehaviorRegistry, createDefaultBehaviorData, getBehaviorDefinition } from "./behaviors/registry";
import { BehaviorProperties } from "./behaviors/behavior-properties";

export interface IFXEditorBehaviorsPropertiesProps {
	particleData: IFXParticleData;
	onChange: () => void;
}

export function FXEditorBehaviorsProperties(props: IFXEditorBehaviorsPropertiesProps): ReactNode {
	const { particleData, onChange } = props;

	return (
		<>
			{particleData.behaviors.map((behavior, index) => {
				const definition = getBehaviorDefinition(behavior.type);
				const title = definition?.label || behavior.type;

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
										particleData.behaviors.splice(index, 1);
										onChange();
									}}
								>
									<HiOutlineTrash className="w-4 h-4" />
								</Button>
							</div>
						}
					>
						<BehaviorProperties behavior={behavior} onChange={onChange} />
					</EditorInspectorSectionField>
				);
			})}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="secondary" className="flex items-center gap-2 w-full">
						<IoAddSharp className="w-6 h-6" /> Add
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					{Object.values(BehaviorRegistry).map((definition) => (
						<DropdownMenuItem
							key={definition.type}
							onClick={() => {
								const behaviorData = createDefaultBehaviorData(definition.type);
								behaviorData.id = `behavior-${Date.now()}-${Math.random()}`;
								particleData.behaviors.push(behaviorData);
								onChange();
							}}
						>
							{definition.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
