import { IEditorInspectorListFieldItem } from "../../fields/list";

/** Modes shared by the Flatten, Set height and Ramp tools: which way the heights are allowed to move. */
export const terrainBandModeItems: IEditorInspectorListFieldItem[] = [
	{ text: "Both", value: "both" },
	{ text: "Raise only", value: "raise" },
	{ text: "Lower only", value: "lower" },
];
