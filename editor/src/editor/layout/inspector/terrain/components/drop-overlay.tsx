import { ReactNode } from "react";

import { LuBan, LuImagePlus } from "react-icons/lu";

export interface ITerrainDropOverlayProps {
	/** Text naming the action the router picked (§1.9), e.g. "Add 3 brushes", or "Drop to add…" while the files are not known. */
	text: ReactNode;
	/** true when the drop would do nothing (the icon changes; the drop target sets dropEffect = "none"). */
	disabled?: boolean;
	/** Extra classes (e.g. a z-index). */
	className?: string;
}

/**
 * Overlay shown inside a drop zone during a drag (§1.9): it covers its closest positioned ancestor (the zone is `relative`) and never takes
 * pointer events, so the zone keeps receiving the drag events.
 */
export function TerrainDropOverlay(props: ITerrainDropOverlayProps): JSX.Element {
	return (
		<div
			data-terrain-drop-overlay
			className={`
				pointer-events-none absolute inset-0 z-50 p-4
				rounded-lg border-2 border-dashed border-primary/60 bg-background/80
				flex flex-col gap-2 items-center justify-center text-sm text-center
				${props.disabled ? "text-muted-foreground" : "text-foreground"}
				${props.className ?? ""}
			`}
		>
			{props.disabled ? <LuBan className="w-6 h-6" /> : <LuImagePlus className="w-6 h-6" />}
			<div className="max-w-full break-words">{props.text}</div>
		</div>
	);
}
