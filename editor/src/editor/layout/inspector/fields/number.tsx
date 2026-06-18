import { useEffect, useState } from "react";
import { MdOutlineInfo } from "react-icons/md";

import { useEventListener } from "usehooks-ts";

import { Scalar, Tools } from "babylonjs";

import Mexp from "math-expression-evaluator";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

const mexp = new Mexp();

export interface IEditorInspectorNumberFieldProps extends IEditorInspectorFieldProps {
	min?: number;
	max?: number;

	step?: number;
	asDegrees?: boolean;

	grayLabel?: boolean;

	onChange?: (value: number) => void;
	onFinishChange?: (value: number, oldValue: number) => void;
}

export function EditorInspectorNumberField(props: IEditorInspectorNumberFieldProps) {
	const [shiftDown, setShiftDown] = useState(false);
	const [pointerOver, setPointerOver] = useState(false);

	const [warning, setWarning] = useState(false);

	const step = props.step ?? 0.01;
	const digitCount = props.step?.toString().split(".")[1]?.length ?? 2;

	const [value, setValue] = useState<string>(getStartValue());
	const [oldValue, setOldValue] = useState<string>(getStartValue());

	useEffect(() => {
		setValue(getStartValue());
		setOldValue(getStartValue());
	}, [props.object, props.property, props.step]);

	useEventListener("keydown", (ev) => {
		if (ev.key === "Shift") {
			setShiftDown(true);
		}
	});

	useEventListener("keyup", (ev) => {
		if (ev.key === "Shift") {
			setShiftDown(false);
		}
	});

	function getStartValue() {
		let startValue = getInspectorPropertyValue(props.object, props.property) ?? 0;
		if (props.asDegrees) {
			startValue = Tools.ToDegrees(startValue);
		}

		// Determine if the value should be fixed at "step" digit counts or kept as-is.
		// if (props.asDegrees) {
		//     startValue = Tools.ToDegrees(startValue).toFixed(digitCount);
		// } else {
		//     startValue = startValue.toFixed(digitCount);
		// }

		return startValue;
	}

	function getRatio() {
		let finalValue = parseFloat(value);
		if (isNaN(finalValue)) {
			finalValue = 0;
		}

		if (props.asDegrees) {
			finalValue = Tools.ToRadians(finalValue);
		}

		const ratio = Scalar.InverseLerp(props.min!, props.max!, finalValue) * 100;
		return ratio.toFixed(0);
	}

	function getFinalValueOf(v: number) {
		if (props.asDegrees) {
			return Tools.ToRadians(v);
		}

		return v;
	}

	function getMinMaxValueOf(v: number) {
		if (props.asDegrees) {
			return Tools.ToDegrees(v);
		}

		return v;
	}

	const hasMinMax = props.min !== undefined && props.max !== undefined;
	const ratio = hasMinMax ? getRatio() : 0;

	return (
		<div className="flex gap-2 items-center px-2" onMouseOver={() => setPointerOver(true)} onMouseLeave={() => setPointerOver(false)}>
			{props.label && (
				<div className="flex items-center gap-2 w-1/3 text-ellipsis overflow-hidden whitespace-nowrap">
					<div
						className={`
                            ${props.grayLabel && !pointerOver ? "text-muted" : ""}
                            transition-all duration-300 ease-in-out
                        `}
					>
						{props.label}
					</div>

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
			)}

			<input
				type="text"
				value={value}
				onChange={(ev) => {
					setValue(ev.currentTarget.value);

					let float = parseFloat(ev.currentTarget.value);

					try {
						float = mexp.eval(ev.currentTarget.value);
					} catch (e) {
						// Catch silently.
					}

					if (!isNaN(float)) {
						float = getFinalValueOf(float);

						if (props.min !== undefined && float < props.min) {
							return setWarning(true);
						}

						if (props.max !== undefined && float > props.max) {
							return setWarning(true);
						}

						setWarning(false);

						setInspectorEffectivePropertyValue(props.object, props.property, float);
						props.onChange?.(float);
					}
				}}
				style={{
					cursor: "ew-resize",
					background:
						hasMinMax && !warning
							? `linear-gradient(to right, hsl(var(--muted-foreground) / 0.5) ${ratio}%, hsl(var(--muted-foreground) / 0.1) ${ratio}%, hsl(var(--muted-foreground) / 0.1) 100%)`
							: undefined,
				}}
				className={`
					px-5 py-2 rounded-lg bg-muted-foreground/10 outline-none ring-yellow-500
					${warning ? "ring-2 bg-background" : "ring-0"}
					${props.label ? "w-2/3" : "w-full"}
					transition-all duration-300 ease-in-out
				`}
				onKeyUp={(ev) => ev.key === "Enter" && ev.currentTarget.blur()}
				onBlur={(ev) => {
					if (ev.currentTarget.value !== oldValue) {
						let newValueFloat = parseFloat(ev.currentTarget.value);
						try {
							newValueFloat = mexp.eval(ev.currentTarget.value);
						} catch (e) {
							// Catch silently.
						}

						if (props.min !== undefined && newValueFloat < props.min) {
							return setWarning(true);
						}

						if (props.max !== undefined && newValueFloat > props.max) {
							return setWarning(true);
						}

						let oldValueFloat = parseFloat(oldValue);
						try {
							oldValueFloat = mexp.eval(oldValue);
						} catch (e) {
							// Catch silently.
						}

						if (!isNaN(oldValueFloat) && !isNaN(newValueFloat)) {
							if (props.asDegrees) {
								oldValueFloat = Tools.ToRadians(oldValueFloat);
								newValueFloat = Tools.ToRadians(newValueFloat);
							}

							if (!props.noUndoRedo) {
								registerSimpleUndoRedo({
									object: props.object,
									property: props.property,

									oldValue: oldValueFloat,
									newValue: newValueFloat,
								});
							}

							setOldValue(ev.currentTarget.value);
						}

						props.onFinishChange?.(newValueFloat, oldValueFloat);
					}
				}}
				onPointerDown={(ev) => {
					document.body.style.cursor = "ew-resize";

					let v = parseFloat(value);
					if (isNaN(v)) {
						v = 0;
					}

					let finalValue = v;
					if (props.asDegrees) {
						finalValue = Tools.ToRadians(finalValue);
					}

					if (props.min !== undefined && finalValue < props.min) {
						v = props.min;
					}

					if (props.max !== undefined && finalValue > props.max) {
						v = props.max;
					}

					const oldV = v;

					ev.currentTarget.requestPointerLock();

					let mouseUpListener: () => void;
					let mouseMoveListener: (ev: MouseEvent) => void;

					document.body.addEventListener(
						"mousemove",
						(mouseMoveListener = (ev) => {
							v += ev.movementX * step * (shiftDown ? 10 : 1);

							let finalValue = v;
							if (props.asDegrees) {
								finalValue = Tools.ToRadians(finalValue);
							}

							if (props.min !== undefined && finalValue < props.min) {
								finalValue = props.min;
								v = getMinMaxValueOf(props.min);
							}

							if (props.max !== undefined && finalValue > props.max) {
								finalValue = props.max;
								v = getMinMaxValueOf(props.max);
							}

							setWarning(false);
							setValue(v.toFixed(digitCount));

							setInspectorEffectivePropertyValue(props.object, props.property, finalValue);
							props.onChange?.(finalValue);
						})
					);

					document.body.addEventListener(
						"mouseup",
						(mouseUpListener = () => {
							document.exitPointerLock();

							if (v !== oldV && !props.noUndoRedo) {
								setValue(v.toFixed(digitCount));

								let finalValue = v;
								if (props.asDegrees) {
									finalValue = Tools.ToRadians(finalValue);
								}

								if (!isNaN(v) && !isNaN(oldV)) {
									const oldValue = props.asDegrees ? Tools.ToRadians(oldV) : oldV;

									registerSimpleUndoRedo({
										object: props.object,
										property: props.property,

										newValue: finalValue,
										oldValue,
									});

									setOldValue(v.toFixed(digitCount));

									props.onFinishChange?.(finalValue, oldValue);
								}
							}

							document.body.style.cursor = "auto";

							document.body.removeEventListener("mouseup", mouseUpListener);
							document.body.removeEventListener("mousemove", mouseMoveListener);
						})
					);
				}}
			/>
		</div>
	);
}
