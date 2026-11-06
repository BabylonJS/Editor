import { ReactNode } from "react";

import { LuCircleHelp, LuLink2, LuScan, LuUnlink2 } from "react-icons/lu";

import { isCinematicKeyCut } from "babylonjs-editor-tools";

import { Switch } from "../../../../ui/shadcn/ui/switch";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { CinematicCurveKey, CinematicCurveTangentMode, isKeyTangentLinked } from "./tools/keys";

export interface ICinematicEditorCurvesToolbarProps {
	/**
	 * Components of the curves that can be shown or hidden (x, y, z, r, g, b, etc.).
	 */
	components: string[];
	hiddenComponents: Set<string>;
	selection: CinematicCurveKey[];

	onToggleComponent: (component: string) => void;
	onApplyTangentMode: (mode: CinematicCurveTangentMode) => void;
	onSetTangentsLinked: (linked: boolean) => void;
	onFrame: () => void;
}

const toggleColors: Record<string, string> = {
	x: "bg-red-500",
	y: "bg-green-500",
	z: "bg-blue-500",
	w: "bg-primary",
	r: "bg-red-500",
	g: "bg-green-500",
	b: "bg-blue-500",
	a: "bg-primary",
};

export const tangentModesDescriptions: Record<CinematicCurveTangentMode, string> = {
	auto: "Smooth tangents following the neighbor keys.",
	flat: "Horizontal tangents: the curve eases in and out of the keys.",
	linear: "No tangents: the segments around the keys are straight lines.",
};

const help = [
	"Pinch or Ctrl/Cmd + scroll: zoom (+ Shift: time only, + Alt: values only)",
	"Scroll with a mouse wheel: zoom · Scroll with a trackpad: pan",
	"Middle button or Alt + drag: pan · F / A: frame selection / all",
	"Drag on the graph or the ruler: move the time",
	"Click a key: select · Shift/Cmd + click or drag: add to the selection",
	"Drag keys: move them (+ Shift: time or value only)",
	"Drag a tangent handle: edit the slope · Alt + drag: break the tangents",
	"Double-click a curve: add a key on it · Delete: remove the selected keys",
].join("\n");

/**
 * Toolbar shown over the curves: tangent modes of the selected keys, visibility of the components, framing and help.
 */
export function CinematicEditorCurvesToolbar(props: ICinematicEditorCurvesToolbarProps): ReactNode {
	const linkable = props.selection.filter((key) => !isCinematicKeyCut(key));
	const allLinked = linkable.length > 0 && linkable.every((key) => isKeyTangentLinked(key));

	return (
		<div className="absolute bottom-0 right-0 flex items-center gap-2 p-2">
			{props.selection.length > 0 && (
				<div className="flex items-center gap-1 px-1 py-1 rounded-lg bg-background/80 border border-border/50">
					{(["auto", "flat", "linear"] as CinematicCurveTangentMode[]).map((mode) => (
						<Tooltip key={mode}>
							<TooltipTrigger asChild>
								<Button variant="ghost" className="h-7 px-2 text-xs capitalize" onClick={() => props.onApplyTangentMode(mode)}>
									{mode}
								</Button>
							</TooltipTrigger>
							<TooltipContent>{tangentModesDescriptions[mode]}</TooltipContent>
						</Tooltip>
					))}

					{linkable.length > 0 && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={allLinked ? "secondary" : "ghost"} className="h-7 px-2 gap-1 text-xs" onClick={() => props.onSetTangentsLinked(!allLinked)}>
									{allLinked ? <LuLink2 className="w-4 h-4" /> : <LuUnlink2 className="w-4 h-4" />}
									{allLinked ? "Linked" : "Broken"}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{allLinked
									? "In and out tangents are edited together. Click to break them and edit each side independently (or Alt + drag a handle)."
									: "In and out tangents are edited independently. Click to link them so the curve stays smooth through the key."}
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			)}

			{props.components.map((component) => {
				const visible = !props.hiddenComponents.has(component);

				return (
					<div
						key={component}
						onClick={() => props.onToggleComponent(component)}
						className={`
							flex items-center gap-2 px-2 py-1 rounded-lg ${toggleColors[component]} text-white/75 cursor-pointer
							${visible ? "bg-opacity-35" : "bg-opacity-5"} opacity-50 hover:opacity-100
							transition-all duration-300 ease-in-out
						`}
					>
						<Switch checked={visible} /> {component.toUpperCase()}
					</div>
				);
			})}

			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="ghost" className="w-8 h-8 p-1.5 bg-background/80" onClick={() => props.onFrame()}>
						<LuScan className="w-5 h-5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Frame selection (F) or all (A)</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center justify-center w-8 h-8 text-muted-foreground">
						<LuCircleHelp className="w-5 h-5" />
					</div>
				</TooltipTrigger>
				<TooltipContent side="top" className="max-w-96 whitespace-pre-line leading-relaxed">
					{help}
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
