import { PropsWithChildren, ReactNode } from "react";

import { LuChevronRight } from "react-icons/lu";

import { EditorInspectorBlockField } from "../../fields/block";

import { useTerrainSettings } from "../hooks";
import { notifyTerrainSettingsChanged, terrainSettings } from "../settings";

export interface ITerrainCollapsibleBlockProps extends PropsWithChildren {
	/** Key of the state of the block in the terrain settings (view.collapsed). */
	id: string;
	title: ReactNode;
	/** Text drawn on the right side of the title. */
	label?: ReactNode;
}

/**
 * Block of fields that can be collapsed (it is by default). Its state is stored in the terrain settings.
 */
export function TerrainCollapsibleBlock(props: ITerrainCollapsibleBlockProps) {
	useTerrainSettings();

	const collapsed = terrainSettings.view.collapsed[props.id] ?? true;

	function handleToggle() {
		terrainSettings.view.collapsed[props.id] = !collapsed;
		notifyTerrainSettingsChanged();
	}

	return (
		<EditorInspectorBlockField>
			<div
				onClick={() => handleToggle()}
				className="flex items-center gap-2 w-full px-1 py-0.5 rounded-md cursor-pointer select-none text-sm hover:bg-muted-foreground/10 transition-colors duration-300"
			>
				<LuChevronRight className={`w-4 h-4 shrink-0 transition-transform duration-200 ${collapsed ? "" : "rotate-90"}`} />
				<div className="flex-1 min-w-0 truncate">{props.title}</div>
				{props.label && <div className="shrink-0 text-xs text-muted-foreground">{props.label}</div>}
			</div>

			{!collapsed && props.children}
		</EditorInspectorBlockField>
	);
}
