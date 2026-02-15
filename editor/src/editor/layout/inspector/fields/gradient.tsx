import { useState } from "react";
import { Button, Popover } from "@blueprintjs/core";
import { GradientPicker, type IGradientKey } from "../../../../ui/gradient-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";
import { MdOutlineInfo } from "react-icons/md";
import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";
import { IEditorInspectorFieldProps } from "./field";

export interface IEditorInspectorColorGradientFieldProps extends IEditorInspectorFieldProps {
	onChange?: (colorKeys: IGradientKey[], alphaKeys?: IGradientKey[]) => void;
	onFinishChange?: (colorKeys: IGradientKey[], alphaKeys?: IGradientKey[], oldColorKeys?: IGradientKey[], oldAlphaKeys?: IGradientKey[]) => void;
}

/**
 * Inspector field for editing color gradients
 * Works with objects that have colorKeys and alphaKeys properties
 * Similar to EditorInspectorColorField but for gradients
 */
export function EditorInspectorColorGradientField(props: IEditorInspectorColorGradientFieldProps) {
	// Get colorKeys and alphaKeys from object
	const getColorKeys = (): IGradientKey[] => {
		if (props.property) {
			return (getInspectorPropertyValue(props.object, `${props.property}.colorKeys`) || []) as IGradientKey[];
		}
		return ((props.object as any)?.colorKeys || []) as IGradientKey[];
	};

	const getAlphaKeys = (): IGradientKey[] => {
		if (props.property) {
			return (getInspectorPropertyValue(props.object, `${props.property}.alphaKeys`) || []) as IGradientKey[];
		}
		return ((props.object as any)?.alphaKeys || []) as IGradientKey[];
	};

	const colorKeys = getColorKeys();
	const alphaKeys = getAlphaKeys();

	const [value, setValue] = useState({ colorKeys, alphaKeys });
	const [oldValue, setOldValue] = useState({ colorKeys: [...colorKeys], alphaKeys: [...alphaKeys] });

	// Generate preview gradient CSS
	const generatePreview = (): string => {
		const sorted = [...value.colorKeys].sort((a, b) => (a.pos || 0) - (b.pos || 0));
		if (sorted.length === 0) {
			return "linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(1, 1, 1, 1) 100%)";
		}

		const stops = sorted.map((key) => {
			const pos = (key.pos || 0) * 100;
			let color = "rgba(0, 0, 0, 1)";
			if (Array.isArray(key.value)) {
				const [r, g, b, a = 1] = key.value;
				color = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
			} else if (typeof key.value === "object" && "r" in key.value) {
				const r = key.value.r * 255;
				const g = key.value.g * 255;
				const b = key.value.b * 255;
				const a = ("a" in key.value && key.value.a !== undefined ? key.value.a : 1) * 255;
				color = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
			}
			return `${color} ${pos}%`;
		});
		return `linear-gradient(to right, ${stops.join(", ")})`;
	};

	function getPopoverContent() {
		return (
			<GradientPicker
				colorKeys={value.colorKeys}
				alphaKeys={value.alphaKeys}
				onChange={(newColorKeys, newAlphaKeys) => {
					const updatedValue = { colorKeys: newColorKeys, alphaKeys: newAlphaKeys || value.alphaKeys };
					setValue(updatedValue);

					// Update object properties
					if (props.object && props.property) {
						(props.object as any)[props.property] = {
							...(props.object as any)[props.property],
							colorKeys: newColorKeys,
							alphaKeys: newAlphaKeys || value.alphaKeys,
						};
					}

					props.onChange?.(newColorKeys, newAlphaKeys);
				}}
				onFinish={(newColorKeys, newAlphaKeys) => {
					const updatedValue = { colorKeys: newColorKeys, alphaKeys: newAlphaKeys || value.alphaKeys };
					setValue(updatedValue);

					// Update object properties
					if (props.object) {
						if (props.property) {
							(props.object as any)[props.property] = {
								...(props.object as any)[props.property],
								colorKeys: newColorKeys,
								alphaKeys: newAlphaKeys || value.alphaKeys,
							};
						} else {
							(props.object as any).colorKeys = newColorKeys;
							(props.object as any).alphaKeys = newAlphaKeys || value.alphaKeys;
						}
					}

					if (!props.noUndoRedo) {
						const newValue = { colorKeys: [...newColorKeys], alphaKeys: [...(newAlphaKeys || value.alphaKeys)] };

						registerUndoRedo({
							undo: () => {
								if (props.object) {
									if (props.property) {
										(props.object as any)[props.property] = {
											...(props.object as any)[props.property],
											colorKeys: oldValue.colorKeys,
											alphaKeys: oldValue.alphaKeys,
										};
									} else {
										(props.object as any).colorKeys = oldValue.colorKeys;
										(props.object as any).alphaKeys = oldValue.alphaKeys;
									}
								}
								setValue(oldValue);
							},
							redo: () => {
								if (props.object) {
									if (props.property) {
										(props.object as any)[props.property] = {
											...(props.object as any)[props.property],
											colorKeys: newValue.colorKeys,
											alphaKeys: newValue.alphaKeys,
										};
									} else {
										(props.object as any).colorKeys = newValue.colorKeys;
										(props.object as any).alphaKeys = newValue.alphaKeys;
									}
								}
								setValue(newValue);
							},
						});

						setOldValue(newValue);
					}

					props.onFinishChange?.(newColorKeys, newAlphaKeys || value.alphaKeys, oldValue.colorKeys, oldValue.alphaKeys);
				}}
			/>
		);
	}

	return (
		<div className="flex gap-2 items-center px-2">
			<div className="flex gap-2 items-center w-32">
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

			<div className="flex">
				<Popover minimal usePortal fill hasBackdrop interactionKind="click" position="left" content={getPopoverContent()}>
					<Button
						style={{
							background: generatePreview(),
						}}
						className="h-full w-32 rounded-lg border border-border"
					/>
				</Popover>
			</div>
		</div>
	);
}
