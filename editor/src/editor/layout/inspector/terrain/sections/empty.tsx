import { ReactNode } from "react";

import { FaMountainSun } from "react-icons/fa6";
import { LuTriangleAlert } from "react-icons/lu";

import type { AbstractMesh, Node, Scene } from "babylonjs";

import type { Editor } from "../../../../main";

import { Badge } from "../../../../../ui/shadcn/ui/badge";
import { Button } from "../../../../../ui/shadcn/ui/button";

import { listTerrainMeshes } from "../../../../../tools/terrain/engine/eligibility";
import type { ITerrainListItem, TerrainEligibility, TerrainIneligibilityReason } from "../../../../../tools/terrain/engine/types";

import { reportTerrainTabError } from "../drop-actions";
import { formatTerrainResolution } from "../format";

import { TerrainCreatePopover } from "./create";

export type TerrainIneligibility = Extract<TerrainEligibility, { eligible: false }>;

/**
 * Selects a node like a click in the scene graph (terrain list, fix buttons, header selector): selected in the graph, edited in the
 * inspector and the animations panel, and attached to the gizmo (hidden again at the next frame while the Terrain tab hides the gizmo: leaving
 * the tab attaches the edited object again).
 * @param editor defines the editor reference.
 * @param node defines the node to select.
 */
export function selectTerrainTabNode(editor: Editor, node: Node): void {
	try {
		editor.layout.graph.setSelectedNode(node);
	} catch (e) {
		console.error(e);
	}

	editor.layout.inspector.setEditedObject(node);

	try {
		editor.layout.animations?.setEditedObject(node);
	} catch (e) {
		console.error(e);
	}

	try {
		editor.layout.preview?.gizmo?.setAttachedObject(node);
	} catch (e) {
		console.error(e);
	}
}

/**
 * Label of the fix button of an ineligibility reason (§1.3), null when there is none.
 * @param reason defines the ineligibility reason.
 */
export function getTerrainIneligibilityFixLabel(reason: TerrainIneligibilityReason): string | null {
	switch (reason) {
		case "instance":
			return "Select source";
		case "lod-child":
			return "Select master";
		case "degenerate-transform":
			return "Select in graph";
		default:
			return null;
	}
}

function runTerrainIneligibilityFix(editor: Editor, eligibility: TerrainIneligibility): void {
	try {
		const target = eligibility.fixTarget ?? eligibility.mesh;
		if (target) {
			selectTerrainTabNode(editor, target);
		}
	} catch (e) {
		reportTerrainTabError(editor, e);
	}
}

/**
 * Terrains of the scene, [] when they can't be listed.
 * @param scene defines the scene to list.
 */
export function listTerrainTabTerrains(scene: Scene | null | undefined): ITerrainListItem[] {
	if (!scene) {
		return [];
	}

	try {
		return listTerrainMeshes(scene);
	} catch (e) {
		console.error(e);
		return [];
	}
}

export interface ITerrainListProps {
	editor: Editor;
	/** The mesh currently edited (highlighted in the list). */
	current?: AbstractMesh | null;
}

/**
 * "Terrains in this scene" (§1.3): one ghost button per terrain; a click selects it in the graph and the inspector.
 */
export function TerrainList(props: ITerrainListProps): JSX.Element {
	const items = listTerrainTabTerrains(props.editor.layout.preview?.scene);

	return (
		<div className="flex flex-col gap-1 w-full">
			<div className="px-1 text-sm font-semibold">Terrains in this scene</div>

			{items.length === 0 && <div className="px-1 text-xs text-muted-foreground">No terrain in this scene yet.</div>}

			{items.map((item) => (
				<Button
					key={item.mesh.uniqueId}
					variant="ghost"
					title={item.name}
					className={`flex items-center justify-start gap-2 w-full h-8 px-2 ${props.current === item.mesh ? "bg-accent" : ""}`}
					onClick={() => selectTerrainTabNode(props.editor, item.mesh)}
				>
					<FaMountainSun className="w-4 h-4 shrink-0" />

					<div className="flex-1 min-w-0 truncate text-left">{item.name}</div>

					<Badge variant="secondary" className="shrink-0 px-1.5 py-0">
						{formatTerrainResolution(item.subdivisions)}
					</Badge>
				</Button>
			))}
		</div>
	);
}

export interface ITerrainEmptyStateProps {
	/** The editor reference. */
	editor: Editor;
	/** Ineligibility of the edited object (state `ineligible`), null in the state `no-selection`. */
	eligibility: TerrainIneligibility | null;
	/** Disables the mutating actions (a terrain operation runs). */
	busy?: boolean;
}

/**
 * Card of the `no-selection` and `ineligible` states (§1.3): icon, title, text (or the ineligibility message and its fix button), the terrains
 * of the scene and the New terrain popover.
 */
export function TerrainEmptyState(props: ITerrainEmptyStateProps): JSX.Element {
	const eligibility = props.eligibility;
	const fixLabel = eligibility ? getTerrainIneligibilityFixLabel(eligibility.reason) : null;

	let text: ReactNode = "Select a terrain in the scene graph, or create a new one.";
	if (eligibility) {
		text = (
			<div className="flex items-start gap-2 text-left">
				<LuTriangleAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
				<div className="break-words min-w-0">{eligibility.message}</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 w-full">
			<div className="flex flex-col items-center gap-3 w-full p-4 rounded-lg bg-secondary dark:bg-secondary/35 text-center">
				<FaMountainSun className="w-12 h-12" />
				<div className="text-lg font-semibold">Sculpt and paint terrains</div>
				<div className="text-sm text-muted-foreground max-w-full">{text}</div>

				{eligibility && fixLabel && (
					<Button variant="secondary" size="sm" onClick={() => runTerrainIneligibilityFix(props.editor, eligibility)}>
						{fixLabel}
					</Button>
				)}
			</div>

			<TerrainList editor={props.editor} current={eligibility?.mesh ?? null} />

			<TerrainCreatePopover editor={props.editor} busy={props.busy} className="w-full" />
		</div>
	);
}
