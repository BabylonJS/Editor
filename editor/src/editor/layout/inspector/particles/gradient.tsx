import { useState } from "react";

import { HiOutlineTrash } from "react-icons/hi";

import { IValueGradient } from "babylonjs";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";

import { Slider } from "../../../../ui/shadcn/ui/slider";
import { Button } from "../../../../ui/shadcn/ui/button";

import { EditorInspectorBlockField } from "../fields/block";
import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorNumberField } from "../fields/number";

export interface IGradientFieldProps {
    gradient: IValueGradient;

    onRemove: () => void;
}

export function GradientField(props: IGradientFieldProps) {
	const [gradient, setGradient] = useState(props.gradient.gradient);
	const [oldGradient, setOldGradient] = useState(props.gradient.gradient);

	const [pointerOver, setPointerOver] = useState(false);

	return (
		<EditorInspectorBlockField
			onPointerOver={() => setPointerOver(true)}
			onPointerLeave={() => setPointerOver(false)}
		>
			<div className="flex gap-2 w-full">
				{typeof props.gradient["factor1"] === "number" &&
                    <div className="flex flex-1">
                    	<EditorInspectorNumberField object={props.gradient} property="factor1" step={0.01} />
                    	<EditorInspectorNumberField object={props.gradient} property="factor2" step={0.01} />
                    </div>
				}

				{props.gradient["color1"] &&
                    <div className="flex flex-col gap-2 flex-1">
                    	<EditorInspectorColorField object={props.gradient} property="color1" label="Color 1" />
                    	<EditorInspectorColorField object={props.gradient} property="color2" label="Color 2" />
                    </div>
				}

				<Button
					variant="ghost"
					className={`
                        w-8 h-8 p-1
                        ${pointerOver ? "opacity-100" : "opacity-0"}
                        transition-all duration-300 ease-in-out
                    `}
					onClick={() => props.onRemove()}
				>
					<HiOutlineTrash className="w-5 h-5" />
				</Button>
			</div>

			<div className="flex gap-2 w-full px-2">
				<Slider
					min={0}
					max={1}
					step={0.01}
					value={[gradient]}
					className="flex-1"
					onValueChange={(value) => {
						const gradient = value[0];
						if (gradient !== oldGradient) {
							props.gradient.gradient = gradient;

							registerSimpleUndoRedo({
								object: props.gradient,
								property: "gradient",

								oldValue: oldGradient,
								newValue: gradient,
							});

							setGradient(gradient);
							setOldGradient(gradient);
						}
					}}
				/>

				<div className="w-10 text-end">
					{gradient}
				</div>
			</div>
		</EditorInspectorBlockField>
	);
}
