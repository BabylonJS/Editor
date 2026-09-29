import { CSSProperties, ReactNode, useId } from "react";

import { RiAiGenerate2 } from "react-icons/ri";

import { SpinnerUIComponent } from "../../../ui/spinner";

import type { EditorAssistantWorkState } from "./hooks";

/**
 * Defines the colors of the icon of the AI assistant, the ones of the animated border of its button.
 */
export const assistantIconColors = ["#d97757", "#f5b041", "#e8618c", "#9b6bf2", "#4f8ff7", "#3ec9a7"];

export interface IEditorAssistantIconProps {
	/**
	 * Defines what the assistant is doing.
	 */
	workState: EditorAssistantWorkState;
	/**
	 * Defines the size of the icon, in pixels.
	 */
	size: number;
	/**
	 * Defines wether or not the icon is painted with a multicolor gradient instead of the color of the text. The
	 * spinner shown while the assistant works always has the color of the text.
	 */
	multicolor?: boolean;
}

/**
 * Displays the icon of the AI assistant: a spinner while it works, and a dot while it waits for the user to answer.
 */
export function EditorAssistantIcon(props: IEditorAssistantIconProps): ReactNode {
	// Each icon has its own gradient: a gradient of another icon may be in a hidden panel, where it isn't rendered.
	const gradientId = `editor-assistant-icon-${useId().replace(/[^\w-]/g, "")}`;

	const multicolor = props.multicolor && props.workState !== "working";

	const style = {
		width: props.size,
		height: props.size,
		...(multicolor ? { "--editor-assistant-icon-paint": `url(#${gradientId})` } : {}),
	} as CSSProperties;

	return (
		<div className="relative shrink-0" style={style}>
			{multicolor && (
				<svg className="absolute w-0 h-0" aria-hidden>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
							{assistantIconColors.map((color, index) => (
								<stop key={color} offset={index / (assistantIconColors.length - 1)} stopColor={color} />
							))}
						</linearGradient>
					</defs>
				</svg>
			)}

			{props.workState === "working" ? (
				// Drawn with the color of the text, its track faded like the other spinners of the editor, for both themes.
				<SpinnerUIComponent
					width={props.size}
					height={props.size}
					color="currentColor"
					secondaryColor="currentColor"
					strokeWidth={3}
					wrapperClass="shrink-0 [&_circle]:opacity-40"
					ariaLabel="The AI assistant is working"
				/>
			) : (
				<RiAiGenerate2 width={20} height={20} className={`w-full h-full aspect-square ${multicolor ? "editor-assistant-icon-multicolor" : ""}`} />
			)}

			{props.workState === "waiting" && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />}
		</div>
	);
}
