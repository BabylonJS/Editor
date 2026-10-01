import { NonIdealState } from "@blueprintjs/core";

import { FaMountainSun } from "react-icons/fa6";

import { Editor } from "../../../../main";

import { isAbstractMesh, isCollisionInstancedMesh, isCollisionMesh } from "../../../../../tools/guards/nodes";
import { getTerrainEligibility } from "../../../../../tools/terrain/engine/eligibility";

import { TerrainCreatePopover } from "./create";

export interface ITerrainEmptyStateProps {
	editor: Editor;
	/** The object edited in the inspector, which is not a terrain that can be edited. */
	object: unknown;
}

/**
 * Non-ideal state shown when the object selected in the graph is not a terrain that can be edited: tells why and offers to create a new
 * terrain. The terrain to edit is selected in the graph only.
 */
export function TerrainEmptyState(props: ITerrainEmptyStateProps) {
	const object = props.object;

	// A mesh that can't be edited tells why (instance, locked, linked scene...).
	const isMesh = !!object && (isAbstractMesh(object) || isCollisionMesh(object) || isCollisionInstancedMesh(object));
	const eligibility = isMesh ? getTerrainEligibility(object) : null;
	const message = eligibility && !eligibility.eligible ? eligibility.message : "Select a terrain in the scene graph, or create a new one.";

	return (
		<NonIdealState
			className="flex-1"
			icon={<FaMountainSun className="w-24 h-24" />}
			title={<div className="text-foreground">No terrain selected</div>}
			description={<div className="text-muted-foreground">{message}</div>}
			action={<TerrainCreatePopover editor={props.editor} />}
		/>
	);
}
