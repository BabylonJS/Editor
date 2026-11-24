import { ReactNode } from "react";

import { Node } from "babylonjs";

import { Checkbox } from "../../../../../ui/shadcn/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../../ui/shadcn/ui/table";

import { isMesh } from "../../../../../tools/guards/nodes";

import { getRemovableLodMeshes, getRemovableNodeItems } from "../match/removal";

import { IUpdateResourcesAnalysis, IUpdateResourcesNodeItem } from "../types";

import { UpdateResourcesSelectAllCheckbox } from "./selection";

/**
 * Defines a row of the list of the objects of the scene that can be removed.
 */
export interface IUpdateResourcesRemovalRow {
	/**
	 * Defines the unique key of the row.
	 */
	key: string;
	/**
	 * Defines the reference to the node (or LOD mesh) that can be removed.
	 */
	node: Node;
	/**
	 * Defines the text shown under the name of the node.
	 */
	description: string;
	/**
	 * Defines whether or not the user selected the node to be removed.
	 */
	selected: boolean;
	/**
	 * Defines the selected ancestor the node is removed with, if any.
	 */
	removedWith: Node | null;
	/**
	 * Selects or unselects the node to be removed.
	 */
	setSelected: (selected: boolean) => void;
}

export interface IUpdateResourcesRemovalTableProps {
	/**
	 * Defines the analysis of the edited hierarchy, with the choices of the user.
	 */
	analysis: IUpdateResourcesAnalysis;
	/**
	 * Defines whether or not to show the copy of the asset each node belongs to (when several copies were found).
	 */
	showCopies: boolean;
	/**
	 * Called when the user changes the selection.
	 */
	onChange: () => void;
}

/**
 * Returns the rows of the objects of the scene that can be removed because they were not found in the asset: the nodes of the
 * copies (see getRemovableNodeItems) and the LODs of the updated meshes (see getRemovableLodMeshes). Nothing is selected by
 * default as these objects may have been added in the editor.
 * @param analysis defines the analysis of the edited hierarchy, with the choices of the user.
 * @param showCopies defines whether or not to mention the copy of the asset each node belongs to.
 */
export function getRemovalRows(analysis: IUpdateResourcesAnalysis, showCopies: boolean): IUpdateResourcesRemovalRow[] {
	const nodeItems = getRemovableNodeItems(analysis);
	const selectedNodes = nodeItems.filter((item) => item.remove).map((item) => item.node);

	const rows: IUpdateResourcesRemovalRow[] = nodeItems.map((item) => ({
		key: item.key,
		node: item.node,
		selected: item.remove,
		description: getNodeItemDescription(item, showCopies),
		removedWith: selectedNodes.find((other) => other !== item.node && item.node.isDescendantOf(other)) ?? null,
		setSelected: (selected) => (item.remove = selected),
	}));

	getRemovableLodMeshes(analysis).forEach(({ master, mesh }) => {
		rows.push({
			key: `lod-${master.key}-${mesh.uniqueId}`,
			node: mesh,
			removedWith: null,
			selected: analysis.removedLodMeshes.has(mesh),
			description: `LOD of "${master.node.name}" not found in the LODs of the asset`,
			setSelected: (selected) => {
				if (selected) {
					analysis.removedLodMeshes.add(mesh);
				} else {
					analysis.removedLodMeshes.delete(mesh);
				}
			},
		});
	});

	return rows;
}

/**
 * Lists the objects of the scene that were not found in the asset (deleted by the artist, or added in the editor) so the user
 * can choose to remove them. Nothing is removed by default. A node is removed with its descendants.
 */
export function UpdateResourcesRemovalTable(props: IUpdateResourcesRemovalTableProps): ReactNode {
	const rows = getRemovalRows(props.analysis, props.showCopies);
	const selectableRows = rows.filter((row) => !row.removedWith);
	const selectedCount = selectableRows.filter((row) => row.selected).length;

	/**
	 * Selects or unselects all the rows that can be selected.
	 */
	function selectAll(selected: boolean): void {
		selectableRows.forEach((row) => row.setSelected(selected));
		props.onChange();
	}

	/**
	 * Inverts the selection of the given row, unless it is removed with a selected ancestor.
	 */
	function toggle(row: IUpdateResourcesRemovalRow): void {
		if (!row.removedWith) {
			row.setSelected(!row.selected);
			props.onChange();
		}
	}

	if (!rows.length) {
		return <div className="p-4 text-center text-muted-foreground">Every node of the copies was found in the asset.</div>;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-10">
						<UpdateResourcesSelectAllCheckbox selectedCount={selectedCount} selectableCount={selectableRows.length} onChange={(selected) => selectAll(selected)} />
					</TableHead>
					<TableHead>Not found in the asset</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{rows.map((row) => (
					<TableRow key={row.key} className="cursor-pointer" onClick={() => toggle(row)}>
						<TableCell>
							<Checkbox checked={row.selected || row.removedWith !== null} disabled={row.removedWith !== null} />
						</TableCell>

						<TableCell>
							<div className="flex flex-col overflow-hidden">
								<span className="truncate font-medium">{row.node.name}</span>
								<span className="truncate text-xs text-muted-foreground">{row.removedWith ? `Removed with "${row.removedWith.name}"` : row.description}</span>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

/**
 * Returns the text describing the given removable node: its kind, its copy and what is removed with it.
 */
function getNodeItemDescription(item: IUpdateResourcesNodeItem, showCopy: boolean): string {
	const parts: string[] = [getNodeKindLabel(item.node)];

	if (showCopy && item.copy) {
		parts.push(`copy "${item.copy.sceneRoot.name}"`);
	}

	const descendants = item.node.getDescendants(false);
	if (descendants.length) {
		parts.push(`removed with its ${descendants.length} descendant${descendants.length > 1 ? "s" : ""}`);
	}

	const removedNodes = new Set<Node>([item.node, ...descendants]);
	const instances = [...removedNodes].map((node) => (isMesh(node) ? node.instances : [])).flat();
	const outsideInstances = instances.filter((instance) => !removedNodes.has(instance)).length;

	if (outsideInstances) {
		parts.push(`and ${outsideInstances} instance${outsideInstances > 1 ? "s" : ""} placed elsewhere`);
	}

	return parts.join(" · ");
}

/**
 * Returns the label of the kind of the given node.
 */
function getNodeKindLabel(node: Node): string {
	switch (node.getClassName()) {
		case "Mesh":
			return "Mesh";

		case "InstancedMesh":
			return "Instance";

		default:
			return "Transform node";
	}
}
