import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { Node, AssetContainer, SceneLoader, Mesh, Skeleton, AnimationGroup } from "babylonjs";

import { Editor } from "../editor/main";

import { isMesh } from "../tools/guards/nodes";
import { openSingleFileDialog } from "../tools/dialog";
import { unique, waitNextAnimationFrame } from "../tools/tools";

import { Checkbox } from "./shadcn/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./shadcn/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./shadcn/ui/table";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./shadcn/ui/alert-dialog";

import { showAlert } from "./dialog";
import { SpinnerUIComponent } from "./spinner";

export enum SceneAssetBrowserDialogMode {
	Meshes = 1,
	Skeletons = 2,
	Materials = 4,
	Lights = 8,
	AnimationGroups = 16,
}

export type AssetsBrowserDialogOptions = {
	/**
	 * Defines wether or not multi selection is enabled.
	 */
	multiSelect: boolean;
	/**
	 * Defines the filter to apply to the scene asset browser dialog to only show specific elements.
	 */
	filter: SceneAssetBrowserDialogMode;
};

export type AssetsBrowserDialogResult = {
	container: AssetContainer;

	selectedMeshes: Mesh[];
	selectedSkeletons: Skeleton[];
	selectedAnimationGroups: AnimationGroup[];
};

/**
 * Shows the file open dialog to select a scene file (.babylon, .gltf, etc.) and then opens the dialog
 * used to browse the scene file and select elements to import.
 * @param editor defines the reference to the editor.
 * @param options defines the options of the assets browser dialog.
 */
export function showAssetBrowserDialog(editor: Editor, options: AssetsBrowserDialogOptions): Promise<AssetsBrowserDialogResult> {
	const filename = openSingleFileDialog({
		title: "Select Asset",
		filters: [
			{
				name: "Supported Scene Files",
				extensions: [".babylon", ".gltf", ".glb", ".fbx"],
			},
		],
	});

	if (!filename) {
		return Promise.reject("User decided to not pick any asset in scene file.");
	}

	const div = document.createElement("div");
	div.style.width = "100%";
	div.style.height = "100%";
	document.body.appendChild(div);

	const root = createRoot(div);

	return new Promise<AssetsBrowserDialogResult>((resolve, reject) => {
		root.render(
			<SceneAssetBrowserDialog
				editor={editor}
				filename={filename}
				filter={options.filter}
				multiSelect={options.multiSelect}
				onClose={() => {
					reject("User decided to close the dialog without selecting any asset.");

					root.unmount();
					document.body.removeChild(div);
				}}
				onSelectedAssets={(result) => {
					resolve(result);

					root.unmount();
					document.body.removeChild(div);
				}}
			/>
		);
	});
}

export interface ISceneAssetBrowserDialogProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines the absolute path to the scene file to load and pick items in.
	 */
	filename: string;

	/**
	 * Defines wether or not multi-select is enabled.
	 */
	multiSelect: boolean;
	/**
	 * Defines the filter to apply to the scene asset browser dialog to only show specific elements.
	 */
	filter: SceneAssetBrowserDialogMode;

	/**
	 * Defines the callback called on the user wants to close the dialog.
	 */
	onClose: () => void;
	/**
	 * Defines the callback called on the user wants to import some assets.
	 */
	onSelectedAssets: (result: AssetsBrowserDialogResult) => void;
}

export interface ISceneAssetBrowserDialogState {
	/**
	 * Defines wether or not the scene file is being loaded.
	 */
	loading: boolean;
	/**
	 * Defines the list of all selected meshes.
	 */
	selectedMeshes: Mesh[];
	/**
	 * Defines the list of all selected skeletons.
	 */
	selectedSkeletons: Skeleton[];
	/**
	 * Defines the list of all selected animation groups.
	 */
	selectedAnimationGroups: AnimationGroup[];
}

export class SceneAssetBrowserDialog extends Component<ISceneAssetBrowserDialogProps, ISceneAssetBrowserDialogState> {
	private _container: AssetContainer | null = null;

	public constructor(props: ISceneAssetBrowserDialogProps) {
		super(props);

		this.state = {
			loading: true,
			selectedMeshes: [],
			selectedSkeletons: [],
			selectedAnimationGroups: [],
		};
	}

	public render(): ReactNode {
		return (
			<AlertDialog open>
				<AlertDialogContent className="w-full h-fit transition-all duration-300 ease-in-out">
					<AlertDialogHeader className="w-full">
						<AlertDialogTitle>Scene Browser</AlertDialogTitle>
						<AlertDialogDescription className="w-full">
							<Tabs defaultValue="meshes" className="w-full">
								<TabsList className="w-full">
									{(this.props.filter & SceneAssetBrowserDialogMode.Meshes) !== 0 && (
										<TabsTrigger value="meshes" className="w-full">
											Meshes
										</TabsTrigger>
									)}
									{(this.props.filter & SceneAssetBrowserDialogMode.Skeletons) !== 0 && (
										<TabsTrigger value="skeletons" className="w-full">
											Skeletons
										</TabsTrigger>
									)}
								</TabsList>

								{!this.state.loading && (this.props.filter & SceneAssetBrowserDialogMode.Meshes) !== 0 && (
									<TabsContent value="meshes">{this._getMeshesGridComponent()}</TabsContent>
								)}

								{!this.state.loading && (this.props.filter & SceneAssetBrowserDialogMode.Skeletons) !== 0 && (
									<TabsContent value="skeletons">{this._getSkeletonsGridComponent()}</TabsContent>
								)}
							</Tabs>

							{this.state.loading && (
								<div className="flex justify-center items-center w-full h-full">
									<SpinnerUIComponent />
								</div>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => this.props.onClose()}>Cancel</AlertDialogCancel>
						<AlertDialogAction disabled={this.state.loading} onClick={() => this._handleImport()}>
							Import
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	public async componentDidMount(): Promise<unknown> {
		try {
			this._container = await SceneLoader.LoadAssetContainerAsync("", this.props.filename, this.props.editor.layout.preview.scene);
		} catch (e) {
			return showAlert("Error", e.message);
		}

		this.setState({
			loading: false,
		});
	}

	private _handleImport(): void {
		if (!this._container) {
			return;
		}

		this.state.selectedSkeletons.forEach((s) => {
			this._container?.skeletons.splice(this._container?.skeletons.indexOf(s), 1);
		});

		this.state.selectedMeshes.forEach((m) => {
			this._container?.meshes.splice(this._container?.meshes.indexOf(m), 1);

			if (m.geometry) {
				this._container?.geometries.splice(this._container?.geometries.indexOf(m.geometry), 1);
			}
		});

		const animationGroups = this._getAnimationGroupsToImport();
		animationGroups.forEach((ag) => {
			this._container?.animationGroups.splice(this._container?.animationGroups.indexOf(ag), 1);
		});

		this.props.onSelectedAssets({
			container: this._container,
			selectedAnimationGroups: animationGroups,

			selectedMeshes: this.state.selectedMeshes,
			selectedSkeletons: this.state.selectedSkeletons,
		});
	}

	private _getAnimationGroupsToImport(): AnimationGroup[] {
		if (!this._container) {
			return [];
		}

		let nodes: Node[] = [];
		this.state.selectedMeshes.forEach((m) => {
			nodes.push(m);

			m.skeleton?.bones.forEach((b) => {
				nodes.push(b);
				if (b._linkedTransformNode) {
					nodes.push(b._linkedTransformNode);
				}
			});
		});

		this.state.selectedSkeletons.forEach((s) => {
			s.bones.forEach((b) => {
				nodes.push(b);
				if (b._linkedTransformNode) {
					nodes.push(b._linkedTransformNode);
				}
			});
		});

		nodes = unique(nodes);

		const animationGroups = this._container.animationGroups.filter((ag) => {
			return ag.targetedAnimations.find((ta) => nodes.includes(ta.target));
		});

		animationGroups.push(...this.state.selectedAnimationGroups);

		return unique(animationGroups);
	}

	private async _handleSelectedAsset<T>(asset: T, array: T[]): Promise<T[]> {
		if (!this.props.multiSelect) {
			this.setState({
				selectedMeshes: [],
				selectedSkeletons: [],
				selectedAnimationGroups: [],
			});

			await waitNextAnimationFrame();
		}

		const slice = this.props.multiSelect ? array.slice(0) : [];

		const index = slice.indexOf(asset);
		if (index !== -1) {
			slice.splice(index, 1);
		} else {
			slice.push(asset);
		}

		return slice;
	}

	private _getMeshesGridComponent(): ReactNode {
		const meshes = this._container?.meshes.filter((m) => isMesh(m) && m.geometry) as Mesh[];

		return (
			<Table>
				<TableCaption>List of all available meshes with geometry.</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[48px]"></TableHead>
						<TableHead className="w-full">Name</TableHead>
						<TableHead className="w-full">Vertices</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{meshes?.map((m) => (
						<TableRow
							className="cursor-pointer"
							onClick={async () => {
								this.setState({
									selectedMeshes: await this._handleSelectedAsset(m, this.state.selectedMeshes),
								});
							}}
						>
							<TableCell className="w-[48px]">
								<Checkbox checked={this.state.selectedMeshes.includes(m)} />
							</TableCell>
							<TableCell className="w-full font-medium">{m.name}</TableCell>
							<TableCell className="w-full font-thin">{m.geometry!.getTotalVertices()}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	}

	private _getSkeletonsGridComponent(): ReactNode {
		return (
			<Table>
				<TableCaption>List of all available skeletons.</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[48px]"></TableHead>
						<TableHead className="w-full">Name</TableHead>
						<TableHead className="w-full">Bones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{this._container?.skeletons.map((s) => (
						<TableRow
							className="cursor-pointer"
							onClick={async () => {
								this.setState({
									selectedSkeletons: await this._handleSelectedAsset(s, this.state.selectedSkeletons),
								});
							}}
						>
							<TableCell className="w-[48px]">
								<Checkbox checked={this.state.selectedSkeletons.includes(s)} />
							</TableCell>
							<TableCell className="w-full font-medium">{s.name}</TableCell>
							<TableCell className="w-full font-thin">{s.bones.length}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	}
}
