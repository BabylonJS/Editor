import { ReactNode, MouseEvent, useState, useRef, useEffect } from "react";
import { Color3, Color4 } from "babylonjs";
import { ColorPicker } from "./color-picker";
import { Button } from "../ui/shadcn/ui/button";
import { AiOutlineClose } from "react-icons/ai";

/**
 * Universal gradient key type (not tied to Effect)
 */
export interface IGradientKey {
	time?: number;
	value: number | [number, number, number, number] | { r: number; g: number; b: number; a?: number };
	pos?: number;
}

export interface IGradientPickerProps {
	colorKeys: IGradientKey[];
	alphaKeys?: IGradientKey[];
	onChange: (colorKeys: IGradientKey[], alphaKeys?: IGradientKey[]) => void;
	onFinish?: (colorKeys: IGradientKey[], alphaKeys?: IGradientKey[]) => void;
	className?: string;
}

/**
 * Visual gradient picker component
 * Allows users to visually edit gradient by clicking on gradient bar, dragging stops, and picking colors
 */
export function GradientPicker(props: IGradientPickerProps): ReactNode {
	const { colorKeys, alphaKeys = [], onChange, onFinish, className } = props;
	const [selectedKeyIndex, setSelectedKeyIndex] = useState<number | null>(null);
	const [selectedAlphaIndex, setSelectedAlphaIndex] = useState<number | null>(null);
	const gradientRef = useRef<HTMLDivElement>(null);
	const alphaRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragKeyIndex, setDragKeyIndex] = useState<number | null>(null);
	const [isAlphaDragging, setIsAlphaDragging] = useState(false);
	const [dragAlphaIndex, setDragAlphaIndex] = useState<number | null>(null);

	// Sort keys by position
	const sortedColorKeys = [...colorKeys].sort((a, b) => (a.pos || 0) - (b.pos || 0));
	const sortedAlphaKeys = [...alphaKeys].sort((a, b) => (a.pos || 0) - (b.pos || 0));

	// Generate gradient CSS string
	const generateGradient = (keys: IGradientKey[]): string => {
		const sorted = [...keys].sort((a, b) => (a.pos || 0) - (b.pos || 0));
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
				const a = ("a" in key.value ? key.value.a : 1) * 255;
				color = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
			}
			return `${color} ${pos}%`;
		});
		return `linear-gradient(to right, ${stops.join(", ")})`;
	};

	// Get color value from key
	const getColorFromKey = (key: IGradientKey): Color4 => {
		if (Array.isArray(key.value)) {
			const [r, g, b, a = 1] = key.value;
			return new Color4(r, g, b, a);
		} else if (typeof key.value === "object" && "r" in key.value) {
			return new Color4(key.value.r, key.value.g, key.value.b, "a" in key.value ? key.value.a || 1 : 1);
		}
		return new Color4(0, 0, 0, 1);
	};

	// Interpolate color at position
	const interpolateColorAtPosition = (keys: IGradientKey[], pos: number): Color4 => {
		if (keys.length === 0) {
			return new Color4(1, 1, 1, 1);
		}
		if (keys.length === 1) {
			return getColorFromKey(keys[0]);
		}

		for (let i = 0; i < keys.length - 1; i++) {
			const key1 = keys[i];
			const key2 = keys[i + 1];
			const pos1 = key1.pos || 0;
			const pos2 = key2.pos || 0;

			if (pos >= pos1 && pos <= pos2) {
				const t = (pos - pos1) / (pos2 - pos1);
				const color1 = getColorFromKey(key1);
				const color2 = getColorFromKey(key2);
				return new Color4(
					color1.r + (color2.r - color1.r) * t,
					color1.g + (color2.g - color1.g) * t,
					color1.b + (color2.b - color1.b) * t,
					color1.a + (color2.a - color1.a) * t
				);
			}
		}

		// Outside range, return nearest
		if (pos <= (keys[0].pos || 0)) {
			return getColorFromKey(keys[0]);
		}
		return getColorFromKey(keys[keys.length - 1]);
	};

	// Handle click on gradient bar to add/select key
	const handleGradientClick = (e: MouseEvent<HTMLDivElement>, isAlpha: boolean = false) => {
		const rect = isAlpha ? alphaRef.current?.getBoundingClientRect() : gradientRef.current?.getBoundingClientRect();
		if (!rect) {
			return;
		}

		const x = e.clientX - rect.left;
		const pos = Math.max(0, Math.min(1, x / rect.width));

		if (isAlpha) {
			// Check if clicked near existing alpha key
			const nearKeyIndex = sortedAlphaKeys.findIndex((key) => Math.abs((key.pos || 0) - pos) < 0.05);
			if (nearKeyIndex >= 0) {
				setSelectedAlphaIndex(nearKeyIndex);
				return;
			}

			// Add new alpha key
			const newAlphaKeys = [...alphaKeys, { pos, value: 1 }];
			const sorted = newAlphaKeys.sort((a, b) => (a.pos || 0) - (b.pos || 0));
			const newIndex = sorted.findIndex((key) => key.pos === pos);
			setSelectedAlphaIndex(newIndex);
			onChange(colorKeys, sorted);
		} else {
			// Check if clicked near existing color key
			const nearKeyIndex = sortedColorKeys.findIndex((key) => Math.abs((key.pos || 0) - pos) < 0.05);
			if (nearKeyIndex >= 0) {
				setSelectedKeyIndex(nearKeyIndex);
				return;
			}

			// Interpolate color at position
			const color = interpolateColorAtPosition(sortedColorKeys, pos);
			const newColorKeys = [...colorKeys, { pos, value: [color.r, color.g, color.b, color.a] }];
			const sorted = newColorKeys.sort((a, b) => (a.pos || 0) - (b.pos || 0));
			const newIndex = sorted.findIndex((key) => key.pos === pos);
			setSelectedKeyIndex(newIndex);
			onChange(sorted, alphaKeys);
		}
	};

	// Handle mouse down on key stop
	const handleKeyMouseDown = (e: MouseEvent, index: number, isAlpha: boolean) => {
		e.stopPropagation();
		if (isAlpha) {
			setIsAlphaDragging(true);
			setDragAlphaIndex(index);
			setSelectedAlphaIndex(index);
		} else {
			setIsDragging(true);
			setDragKeyIndex(index);
			setSelectedKeyIndex(index);
		}
	};

	// Handle mouse move for dragging
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDragging && dragKeyIndex !== null && gradientRef.current) {
				const rect = gradientRef.current.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const pos = Math.max(0, Math.min(1, x / rect.width));

				const newColorKeys = [...colorKeys];
				const key = sortedColorKeys[dragKeyIndex];
				const originalIndex = colorKeys.findIndex((k) => k === key);
				if (originalIndex >= 0) {
					newColorKeys[originalIndex] = { ...key, pos };
					onChange(newColorKeys, alphaKeys);
				}
			}

			if (isAlphaDragging && dragAlphaIndex !== null && alphaRef.current) {
				const rect = alphaRef.current.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const pos = Math.max(0, Math.min(1, x / rect.width));

				const newAlphaKeys = [...alphaKeys];
				const key = sortedAlphaKeys[dragAlphaIndex];
				const originalIndex = alphaKeys.findIndex((k) => k === key);
				if (originalIndex >= 0) {
					newAlphaKeys[originalIndex] = { ...key, pos };
					onChange(colorKeys, newAlphaKeys);
				}
			}
		};

		const handleMouseUp = () => {
			if (isDragging || isAlphaDragging) {
				setIsDragging(false);
				setIsAlphaDragging(false);
				setDragKeyIndex(null);
				setDragAlphaIndex(null);
				if (onFinish) {
					onFinish(colorKeys, alphaKeys);
				}
			}
		};

		if (isDragging || isAlphaDragging) {
			window.addEventListener("mousemove", handleMouseMove as any);
			window.addEventListener("mouseup", handleMouseUp);
			return () => {
				window.removeEventListener("mousemove", handleMouseMove as any);
				window.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDragging, isAlphaDragging, dragKeyIndex, dragAlphaIndex, colorKeys, alphaKeys, onChange, onFinish, sortedColorKeys, sortedAlphaKeys]);

	// Handle color change for selected key
	const handleColorChange = (color: Color3 | Color4) => {
		if (selectedKeyIndex === null) {
			return;
		}

		const key = sortedColorKeys[selectedKeyIndex];
		const originalIndex = colorKeys.findIndex((k) => k === key);
		if (originalIndex >= 0) {
			const newColorKeys = [...colorKeys];
			newColorKeys[originalIndex] = {
				...key,
				value: [color.r, color.g, color.b, color instanceof Color4 ? color.a : 1],
			};
			onChange(newColorKeys, alphaKeys);
		}
	};

	// Handle alpha change for selected alpha key
	const handleAlphaChange = (value: number) => {
		if (selectedAlphaIndex === null) {
			return;
		}

		const key = sortedAlphaKeys[selectedAlphaIndex];
		const originalIndex = alphaKeys.findIndex((k) => k === key);
		if (originalIndex >= 0) {
			const newAlphaKeys = [...alphaKeys];
			newAlphaKeys[originalIndex] = { ...key, value };
			onChange(colorKeys, newAlphaKeys);
		}
	};

	// Handle delete key
	const handleDeleteKey = (index: number, isAlpha: boolean) => {
		if (isAlpha) {
			if (alphaKeys.length <= 2) {
				return; // Keep at least 2 keys
			}
			const newAlphaKeys = alphaKeys.filter((_, i) => i !== index);
			setSelectedAlphaIndex(null);
			onChange(colorKeys, newAlphaKeys);
		} else {
			if (colorKeys.length <= 2) {
				return; // Keep at least 2 keys
			}
			const newColorKeys = colorKeys.filter((_, i) => i !== index);
			setSelectedKeyIndex(null);
			onChange(newColorKeys, alphaKeys);
		}
	};

	return (
		<div className={`flex flex-col gap-4 p-4 bg-muted rounded-lg ${className || ""}`} style={{ minWidth: "400px" }}>
			{/* Color Gradient Bar */}
			<div className="flex flex-col gap-2">
				<div className="text-sm font-medium">Color Gradient</div>
				<div
					ref={gradientRef}
					className="relative h-8 rounded border border-border cursor-crosshair"
					style={{ background: generateGradient(colorKeys) }}
					onClick={(e) => handleGradientClick(e, false)}
				>
					{sortedColorKeys.map((key, index) => {
						const pos = (key.pos || 0) * 100;
						const color = getColorFromKey(key);
						const isSelected = selectedKeyIndex === index;
						return (
							<div
								key={`color-${index}`}
								className={`absolute top-0 bottom-0 w-4 -ml-2 cursor-move ${isSelected ? "z-10" : ""}`}
								style={{ left: `${pos}%` }}
								onMouseDown={(e) => handleKeyMouseDown(e, index, false)}
							>
								<div
									className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${
										isSelected ? "border-white shadow-lg scale-110" : "border-gray-300"
									}`}
									style={{
										backgroundColor: `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`,
									}}
								/>
							</div>
						);
					})}
				</div>

				{/* Color Picker for Selected Key */}
				{selectedKeyIndex !== null && (
					<div className="flex items-center gap-2">
						<div className="flex-1">
							<ColorPicker
								color={getColorFromKey(sortedColorKeys[selectedKeyIndex]).toHexString(false)}
								alpha={true}
								onChange={(color) => handleColorChange(new Color4(color.r, color.g, color.b, color.a))}
								onFinish={(color) => {
									handleColorChange(new Color4(color.r, color.g, color.b, color.a));
									if (onFinish) {
										onFinish(colorKeys, alphaKeys);
									}
								}}
							/>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={() => {
								const originalIndex = colorKeys.findIndex((k) => k === sortedColorKeys[selectedKeyIndex]);
								if (originalIndex >= 0 && colorKeys.length > 2) {
									handleDeleteKey(originalIndex, false);
								}
							}}
							disabled={colorKeys.length <= 2}
						>
							<AiOutlineClose className="w-4 h-4" />
						</Button>
					</div>
				)}
			</div>

			{/* Alpha Gradient Bar */}
			<div className="flex flex-col gap-2">
				<div className="text-sm font-medium">Alpha Gradient</div>
				<div
					ref={alphaRef}
					className="relative h-8 rounded border border-border cursor-crosshair bg-gradient-to-r from-black to-white"
					onClick={(e) => handleGradientClick(e, true)}
				>
					{sortedAlphaKeys.map((key, index) => {
						const pos = (key.pos || 0) * 100;
						const alphaValue = typeof key.value === "number" ? key.value : Array.isArray(key.value) ? key.value[3] || 1 : 1;
						const isSelected = selectedAlphaIndex === index;
						return (
							<div
								key={`alpha-${index}`}
								className={`absolute top-0 bottom-0 w-4 -ml-2 cursor-move ${isSelected ? "z-10" : ""}`}
								style={{ left: `${pos}%` }}
								onMouseDown={(e) => handleKeyMouseDown(e, index, true)}
							>
								<div
									className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${
										isSelected ? "border-white shadow-lg scale-110" : "border-gray-300"
									}`}
									style={{
										backgroundColor: `rgba(255, 255, 255, ${alphaValue})`,
									}}
								/>
							</div>
						);
					})}
				</div>

				{/* Alpha Slider for Selected Key */}
				{selectedAlphaIndex !== null && (
					<div className="flex items-center gap-2">
						<div className="flex-1">
							<input
								type="range"
								min="0"
								max="1"
								step="0.01"
								value={typeof sortedAlphaKeys[selectedAlphaIndex].value === "number" ? sortedAlphaKeys[selectedAlphaIndex].value : 1}
								onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
								className="w-full"
							/>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={() => {
								const originalIndex = alphaKeys.findIndex((k) => k === sortedAlphaKeys[selectedAlphaIndex]);
								if (originalIndex >= 0 && alphaKeys.length > 2) {
									handleDeleteKey(originalIndex, true);
								}
							}}
							disabled={alphaKeys.length <= 2}
						>
							<AiOutlineClose className="w-4 h-4" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
