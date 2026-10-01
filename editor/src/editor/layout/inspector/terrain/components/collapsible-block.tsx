import { KeyboardEvent, PropsWithChildren, ReactNode, useEffect, useState } from "react";

import { LuChevronRight } from "react-icons/lu";

import { EditorInspectorBlockField } from "../../fields/block";

import { notifyTerrainSettingsChanged, onTerrainSettingsChangedObservable, terrainSettings } from "../settings";

/** Key notified by notifyTerrainSettingsChanged when a block or a section is collapsed or expanded. */
export const TERRAIN_COLLAPSED_SETTINGS_KEY = "view.collapsed";

/**
 * Collapsed state of the block `id`, stored in terrainSettings.view.collapsed[id] (§1.4); `defaultCollapsed` when never set.
 * @param id defines the id of the block or section.
 * @param defaultCollapsed defines the state used when the settings don't store one (default true).
 */
export function isTerrainBlockCollapsed(id: string, defaultCollapsed: boolean = true): boolean {
	const value = terrainSettings.view?.collapsed?.[id];
	return typeof value === "boolean" ? value : defaultCollapsed;
}

/**
 * Stores the collapsed state of the block or section `id` in terrainSettings.view.collapsed and notifies it with notifyTerrainSettingsChanged
 * (a field-like change: persisted, no remount of the settings fields).
 * @param id defines the id of the block or section.
 * @param collapsed defines the new collapsed state.
 */
export function setTerrainBlockCollapsed(id: string, collapsed: boolean): void {
	const view = terrainSettings.view;
	if (!view) {
		return;
	}

	view.collapsed ??= {};
	view.collapsed[id] = collapsed;

	try {
		notifyTerrainSettingsChanged([TERRAIN_COLLAPSED_SETTINGS_KEY]);
	} catch (e) {
		// Persistence is best effort: the state is already applied to the singleton.
		console.error(e);
	}
}

export interface ITerrainCollapsibleBlockProps extends PropsWithChildren {
	/** Key of the open state in terrainSettings.view.collapsed ("stroke-jitter", "pen-image", "advanced", ...). */
	id: string;
	/** Text of the header row. */
	title: ReactNode;
	/** Optional text drawn on the right of the header row (e.g. "2 active"). */
	label?: ReactNode;
	/** Collapsed state when view.collapsed[id] was never set (default true: blocks start collapsed, §1.4). */
	defaultCollapsed?: boolean;
	/** Extra classes of the block. */
	className?: string;
}

/**
 * Collapsible group of the Terrain tab (§1.4): an EditorInspectorBlockField with a chevron header row; the open state lives in
 * terrainSettings.view.collapsed[id] (persisted, restored by "Reset brush & tool settings").
 */
export function TerrainCollapsibleBlock(props: ITerrainCollapsibleBlockProps): JSX.Element {
	const [, setRevision] = useState(0);

	useEffect(() => {
		// Re-render when the state changes elsewhere (reset, another instance of the same block).
		const observer = onTerrainSettingsChangedObservable.add((change) => {
			try {
				if (change.external || change.keys.includes(TERRAIN_COLLAPSED_SETTINGS_KEY)) {
					setRevision((revision) => revision + 1);
				}
			} catch (e) {
				console.error(e);
			}
		});

		return () => {
			onTerrainSettingsChangedObservable.remove(observer);
		};
	}, []);

	const collapsed = isTerrainBlockCollapsed(props.id, props.defaultCollapsed ?? true);

	function toggle(): void {
		setTerrainBlockCollapsed(props.id, !collapsed);
		setRevision((revision) => revision + 1);
	}

	function handleKeyDown(ev: KeyboardEvent<HTMLDivElement>): void {
		if (ev.key === "Enter" || ev.key === " ") {
			ev.preventDefault();
			toggle();
		}
	}

	return (
		<EditorInspectorBlockField className={props.className ?? ""}>
			<div
				role="button"
				tabIndex={0}
				aria-expanded={!collapsed}
				onClick={() => toggle()}
				onKeyDown={(ev) => handleKeyDown(ev)}
				className="flex items-center gap-2 w-full px-1 py-0.5 rounded-md cursor-pointer select-none text-sm hover:bg-muted-foreground/10 transition-colors duration-300"
			>
				<LuChevronRight className={`w-4 h-4 shrink-0 transition-transform duration-200 ${collapsed ? "" : "rotate-90"}`} />
				<div className="flex-1 min-w-0 truncate">{props.title}</div>
				{props.label !== undefined && props.label !== null && <div className="shrink-0 text-xs text-muted-foreground">{props.label}</div>}
			</div>

			{!collapsed && <div className="flex flex-col gap-2 w-full">{props.children}</div>}
		</EditorInspectorBlockField>
	);
}
