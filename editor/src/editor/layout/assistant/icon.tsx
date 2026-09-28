import { ReactNode } from "react";

import { RiAiGenerate2 } from "react-icons/ri";

import { SpinnerUIComponent } from "../../../ui/spinner";

import type { EditorAssistantWorkState } from "./hooks";

export interface IEditorAssistantIconProps {
	/**
	 * Defines what the assistant is doing.
	 */
	workState: EditorAssistantWorkState;
	/**
	 * Defines the size of the icon, in pixels.
	 */
	size: number;
}

/**
 * Displays the icon of the AI assistant: a spinner while it works, and a dot while it waits for the user to answer.
 */
export function EditorAssistantIcon(props: IEditorAssistantIconProps): ReactNode {
	if (props.workState === "working") {
		// Drawn with the color of the text, its track faded like the other spinners of the editor, for both themes.
		return (
			<SpinnerUIComponent
				width={props.size}
				height={props.size}
				color="currentColor"
				secondaryColor="currentColor"
				strokeWidth={3}
				wrapperClass="shrink-0 [&_circle]:opacity-40"
				ariaLabel="The AI assistant is working"
			/>
		);
	}

	return (
		<div className="relative shrink-0" style={{ width: props.size, height: props.size }}>
			<RiAiGenerate2 className="w-full h-full" />
			{props.workState === "waiting" && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />}
		</div>
	);
}
