import { basename, dirname, join } from "path/posix";

import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { Node, LoadAssetContainerAsync, AssetContainer, Mesh, AnimationGroup, SubMesh, Tools, AnimatorAvatar, TransformNode } from "babylonjs";

import { SpinnerUIComponent } from "../../../ui/spinner";
import { Checkbox } from "../../../ui/shadcn/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/shadcn/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/shadcn/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../../../ui/shadcn/ui/table";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../../../ui/shadcn/ui/alert-dialog";

import { UniqueNumber } from "../../../tools/tools";
import { openSingleFileDialog } from "../../../tools/dialog";
import { isMesh, isTransformNode } from "../../../tools/guards/nodes";

import { Editor } from "../../main";

export async function showUpdateResourcesFromAsset(editor: Editor, node: Node) {
	const filename = openSingleFileDialog({
		title: "Select the asset to update the hierarchy from",
		filters: [
			{ name: "GLTF", extensions: ["gltf", "glb"] },
			{ name: "Babylon.js Scene File", extensions: ["babylon"] },
		],
		defaultPath: editor.layout.assets.state.browsedPath,
	});

	if (!filename) {
		return;
	}

	const div = document.createElement("div");
	div.style.width = "100%";
	div.style.height = "100%";
	document.body.appendChild(div);

	const root = createRoot(div);

	return new Promise<void>((resolve) => {
		root.render(
			<UpdateResourcesFromAsset
				editor={editor}
				object={node}
				filename={filename}
				onClose={() => {
					resolve();

					root.unmount();
					document.body.removeChild(div);
				}}
			/>
		);
	});
}

export interface IUpdateResourcesMeshItem {
	object: Mesh;
	update: boolean;
	matchedResource: Mesh | null;
}

export interface IUpdateResourcesAnimationGroupItem {
	update: boolean;
	object: AnimationGroup;
	rootNode: TransformNode | null;
	matchedRootNode: TransformNode | null;
}

export interface IUpdateResourcesFromAssetProps {
	editor: Editor;
	object: Node;
	filename: string;
	onClose: () => void;
}

export interface IUpdateResourcesFromAssetState {
	loading: boolean;

	objectMeshes: Mesh[];
	objectTransformNodes: TransformNode[];

	assetMeshes: IUpdateResourcesMeshItem[];
	assetAnimationGroups: IUpdateResourcesAnimationGroupItem[];
}

export class UpdateResourcesFromAsset extends Component<IUpdateResourcesFromAssetProps, IUpdateResourcesFromAssetState> {
	private _container!: AssetContainer;

	public constructor(props: IUpdateResourcesFromAssetProps) {
		super(props);

		this.state = {
			loading: true,

			objectMeshes: [],
			objectTransformNodes: [],

			assetMeshes: [],
			assetAnimationGroups: [],
		};
	}

	public render(): ReactNode {
		return (
			<AlertDialog open>
				<AlertDialogContent className="min-w-[50vw] h-fit max-h-[50vh] overflow-y-auto transition-all duration-300 ease-in-out">
					<AlertDialogHeader className="w-full">
						<AlertDialogTitle>Update Resources From Asset</AlertDialogTitle>
						<AlertDialogDescription>{basename(this.props.filename)}</AlertDialogDescription>
					</AlertDialogHeader>

					{this.state.loading && (
						<div className="flex justify-center items-center">
							<SpinnerUIComponent />
						</div>
					)}

					{!this.state.loading && (
						<Tabs defaultValue="meshes" className="w-full">
							<TabsList className="w-full">
								<TabsTrigger value="meshes" className="w-full">
									Meshes
								</TabsTrigger>
								<TabsTrigger value="animations" className="w-full">
									Animations
								</TabsTrigger>
							</TabsList>

							{!this.state.loading && <TabsContent value="meshes">{this._getMeshesGridComponent(this.state.assetMeshes)}</TabsContent>}
							{!this.state.loading && <TabsContent value="animations">{this._getAnimationGroupsGridComponent(this.state.assetAnimationGroups)}</TabsContent>}
						</Tabs>
					)}

					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => this.props.onClose()}>Cancel</AlertDialogCancel>
						<AlertDialogAction disabled={this.state.loading} onClick={() => this._update()}>
							Update
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	public async componentDidMount(): Promise<void> {
		this._container = await LoadAssetContainerAsync(basename(this.props.filename), this.props.editor.layout.preview.scene, {
			rootUrl: join(dirname(this.props.filename), "/"),
		});

		this._container.meshes.forEach((mesh) => {
			mesh.id = Tools.RandomId();
			mesh.uniqueId = UniqueNumber.Get();
		});

		this._container.transformNodes.forEach((node) => {
			node.id = Tools.RandomId();
			node.uniqueId = UniqueNumber.Get();
		});

		this._container.geometries.forEach((geometry) => {
			geometry.id = Tools.RandomId();
			geometry.uniqueId = UniqueNumber.Get();
		});

		// Get all meshes from the edtited object.
		const objectMeshes: Mesh[] = [];
		if (isMesh(this.props.object)) {
			objectMeshes.push(this.props.object);
		}

		const objectTransformNodes: TransformNode[] = [];
		if (isTransformNode(this.props.object)) {
			objectTransformNodes.push(this.props.object);
		}

		objectMeshes.push(...(this.props.object.getDescendants(false, (n) => isMesh(n)) as Mesh[]));
		objectTransformNodes.push(...(this.props.object.getDescendants(false, (n) => isTransformNode(n)) as TransformNode[]));

		// Get all meshes from the asset that match the name of the meshes from the edited object.
		const assetMeshes = this._container.meshes
			.filter((m) => isMesh(m) && m.geometry)
			.map((m) => {
				const matchedResource = objectMeshes.find((om) => om.name === m.name) ?? null;

				return {
					matchedResource,
					object: m,
					update: false,
				} as IUpdateResourcesMeshItem;
			});

		// Get all animation groups
		const assetAnimationGroups = this._container.animationGroups.map(
			(ag) =>
				({
					object: ag,
					update: false,
					rootNode: null,
				}) as IUpdateResourcesAnimationGroupItem
		);

		this.setState({
			loading: false,

			objectMeshes,
			objectTransformNodes,

			assetMeshes,
			assetAnimationGroups,
		});
	}

	public componentWillUnmount(): void {
		this._container?.dispose();
	}

	private _update(): void {
		// Update geometries if needed.
		this.state.assetMeshes.forEach((c) => {
			if (c.update && c.matchedResource) {
				c.matchedResource.geometry?.releaseForMesh(c.matchedResource, true);

				if (c.object.geometry) {
					const geometryContainerIndex = this._container.geometries.indexOf(c.object.geometry);
					if (geometryContainerIndex !== -1) {
						this._container.geometries.splice(geometryContainerIndex, 1);
					}

					this.props.editor.layout.preview.scene.addGeometry(c.object.geometry);
					c.object.geometry?.applyToMesh(c.matchedResource);
				}

				c.matchedResource.subMeshes = c.object.subMeshes.map(
					(sm, index) => new SubMesh(index, sm.verticesStart, sm.verticesCount, sm.indexStart, sm.indexCount, c.matchedResource!, c.matchedResource!, true, false)
				);
			}
		});

		// Update animation groups
		this.state.assetAnimationGroups.forEach((c) => {
			if (c.update && c.rootNode && c.matchedRootNode) {
				const oldName = c.rootNode?.name;

				const avatar = new AnimatorAvatar(c.object.name, c.rootNode ?? undefined, false);

				const animationGroup = avatar.retargetAnimationGroup(c.object, {
					fixRootPosition: false,
					fixGroundReference: false,
					retargetAnimationKeys: false,
					animationGroupName: c.object.name,
					rootNodeName: c.matchedRootNode?.name,
				});

				animationGroup.play();

				if (c.rootNode && oldName) {
					c.rootNode.name = oldName;
				}
			}
		});

		this.props.onClose();
	}

	private _getMeshesGridComponent(components: IUpdateResourcesMeshItem[]): ReactNode {
		const onRowClick = (c: IUpdateResourcesMeshItem) => {
			c.update = !c.update;
			this.forceUpdate();
		};

		const onMatchedResourceChange = (c: IUpdateResourcesMeshItem, value: string) => {
			c.matchedResource = this.state.objectMeshes.find((om) => om.name === value) ?? null;
			this.forceUpdate();
		};

		return (
			<Table>
				<TableCaption>List of all available meshes.</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[48px]"></TableHead>
						<TableHead className="w-full">Name</TableHead>
						<TableHead className="w-full">Target Mesh</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{components.map((c) => (
						<TableRow key={c.object.id} className="cursor-pointer" onClick={() => onRowClick(c)}>
							<TableCell className="w-[48px]">
								<Checkbox checked={c.update} />
							</TableCell>
							<TableCell className="w-full font-medium">{c.object.name}</TableCell>
							<TableCell className="w-full font-thin">
								<Select value={c.matchedResource?.name ?? ""} disabled={!c.update} onValueChange={(value) => onMatchedResourceChange(c, value)}>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="???" />
									</SelectTrigger>
									<SelectContent>
										{this.state.objectMeshes.map((om) => (
											<SelectItem key={om.id} value={om.name}>
												{om.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	}

	private _getAnimationGroupsGridComponent(components: IUpdateResourcesAnimationGroupItem[]): ReactNode {
		const allSceneNodes = [...this.state.objectMeshes, ...this.state.objectTransformNodes];
		const allAssetNodes = [...this._container.meshes, ...this._container.transformNodes];

		const onRowClick = (c: IUpdateResourcesAnimationGroupItem) => {
			c.update = !c.update;
			this.forceUpdate();
		};

		const onRootNodeChange = (c: IUpdateResourcesAnimationGroupItem, value: string) => {
			c.rootNode = allSceneNodes.find((om) => om.name === value) ?? null;

			components.forEach((comp) => {
				if (comp.update && !comp.rootNode) {
					comp.rootNode = c.rootNode;
				}
			});

			this.forceUpdate();
		};

		const onAssetRootNodeChange = (c: IUpdateResourcesAnimationGroupItem, value: string) => {
			c.matchedRootNode = allAssetNodes.find((om) => om.name === value) ?? null;

			components.forEach((comp) => {
				if (comp.update && !comp.matchedRootNode) {
					comp.matchedRootNode = c.matchedRootNode;
				}
			});

			this.forceUpdate();
		};

		return (
			<Table>
				<TableCaption>List of all available animation groups.</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[48px]"></TableHead>
						<TableHead className="w-full">Name</TableHead>
						<TableHead className="w-full">Root Node</TableHead>
						<TableHead className="w-full">Asset Root Node</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{components.map((c) => (
						<TableRow key={c.object.name} className="cursor-pointer" onClick={() => onRowClick(c)}>
							<TableCell className="w-[48px]">
								<Checkbox checked={c.update} />
							</TableCell>
							<TableCell className="w-1/3 font-medium">{c.object.name}</TableCell>
							<TableCell className="w-full font-thin">
								<Select value={c.rootNode?.name ?? ""} disabled={!c.update} onValueChange={(value) => onRootNodeChange(c, value)}>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="???" />
									</SelectTrigger>
									<SelectContent>
										{[...this.state.objectMeshes, ...this.state.objectTransformNodes].map((om) => (
											<SelectItem key={om.id} value={om.name}>
												{om.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</TableCell>
							<TableCell className="w-full font-thin">
								<Select value={c.matchedRootNode?.name ?? ""} disabled={!c.update} onValueChange={(value) => onAssetRootNodeChange(c, value)}>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="???" />
									</SelectTrigger>
									<SelectContent>
										{allAssetNodes.map((om) => (
											<SelectItem key={om.id} value={om.name}>
												{om.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	}
}
