import { ReactNode } from "react";

import { TransformNode } from "babylonjs";

import { Badge } from "../../../../../ui/shadcn/ui/badge";
import { Checkbox } from "../../../../../ui/shadcn/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../../ui/shadcn/ui/table";

import { getLodLevels } from "../match/lods";
import { canUpdateGeometry, getGeometryMesh } from "../match/geometry";

import { IUpdateResourcesNodeItem } from "../types";

import { UpdateResourcesMatchBadge } from "./match-badge";
import { UpdateResourcesMatchSelect } from "./match-select";
import { UpdateResourcesSelectAllCheckbox } from "./selection";

/**
 * Defines what is updated for the nodes of a list:
 * - "geometry": the geometry of the meshes, with their skeleton and morph targets,
 * - "transform": the position, rotation and scaling of the nodes.
 */
export type UpdateResourcesNodesTableMode = "geometry" | "transform";

export interface IUpdateResourcesNodesTableProps {
	/**
	 * Defines what is updated for the nodes of the list.
	 */
	mode: UpdateResourcesNodesTableMode;
	/**
	 * Defines the list of the nodes of the scene to show.
	 */
	items: IUpdateResourcesNodeItem[];
	/**
	 * Defines the list of the nodes of the asset the nodes of the scene can be matched with.
	 */
	choices: TransformNode[];
	/**
	 * Defines whether or not to show the copy of the asset each node belongs to (when several copies were found).
	 */
	showCopies: boolean;
	/**
	 * Defines whether or not the materials are updated with the meshes, to show the material that will be used.
	 */
	showMaterials?: boolean;
	/**
	 * Called when the user changes the match or the selection of an item.
	 */
	onChange: () => void;
}

/**
 * Returns whether or not the given item can be selected in the given mode.
 * @param item defines the item of the node of the scene.
 * @param mode defines what is updated for the nodes of the list.
 */
export function isNodeItemSelectable(item: IUpdateResourcesNodeItem, mode: UpdateResourcesNodesTableMode): boolean {
	if (mode === "geometry") {
		return canUpdateGeometry(item.node, item.match);
	}

	return item.match !== null && !item.isCopyRoot;
}

/**
 * Returns whether or not the given item is selected in the given mode.
 * @param item defines the item of the node of the scene.
 * @param mode defines what is updated for the nodes of the list.
 */
export function isNodeItemSelected(item: IUpdateResourcesNodeItem, mode: UpdateResourcesNodesTableMode): boolean {
	return isNodeItemSelectable(item, mode) && (mode === "geometry" ? item.updateGeometry : item.updateTransform);
}

/**
 * Selects or unselects the given item in the given mode.
 */
function setNodeItemSelected(item: IUpdateResourcesNodeItem, mode: UpdateResourcesNodesTableMode, selected: boolean): void {
	if (mode === "geometry") {
		item.updateGeometry = selected;
	} else {
		item.updateTransform = selected;
	}
}

/**
 * Lists nodes of the edited hierarchy with the node of the asset they are matched with. The user can change the matches and
 * choose which nodes to update (geometry or transform, depending on the mode).
 */
export function UpdateResourcesNodesTable(props: IUpdateResourcesNodesTableProps): ReactNode {
	const selectableItems = props.items.filter((item) => isNodeItemSelectable(item, props.mode));
	const selectedCount = selectableItems.filter((item) => isNodeItemSelected(item, props.mode)).length;

	/**
	 * Selects or unselects all the items that can be selected.
	 */
	function selectAll(selected: boolean): void {
		selectableItems.forEach((item) => setNodeItemSelected(item, props.mode, selected));
		props.onChange();
	}

	/**
	 * Inverts the selection of the given item, if it can be selected.
	 */
	function toggle(item: IUpdateResourcesNodeItem): void {
		if (isNodeItemSelectable(item, props.mode)) {
			setNodeItemSelected(item, props.mode, !isNodeItemSelected(item, props.mode));
			props.onChange();
		}
	}

	/**
	 * Matches the given item with the given node of the asset chosen by the user, and selects it if possible.
	 */
	function setMatch(item: IUpdateResourcesNodeItem, match: TransformNode | null): void {
		item.match = match;
		item.reason = match ? "manual" : "none";
		item.score = match ? 1 : 0;

		setNodeItemSelected(item, props.mode, isNodeItemSelectable(item, props.mode));
		props.onChange();
	}

	if (!props.items.length) {
		return <div className="p-4 text-center text-muted-foreground">{props.mode === "geometry" ? "No mesh to update." : "No node to update."}</div>;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-10">
						<UpdateResourcesSelectAllCheckbox selectedCount={selectedCount} selectableCount={selectableItems.length} onChange={(selected) => selectAll(selected)} />
					</TableHead>
					<TableHead className="w-1/3">{props.mode === "geometry" ? "Mesh" : "Node"}</TableHead>
					<TableHead className="w-1/3">Asset {props.mode === "geometry" ? "mesh" : "node"}</TableHead>
					<TableHead>Match</TableHead>
					{props.mode === "geometry" && <TableHead>Resources</TableHead>}
				</TableRow>
			</TableHeader>

			<TableBody>
				{props.items.map((item) => (
					<TableRow key={item.key} className="cursor-pointer" onClick={() => toggle(item)}>
						<TableCell>
							<Checkbox checked={isNodeItemSelected(item, props.mode)} disabled={!isNodeItemSelectable(item, props.mode)} />
						</TableCell>

						<TableCell>
							<div className="flex flex-col overflow-hidden" style={{ paddingLeft: `${Math.min(item.depth, 12) * 12}px` }}>
								<span className="truncate font-medium">{item.node.name}</span>
								{getNodeItemDescription(item, props.showCopies) && (
									<span className="truncate text-xs text-muted-foreground">{getNodeItemDescription(item, props.showCopies)}</span>
								)}
							</div>
						</TableCell>

						<TableCell>
							<UpdateResourcesMatchSelect
								value={item.match}
								choices={props.choices}
								disabled={props.mode === "transform" && item.isCopyRoot}
								getLabel={(node) => node.name}
								getDescription={(node) => (node.parent ? `in ${node.parent.name}` : null)}
								onChange={(match) => setMatch(item, match)}
							/>
						</TableCell>

						<TableCell>
							<UpdateResourcesMatchBadge reason={item.reason} score={item.score} />
						</TableCell>

						{props.mode === "geometry" && <TableCell>{getGeometryResources(item, props.showMaterials ?? false)}</TableCell>}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

/**
 * Returns the text shown under the name of the node of the given item: the copy it belongs to, and why it can't be updated.
 */
function getNodeItemDescription(item: IUpdateResourcesNodeItem, showCopy: boolean): string {
	const parts: string[] = [];

	if (showCopy && item.copy) {
		parts.push(item.isCopyRoot ? "Root of the copy" : `Copy "${item.copy.sceneRoot.name}"`);
	} else if (item.isCopyRoot) {
		parts.push("Root of the copy (keeps its transform)");
	}

	if (item.node.getClassName() === "InstancedMesh") {
		parts.push("Instance (follows its source mesh)");
	}

	return parts.join(" · ");
}

/**
 * Returns the badges describing the resources that will be updated from the mesh of the asset matched with the given item:
 * the geometry, and the skeleton, morph targets, LODs and material (if chosen) that come with it.
 */
function getGeometryResources(item: IUpdateResourcesNodeItem, showMaterial: boolean): ReactNode {
	const assetMesh = getGeometryMesh(item.match);
	if (!assetMesh) {
		return null;
	}

	const morphTargets = assetMesh.morphTargetManager?.numTargets ?? 0;
	const lods = getLodLevels(assetMesh).length;

	return (
		<div className="flex flex-wrap gap-1">
			<Badge variant="secondary" className="whitespace-nowrap">
				{assetMesh.getTotalVertices()} vertices
			</Badge>

			{assetMesh.skeleton && (
				<Badge variant="secondary" className="whitespace-nowrap" title="The skeleton is updated with the mesh.">
					Skeleton ({assetMesh.skeleton.bones.length} bones)
				</Badge>
			)}

			{morphTargets > 0 && (
				<Badge variant="secondary" className="whitespace-nowrap" title="The morph targets are updated with the mesh.">
					{morphTargets} morph targets
				</Badge>
			)}

			{lods > 0 && (
				<Badge variant="secondary" className="whitespace-nowrap" title="The LODs of the asset are updated with the mesh. The LODs added in the editor are kept.">
					{lods} LOD{lods > 1 ? "s" : ""}
				</Badge>
			)}

			{showMaterial && assetMesh.material && (
				<Badge variant="secondary" className="whitespace-nowrap" title="The material of the mesh is replaced by the material of the asset.">
					Material "{assetMesh.material.name}"
				</Badge>
			)}
		</div>
	);
}
