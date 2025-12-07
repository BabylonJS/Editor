import { ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";

import { Button } from "../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";
import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";

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
					<EditorInspectorSectionField key={index} title={title}>
						<BehaviorProperties behavior={behavior} onChange={onChange} />
						<Button
							variant="destructive"
							size="sm"
							onClick={() => {
								particleData.behaviors.splice(index, 1);
								onChange();
							}}
							className="mt-2"
						>
							<AiOutlineClose className="w-4 h-4" /> Remove
						</Button>
					</EditorInspectorSectionField>
				);
			})}
		</>
	);
}

export function FXEditorBehaviorsDropdown(props: IFXEditorBehaviorsPropertiesProps): ReactNode {
	const { particleData, onChange } = props;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
					<AiOutlinePlus className="w-4 h-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{Object.values(BehaviorRegistry).map((definition) => (
					<DropdownMenuItem
						key={definition.type}
						onClick={() => {
							const behaviorData = createDefaultBehaviorData(definition.type);
							particleData.behaviors.push(behaviorData);
							onChange();
						}}
					>
						{definition.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

