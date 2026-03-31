import { useEffect, useState } from "react";
import { MdOutlineInfo } from "react-icons/md";

import { useEventListener } from "usehooks-ts";

import { Scalar, Tools } from "babylonjs";

import Mexp from "math-expression-evaluator";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";
import { cn } from "../../../../ui/utils";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue, setInspectorEffectivePropertyValue } from "../../../../tools/property";

import { IEditorInspectorFieldProps } from "./field";

const mexp = new Mexp();

export interface IEditorInspectorNumberFieldProps extends Partial<IEditorInspectorFieldProps> {
	min?: number;
	max?: number;

	step?: number;
	asDegrees?: boolean;

	grayLabel?: boolean;

	onChange?: (value: number) => void;
	onFinishChange?: (value: number, oldValue: number) => void;

	/** When set, value is driven from React state; object/property and inspector mutation are skipped. */
	controlledValue?: number;
	wrapperClassName?: string;
	inputClassName?: string;
	title?: string;
}

export function EditorInspectorNumberField(props: IEditorInspectorNumberFieldProps) {
	const isControlled = props.controlledValue !== undefined;

	const [shiftDown, setShiftDown] = useState(false);
	const [pointerOver, setPointerOver] = useState(false);

	const [warning, setWarning] = useState(false);

	const step = props.step ?? 0.01;
	const digitCount = props.step?.toString().split(".")[1]?.length ?? 2;

	const [value, setValue] = useState<string>(() => formatInitial());
	const [oldValue, setOldValue] = useState<string>(() => formatInitial());

	function formatInitial(): string {
		const n = getStartValue();
		return typeof n === "number" && Number.isFinite(n) ? n.toFixed(digitCount) : String(n);
	}

	useEffect(() => {
		const n = getStartValue();
		const s = typeof n === "number" && Number.isFinite(n) ? n.toFixed(digitCount) : String(n);
		setValue(s);
		setOldValue(s);
	}, isControlled ? [props.controlledValue, props.step, props.asDegrees, digitCount] : [props.object, props.property, props.step, props.asDegrees, digitCount]);

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
		if (isControlled) {
			let v = props.controlledValue as number;
			if (props.asDegrees) {
				v = Tools.ToDegrees(v);
			}
			return v;
		}

		if (!props.object || !props.property) {
			return 0;
		}

		let startValue = getInspectorPropertyValue(props.object, props.property) ?? 0;
		if (props.asDegrees) {
			startValue = Tools.ToDegrees(startValue);
		}

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
		<div
			className={cn("flex gap-2 items-center px-2", props.wrapperClassName)}
			onMouseOver={() => setPointerOver(true)}
			onMouseLeave={() => setPointerOver(false)}
		>
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
				title={props.title}
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

						if (!isControlled && props.object && props.property) {
							setInspectorEffectivePropertyValue(props.object, props.property, float);
						}
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
				className={cn(
					"px-5 py-2 rounded-lg bg-muted-foreground/10 outline-none ring-yellow-500 transition-all duration-300 ease-in-out",
					warning ? "ring-2 bg-background" : "ring-0",
					props.label ? "w-2/3" : "w-full",
					props.inputClassName
				)}
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

							if (!props.noUndoRedo && !isControlled && props.object && props.property) {
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

							if (!isControlled && props.object && props.property) {
								setInspectorEffectivePropertyValue(props.object, props.property, finalValue);
							}
							props.onChange?.(finalValue);
						})
					);

					document.body.addEventListener(
						"mouseup",
						(mouseUpListener = () => {
							document.exitPointerLock();

							if (v !== oldV && !props.noUndoRedo && !isControlled && props.object && props.property) {
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
							} else if (v !== oldV && isControlled) {
								setValue(v.toFixed(digitCount));
								let finalValue = v;
								if (props.asDegrees) {
									finalValue = Tools.ToRadians(finalValue);
								}
								if (!isNaN(v) && !isNaN(oldV)) {
									const oldVal = props.asDegrees ? Tools.ToRadians(oldV) : oldV;
									setOldValue(v.toFixed(digitCount));
									props.onFinishChange?.(finalValue, oldVal);
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
