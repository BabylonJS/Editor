import { ReactNode } from "react";

import { Badge } from "../../../../../ui/shadcn/ui/badge";

import { UpdateResourcesMatchReason } from "../types";

export interface IUpdateResourcesMatchBadgeProps {
	/**
	 * Defines why the object was matched.
	 */
	reason: UpdateResourcesMatchReason;
	/**
	 * Defines the confidence of the match, from 0 to 1.
	 */
	score: number;
}

const labels: Record<UpdateResourcesMatchReason, string> = {
	root: "Root",
	exact: "Exact",
	name: "Name",
	structure: "Structure",
	similar: "Similar",
	manual: "Manual",
	none: "No match",
};

const descriptions: Record<UpdateResourcesMatchReason, string> = {
	root: "Root of a copy of the asset found in the scene.",
	exact: "Same name in the asset.",
	name: "Same name once case, separators, namespaces, duplicate suffixes and word order are ignored.",
	structure: "Only remaining candidate at the same place of the hierarchy.",
	similar: "Most similar object of the asset (name, geometry, hierarchy, position...).",
	manual: "Chosen manually.",
	none: "No corresponding object found in the asset.",
};

const classNames: Record<UpdateResourcesMatchReason, string> = {
	root: "border-green-500/50 text-green-500",
	exact: "border-green-500/50 text-green-500",
	name: "border-sky-500/50 text-sky-500",
	structure: "border-amber-500/50 text-amber-500",
	similar: "border-amber-500/50 text-amber-500",
	manual: "border-violet-500/50 text-violet-500",
	none: "text-muted-foreground",
};

/**
 * Shows why an object of the scene was matched with an object of the asset, with the confidence of the match when it was
 * matched by similarity (to be checked by the user).
 */
export function UpdateResourcesMatchBadge(props: IUpdateResourcesMatchBadgeProps): ReactNode {
	const showScore = props.reason === "similar" || props.reason === "structure";

	return (
		<Badge variant="outline" title={descriptions[props.reason]} className={`whitespace-nowrap ${classNames[props.reason]}`}>
			{labels[props.reason]}
			{showScore && ` ${Math.round(props.score * 100)}%`}
		</Badge>
	);
}
