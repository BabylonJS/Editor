import { useState } from "react";
import { MdOutlineInfo } from "react-icons/md";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { IEditorInspectorFieldProps } from "./field";
import { EditorInspectorNumberField } from "./number";

export interface IEditorInspectorDimensionsFieldProps extends IEditorInspectorFieldProps {
	step?: number;

	grayLabel?: boolean;

	min?: number | number[];
	max?: number | number[];

	onChange?: () => void;
	onFinishChange?: () => void;
}

export function EditorInspectorDimensionsField(props: IEditorInspectorDimensionsFieldProps) {
	const [pointerOver, setPointerOver] = useState(false);

	return (
		<div className="flex gap-2 items-center px-2" onMouseOver={() => setPointerOver(true)} onMouseLeave={() => setPointerOver(false)}>
			<div
				className={`
                    w-32
                    ${props.grayLabel && !pointerOver ? "text-muted" : ""}
                    transition-all duration-300 ease-in-out
                `}
			>
				<div className="flex gap-2 items-center">
					{props.label}

					{props.tooltip && (
						<TooltipProvider delayDuration={0}>
							<Tooltip>
								<TooltipTrigger>
									<MdOutlineInfo size={24} />
								</TooltipTrigger>
								<TooltipContent className="bg-background text-muted-foreground text-sm p-2">{props.tooltip}</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
			</div>

			<div className="flex">
				<EditorInspectorNumberField
					object={props.object}
					property={`${props.property}.width`}
					noUndoRedo={props.noUndoRedo}
					step={props.step}
					min={props.min?.[0] ?? props.min}
					max={props.max?.[0] ?? props.max}
					onChange={() => props.onChange?.()}
					onFinishChange={() => props.onFinishChange?.()}
				/>

				<EditorInspectorNumberField
					object={props.object}
					property={`${props.property}.height`}
					noUndoRedo={props.noUndoRedo}
					step={props.step}
					min={props.min?.[1] ?? props.min}
					max={props.max?.[1] ?? props.max}
					onChange={() => props.onChange?.()}
					onFinishChange={() => props.onFinishChange?.()}
				/>
			</div>
		</div>
	);
}
