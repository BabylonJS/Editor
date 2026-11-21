import { basename } from "path/posix";

import { Component, ReactNode } from "react";

import { toast } from "sonner";

import { AssetContainer, Node } from "babylonjs";

import { SpinnerUIComponent } from "../../../../ui/spinner";
import { Switch } from "../../../../ui/shadcn/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../ui/shadcn/ui/tabs";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../../../../ui/shadcn/ui/alert-dialog";

import { waitNextAnimationFrame } from "../../../../tools/tools";

import { Editor } from "../../../main";

import { removeObjects } from "../remove";

import { loadUpdateResourcesAsset } from "./load";
import { applyResourcesUpdate } from "./apply/apply";
import { getNodesToRemove } from "./apply/removal";
import { analyzeResourcesUpdate } from "./match/analyze";
import { getGeometryMesh } from "./match/geometry";

import { IUpdateResourcesAnalysis, IUpdateResourcesReport } from "./types";

import { UpdateResourcesNodesTable, isNodeItemSelected } from "./ui/nodes-table";
import { UpdateResourcesRemovalTable, getRemovalRows } from "./ui/removal-table";
import { UpdateResourcesAnimationGroupsTable, isAnimationGroupItemSelected } from "./ui/animation-groups-table";

export interface IUpdateResourcesDialogProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines the reference to the node of the scene to update, with its descendants.
	 */
	node: Node;
	/**
	 * Defines the absolute path of the asset file to update the resources from.
	 */
	filename: string;
	/**
	 * Called when the dialog must be closed.
	 */
	onClose: () => void;
}

export interface IUpdateResourcesDialogState {
	/**
	 * Defines whether or not the asset is being loaded and analyzed.
	 */
	loading: boolean;
	/**
	 * Defines whether or not the resources are being updated.
	 */
	updating: boolean;
	/**
	 * Defines the error met while loading the asset, if any.
	 */
	error: string | null;
	/**
	 * Defines the analysis of the edited hierarchy against the asset, once loaded.
	 */
	analysis: IUpdateResourcesAnalysis | null;
}

/**
 * Dialog listing the resources (meshes with their skeleton and morph targets, transforms and animation groups) of the edited
 * hierarchy that can be updated from the selected asset, with the objects of the asset they were matched with. The user can
 * change the matches and choose what to update.
 */
export class UpdateResourcesDialog extends Component<IUpdateResourcesDialogProps, IUpdateResourcesDialogState> {
	private _container: AssetContainer | null = null;
	private _unmounted: boolean = false;

	/**
	 * Constructor.
	 * @param props defines the properties of the dialog.
	 */
	public constructor(props: IUpdateResourcesDialogProps) {
		super(props);

		this.state = {
			loading: true,
			updating: false,
			error: null,
			analysis: null,
		};
	}

	/**
	 * Renders the dialog: title, body (see _renderBody) and the buttons to cancel or to update the selected resources.
	 */
	public render(): ReactNode {
		const analysis = this.state.analysis;
		const canUpdate = analysis !== null && !this.state.updating && this._getSelectedCount(analysis) > 0;

		return (
			<AlertDialog open>
				<AlertDialogContent className="flex flex-col w-[80vw] max-w-[1200px] h-[80vh]">
					<AlertDialogHeader>
						<AlertDialogTitle>Update Resources From Asset</AlertDialogTitle>
						<AlertDialogDescription>
							Update "{this.props.node.name}" from {basename(this.props.filename)}
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className="flex-1 min-h-0">{this._renderBody()}</div>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={this.state.updating} onClick={() => this.props.onClose()}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction disabled={!canUpdate} onClick={() => this._update()}>
							Update
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	/**
	 * Loads the asset and analyzes the edited hierarchy against it once the dialog is mounted.
	 */
	public async componentDidMount(): Promise<void> {
		let container: AssetContainer;
		try {
			container = await loadUpdateResourcesAsset(this.props.editor.layout.preview.scene, this.props.filename, this.props.editor.path ?? "");
		} catch (e) {
			return this._setError(`Failed to load the asset: ${e instanceof Error ? e.message : String(e)}`);
		}

		if (this._unmounted) {
			return container.dispose();
		}

		this._container = container;

		try {
			this.setState({
				loading: false,
				analysis: analyzeResourcesUpdate(this.props.node, container, this.props.filename),
			});
		} catch (e) {
			this._setError(`Failed to analyze the asset: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	/**
	 * Releases the loaded asset when the dialog is closed. The resources used by the scene were copied from the asset.
	 */
	public componentWillUnmount(): void {
		this._unmounted = true;

		this._container?.dispose();
		this._container = null;
	}

	/**
	 * Shows the given error in the dialog, if it is still opened.
	 */
	private _setError(error: string): void {
		if (!this._unmounted) {
			this.setState({ error, loading: false });
		}
	}

	/**
	 * Renders the content of the dialog depending on its state: loading, error, or the lists of the resources to update.
	 */
	private _renderBody(): ReactNode {
		if (this.state.loading || this.state.updating) {
			return (
				<div className="flex flex-col gap-4 justify-center items-center w-full h-full">
					<SpinnerUIComponent width="64px" />
					<div className="text-muted-foreground">{this.state.loading ? "Loading and analyzing the asset..." : "Updating the resources..."}</div>
				</div>
			);
		}

		if (this.state.error || !this.state.analysis) {
			return <div className="flex justify-center items-center w-full h-full text-destructive">{this.state.error ?? "Failed to load the asset."}</div>;
		}

		const analysis = this.state.analysis;
		const showCopies = analysis.copies.length > 1;

		// Instances are not listed with the meshes: they follow their source mesh.
		const meshes = analysis.nodes.filter((item) => item.node.getClassName() === "Mesh" && getGeometryMesh(item.node));
		const removalRows = getRemovalRows(analysis, showCopies);

		return (
			<Tabs defaultValue="meshes" className="flex flex-col w-full h-full">
				{this._renderSummary(analysis)}

				<TabsList className="w-full">
					<TabsTrigger value="meshes" className="w-full">
						Meshes ({meshes.filter((item) => isNodeItemSelected(item, "geometry")).length}/{meshes.length})
					</TabsTrigger>
					<TabsTrigger value="animations" className="w-full">
						Animations ({analysis.animationGroups.filter((item) => isAnimationGroupItemSelected(item)).length}/{analysis.animationGroups.length})
					</TabsTrigger>
					<TabsTrigger value="transforms" className="w-full">
						Transforms ({analysis.nodes.filter((item) => isNodeItemSelected(item, "transform")).length}/{analysis.nodes.length})
					</TabsTrigger>
					<TabsTrigger value="removed" className="w-full">
						Removed ({removalRows.filter((row) => row.selected || row.removedWith).length}/{removalRows.length})
					</TabsTrigger>
				</TabsList>

				<div className="flex-1 min-h-0 overflow-y-auto">
					<TabsContent value="meshes">
						<label className="flex gap-2 items-center px-2 pb-2 text-sm cursor-pointer">
							<Switch
								checked={analysis.updateMaterials}
								onCheckedChange={(checked) => {
									analysis.updateMaterials = checked;
									this.forceUpdate();
								}}
							/>
							<span>Update materials</span>
							<span className="text-muted-foreground">
								— replaces the materials of the updated meshes by the materials of the asset (the changes made in the editor are lost).
							</span>
						</label>

						<UpdateResourcesNodesTable
							mode="geometry"
							items={meshes}
							choices={analysis.assetMeshes}
							showCopies={showCopies}
							showMaterials={analysis.updateMaterials}
							onChange={() => this.forceUpdate()}
						/>
					</TabsContent>

					<TabsContent value="animations">
						<UpdateResourcesAnimationGroupsTable
							items={analysis.animationGroups}
							choices={analysis.container.animationGroups}
							nodes={analysis.nodes}
							showCopies={showCopies}
							onChange={() => this.forceUpdate()}
						/>
					</TabsContent>

					<TabsContent value="transforms">
						<div className="px-2 pb-2 text-sm text-muted-foreground">
							Places the nodes like in the asset: same parent (when it exists in the scene), position, rotation and scaling. The joints of the updated skeletons
							always take the rest pose of the asset.
						</div>
						<UpdateResourcesNodesTable
							mode="transform"
							items={analysis.nodes}
							choices={analysis.assetNodes}
							showCopies={showCopies}
							onChange={() => this.forceUpdate()}
						/>
					</TabsContent>

					<TabsContent value="removed">
						<div className="px-2 pb-2 text-sm text-muted-foreground">
							Nodes of the scene, and LODs of the updated meshes, that were not found in the asset: deleted by the artist, or added in the editor. They are kept
							unless selected.
						</div>
						<UpdateResourcesRemovalTable analysis={analysis} showCopies={showCopies} onChange={() => this.forceUpdate()} />
					</TabsContent>
				</div>
			</Tabs>
		);
	}

	/**
	 * Renders the summary of the analysis: how many copies of the asset were found and how many nodes were matched.
	 */
	private _renderSummary(analysis: IUpdateResourcesAnalysis): ReactNode {
		if (!analysis.copies.length) {
			return (
				<div className="pb-2 text-sm text-amber-500">
					No node of "{this.props.node.name}" seems to come from this asset: choose the corresponding objects manually or check the selected asset.
				</div>
			);
		}

		const matchedCount = analysis.nodes.filter((item) => item.match).length;

		return (
			<div className="pb-2 text-sm text-muted-foreground">
				{analysis.copies.length > 1 ? `${analysis.copies.length} copies of the asset found, ` : ""}
				{matchedCount} of {analysis.nodes.length} nodes matched. Check the matches marked as similar before updating.
			</div>
		);
	}

	/**
	 * Returns the number of updates selected by the user.
	 */
	private _getSelectedCount(analysis: IUpdateResourcesAnalysis): number {
		const nodes = analysis.nodes.filter((item) => isNodeItemSelected(item, "geometry") || isNodeItemSelected(item, "transform")).length;
		const animationGroups = analysis.animationGroups.filter((item) => isAnimationGroupItemSelected(item)).length;
		const removals = getRemovalRows(analysis, false).filter((row) => row.selected).length;

		return nodes + animationGroups + removals;
	}

	/**
	 * Updates the selected resources, reports what was done and closes the dialog.
	 */
	private async _update(): Promise<void> {
		const analysis = this.state.analysis;
		if (!analysis) {
			return;
		}

		this.setState({ updating: true });
		await waitNextAnimationFrame();

		let report: IUpdateResourcesReport;
		try {
			report = applyResourcesUpdate(this.props.editor.layout.preview.scene, analysis);
		} catch (e) {
			this.props.editor.layout.console.error(`Failed to update the resources: ${e instanceof Error ? e.message : String(e)}`);
			toast.error("Failed to update the resources.");

			return this.props.onClose();
		}

		// The nodes are removed like in the graph, so the removal can be undone.
		const nodesToRemove = getNodesToRemove(this.props.editor.layout.preview.scene, analysis, report);
		if (nodesToRemove.length) {
			removeObjects(this.props.editor, nodesToRemove);
			report.removedNodes = nodesToRemove.length;
		}

		report.warnings.forEach((warning) => this.props.editor.layout.console.warn(warning));

		if (report.warnings.length) {
			toast.warning(`${getReportMessage(report)} ${report.warnings.length} warning(s), see the console.`);
		} else {
			toast.success(getReportMessage(report));
		}

		this.props.editor.layout.graph.refresh();
		this.props.editor.layout.inspector.forceUpdate();

		this.props.onClose();
	}
}

/**
 * Returns the message summarizing what was updated.
 * @param report defines the report of the update.
 */
function getReportMessage(report: IUpdateResourcesReport): string {
	const parts: string[] = [];

	/**
	 * Adds the given count to the message, if not zero, with the singular or plural form of its label.
	 */
	const add = (count: number, singular: string, plural: string): void => {
		if (count) {
			parts.push(`${count} ${count === 1 ? singular : plural}`);
		}
	};

	add(report.geometries, "mesh", "meshes");
	add(report.skeletons, "skeleton", "skeletons");
	add(report.morphTargetManagers, "morph target manager", "morph target managers");
	add(report.materials, "material", "materials");
	add(report.lods, "LOD", "LODs");
	add(report.transforms, "transform", "transforms");
	add(report.updatedAnimationGroups, "animation group updated", "animation groups updated");
	add(report.addedAnimationGroups, "animation group added", "animation groups added");
	add(report.createdNodes, "node created", "nodes created");
	add(report.removedNodes, "node removed", "nodes removed");
	add(report.removedLods, "LOD removed", "LODs removed");

	return parts.length ? `Resources updated: ${parts.join(", ")}.` : "Nothing was updated.";
}
