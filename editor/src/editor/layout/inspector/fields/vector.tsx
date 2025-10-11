import { useState } from "react";
import { MdOutlineInfo } from "react-icons/md";

import { IVector4Like } from "babylonjs";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { IEditorInspectorFieldProps } from "./field";
import { EditorInspectorNumberField } from "./number";

export interface IEditorInspectorVectorFieldProps extends IEditorInspectorFieldProps {
	step?: number;
	asDegrees?: boolean;

	grayLabel?: boolean;

	min?: number | number[];
	max?: number | number[];

	onChange?: () => void;
	onFinishChange?: () => void;
}

export function EditorInspectorVectorField(props: IEditorInspectorVectorFieldProps) {
	const value = props.object[props.property] as IVector4Like;

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
								<TooltipContent className="bg-muted text-muted-foreground text-sm p-2">{props.tooltip}</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
			</div>

			<div className="flex">
				<EditorInspectorNumberField
					object={props.object}
					property={`${props.property}.x`}
					noUndoRedo={props.noUndoRedo}
					asDegrees={props.asDegrees}
					step={props.step}
					min={props.min?.[0] ?? props.min}
					max={props.max?.[0] ?? props.max}
					onChange={() => props.onChange?.()}
					onFinishChange={() => props.onFinishChange?.()}
				/>

				<EditorInspectorNumberField
					object={props.object}
					property={`${props.property}.y`}
					noUndoRedo={props.noUndoRedo}
					asDegrees={props.asDegrees}
					step={props.step}
					min={props.min?.[1] ?? props.min}
					max={props.max?.[1] ?? props.max}
					onChange={() => props.onChange?.()}
					onFinishChange={() => props.onFinishChange?.()}
				/>

				{(value.z !== undefined || value.w !== undefined) && (
					<EditorInspectorNumberField
						object={props.object}
						property={`${props.property}.z`}
						noUndoRedo={props.noUndoRedo}
						asDegrees={props.asDegrees}
						step={props.step}
						min={props.min?.[2] ?? props.min}
						max={props.max?.[2] ?? props.max}
						onChange={() => props.onChange?.()}
						onFinishChange={() => props.onFinishChange?.()}
					/>
				)}

				{value.w !== undefined && (
					<EditorInspectorNumberField
						object={props.object}
						property={`${props.property}.w`}
						noUndoRedo={props.noUndoRedo}
						asDegrees={props.asDegrees}
						step={props.step}
						min={props.min?.[3] ?? props.min}
						max={props.max?.[3] ?? props.max}
						onChange={() => props.onChange?.()}
						onFinishChange={() => props.onFinishChange?.()}
					/>
				)}
			</div>
		</div>
	);
}
