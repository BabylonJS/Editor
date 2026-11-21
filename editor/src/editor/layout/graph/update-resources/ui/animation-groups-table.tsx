import { ReactNode } from "react";

import { AnimationGroup } from "babylonjs";

import { Badge } from "../../../../../ui/shadcn/ui/badge";
import { Checkbox } from "../../../../../ui/shadcn/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../../ui/shadcn/ui/table";

import { getResolvedAnimationsCount } from "../match/animation-groups";

import { IUpdateResourcesAnimationGroupItem, IUpdateResourcesNodeItem } from "../types";

import { UpdateResourcesMatchBadge } from "./match-badge";
import { UpdateResourcesMatchSelect } from "./match-select";
import { UpdateResourcesSelectAllCheckbox } from "./selection";

export interface IUpdateResourcesAnimationGroupsTableProps {
	/**
	 * Defines the list of the animation groups to show.
	 */
	items: IUpdateResourcesAnimationGroupItem[];
	/**
	 * Defines the list of the animation groups of the asset the animation groups of the scene can be matched with.
	 */
	choices: AnimationGroup[];
	/**
	 * Defines the list of the nodes of the edited hierarchy with their match, used to count the animations that can be retargeted.
	 */
	nodes: IUpdateResourcesNodeItem[];
	/**
	 * Defines whether or not to show the copy of the asset each animation group animates (when several copies were found).
	 */
	showCopies: boolean;
	/**
	 * Called when the user changes the match or the selection of an item.
	 */
	onChange: () => void;
}

/**
 * Returns whether or not the given animation group item can be selected: it needs an animation group of the asset.
 * @param item defines the item of the animation group.
 */
export function isAnimationGroupItemSelectable(item: IUpdateResourcesAnimationGroupItem): boolean {
	return item.match !== null;
}

/**
 * Returns whether or not the given animation group item is selected to be updated or added.
 * @param item defines the item of the animation group.
 */
export function isAnimationGroupItemSelected(item: IUpdateResourcesAnimationGroupItem): boolean {
	return isAnimationGroupItemSelectable(item) && item.update;
}

/**
 * Lists the animation groups animating the copies of the asset in the scene with the animation group of the asset they are
 * matched with, and the animation groups of the asset that don't exist yet in the copies. The user can change the matches
 * and choose which animation groups to update or add.
 */
export function UpdateResourcesAnimationGroupsTable(props: IUpdateResourcesAnimationGroupsTableProps): ReactNode {
	const selectableItems = props.items.filter((item) => isAnimationGroupItemSelectable(item));
	const selectedCount = selectableItems.filter((item) => isAnimationGroupItemSelected(item)).length;

	/**
	 * Selects or unselects all the items that can be selected.
	 */
	function selectAll(selected: boolean): void {
		selectableItems.forEach((item) => (item.update = selected));
		props.onChange();
	}

	/**
	 * Inverts the selection of the given item, if it can be selected.
	 */
	function toggle(item: IUpdateResourcesAnimationGroupItem): void {
		if (isAnimationGroupItemSelectable(item)) {
			item.update = !item.update;
			props.onChange();
		}
	}

	/**
	 * Matches the given item with the animation group of the asset chosen by the user, and selects it if possible.
	 */
	function setMatch(item: IUpdateResourcesAnimationGroupItem, match: AnimationGroup | null): void {
		item.match = match;
		item.reason = match ? "manual" : "none";
		item.score = match ? 1 : 0;
		item.update = match !== null;

		props.onChange();
	}

	if (!props.items.length) {
		return <div className="p-4 text-center text-muted-foreground">No animation group to update.</div>;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-10">
						<UpdateResourcesSelectAllCheckbox selectedCount={selectedCount} selectableCount={selectableItems.length} onChange={(selected) => selectAll(selected)} />
					</TableHead>
					<TableHead className="w-1/3">Animation group</TableHead>
					<TableHead className="w-1/3">Asset animation group</TableHead>
					<TableHead>Match</TableHead>
					<TableHead>Animations</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{props.items.map((item) => (
					<TableRow key={item.key} className="cursor-pointer" onClick={() => toggle(item)}>
						<TableCell>
							<Checkbox checked={isAnimationGroupItemSelected(item)} disabled={!isAnimationGroupItemSelectable(item)} />
						</TableCell>

						<TableCell>
							<div className="flex flex-col overflow-hidden">
								{item.animationGroup ? (
									<span className="truncate font-medium">{item.animationGroup.name}</span>
								) : (
									<span className="truncate text-muted-foreground">Added to the scene</span>
								)}
								{props.showCopies && <span className="truncate text-xs text-muted-foreground">Copy "{item.copy.sceneRoot.name}"</span>}
							</div>
						</TableCell>

						<TableCell>
							<UpdateResourcesMatchSelect
								value={item.match}
								choices={props.choices}
								getLabel={(animationGroup) => animationGroup.name}
								onChange={(match) => setMatch(item, match)}
							/>
						</TableCell>

						<TableCell>
							{item.animationGroup ? (
								<UpdateResourcesMatchBadge reason={item.reason} score={item.score} />
							) : (
								<Badge variant="outline" className="whitespace-nowrap border-sky-500/50 text-sky-500" title="The animation group doesn't exist in the scene yet.">
									New
								</Badge>
							)}
						</TableCell>

						<TableCell>{getAnimationsCount(item, props.nodes)}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

/**
 * Returns the number of animations of the matched animation group of the asset that can be retargeted to the copy, out of
 * the total number of animations. The animations whose target can't be found are skipped when updating.
 */
function getAnimationsCount(item: IUpdateResourcesAnimationGroupItem, nodes: IUpdateResourcesNodeItem[]): ReactNode {
	if (!item.match) {
		return null;
	}

	const total = item.match.targetedAnimations.length;
	const resolved = getResolvedAnimationsCount(item.match, item.copy, nodes);

	return (
		<span className={`whitespace-nowrap ${resolved < total ? "text-amber-500" : "text-muted-foreground"}`} title="Animations whose target was found in the scene / total.">
			{resolved} / {total}
		</span>
	);
}
