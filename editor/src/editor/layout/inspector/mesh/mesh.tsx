import { extname } from "path/posix";

import { toast } from "sonner";
import { Component, ReactNode } from "react";

import { FaCopy, FaLink } from "react-icons/fa6";
import { IoAddSharp, IoCloseOutline } from "react-icons/io5";
import { AiOutlinePlus } from "react-icons/ai";

import { AbstractMesh, InstancedMesh, Material, Mesh, MorphTarget, MultiMaterial, Node, Observer, PBRMaterial, StandardMaterial, NodeMaterial } from "babylonjs";
import { SkyMaterial, GridMaterial, NormalMaterial, WaterMaterial, LavaMaterial, TriPlanarMaterial, CellMaterial, FireMaterial, GradientMaterial } from "babylonjs-materials";

import { CollisionMesh } from "../../../nodes/collision";

import { showPrompt } from "../../../../ui/dialog";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Separator } from "../../../../ui/shadcn/ui/separator";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "../../../../ui/shadcn/ui/dropdown-menu";

import { ICommandPaletteType } from "../../../dialogs/command-palette/command-palette";
import { getMaterialCommands, getMaterialsLibraryCommands } from "../../../dialogs/command-palette/material";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../../tools/tools";
import { onNodeModifiedObservable } from "../../../../tools/observables";
import { updateIblShadowsRenderPipeline } from "../../../../tools/light/ibl";
import { isAbstractMesh, isInstancedMesh, isMesh } from "../../../../tools/guards/nodes";
import { updateAllLights, updateLightShadowMapRefreshRate, updatePointLightShadowMapRenderListPredicate } from "../../../../tools/light/shadows";

import { applyMaterialAssetToObject } from "../../preview/import/material";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { ScriptInspectorComponent } from "../script/script";
import { CustomMetadataInspector } from "../metadata/custom-metadata";

import { onGizmoNodeChangedObservable } from "../../preview/gizmo";

import { EditorTransformNodeInspector } from "../transform";
import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorPBRMaterialInspector } from "../material/pbr";
import { EditorSkyMaterialInspector } from "../material/sky";
import { EditorGridMaterialInspector } from "../material/grid";
import { EditorNodeMaterialInspector } from "../material/node";
import { EditorLavaMaterialInspector } from "../material/lava";
import { EditorCellMaterialInspector } from "../material/cell";
import { EditorFireMaterialInspector } from "../material/fire";
import { EditorMultiMaterialInspector } from "../material/multi";
import { EditorWaterMaterialInspector } from "../material/water";
import { EditorNormalMaterialInspector } from "../material/normal";
import { EditorGradientMaterialInspector } from "../material/gradient";
import { EditorStandardMaterialInspector } from "../material/standard";
import { EditorTriPlanarMaterialInspector } from "../material/tri-planar";

import { MeshDecalInspector } from "./decal";
import { MeshGeometryInspector } from "./geometry";
import { EditorMeshPhysicsInspector } from "./physics";
import { EditorMeshCollisionInspector } from "./collision";

export interface IEditorMeshInspectorState {
	dragOver: boolean;
}

export class EditorMeshInspector extends Component<IEditorInspectorImplementationProps<AbstractMesh>, IEditorMeshInspectorState> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isAbstractMesh(object);
	}

	private _castShadows: boolean;

	private _collisionMesh: CollisionMesh | null = null;

	public constructor(props: IEditorInspectorImplementationProps<AbstractMesh>) {
		super(props);

		this.state = {
			dragOver: false,
		};

		this._castShadows = props.editor.layout.preview.scene.lights.some((light) => {
			return light.getShadowGenerator()?.getShadowMap()?.renderList?.includes(props.object);
		});
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Common">
					<div className="flex justify-between items-center px-2 py-2">
						<div className="w-1/2">Type</div>

						<div className="flex justify-between items-center w-full">
							<div className="text-white/50">{this.props.object.getClassName()}</div>

							{isInstancedMesh(this.props.object) && (
								<Button
									variant="ghost"
									onClick={() => {
										const instance = this.props.object as InstancedMesh;
										this.props.editor.layout.preview.gizmo.setAttachedObject(instance.sourceMesh);
										this.props.editor.layout.graph.setSelectedNode(instance.sourceMesh);
										this.props.editor.layout.inspector.setEditedObject(instance.sourceMesh);
									}}
								>
									<FaLink className="w-4 h-4" />
								</Button>
							)}
						</div>
					</div>
					<EditorInspectorStringField
						label="Name"
						object={this.props.object}
						property="name"
						onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)}
					/>
					{this.props.object.geometry && (
						<>
							<EditorInspectorSwitchField label="Pickable" object={this.props.object} property="isPickable" />
							<EditorInspectorSwitchField
								label="Visible"
								object={this.props.object}
								property="isVisible"
								onChange={() => updateAllLights(this.props.editor.layout.preview.scene)}
							/>
						</>
					)}
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Transforms">
					<EditorInspectorVectorField
						label={<div className="w-14">Position</div>}
						object={this.props.object}
						property="position"
						onFinishChange={() => this._handleTransformsUpdated()}
					/>
					{EditorTransformNodeInspector.GetRotationInspector(this.props.object, () => this._handleTransformsUpdated())}
					<EditorInspectorVectorField
						label={<div className="w-14">Scaling</div>}
						object={this.props.object}
						property="scaling"
						onFinishChange={() => this._handleTransformsUpdated()}
					/>
				</EditorInspectorSectionField>

				{this.props.object.geometry && (
					<>
						<EditorMeshCollisionInspector {...this.props} />
						<EditorMeshPhysicsInspector mesh={this.props.object} />
					</>
				)}

				{this.props.editor.layout.preview.scene.lights.length > 0 && this.props.object.geometry && (
					<EditorInspectorSectionField title="Shadows">
						<EditorInspectorSwitchField
							label="Cast Shadows"
							object={this}
							property="_castShadows"
							noUndoRedo
							onChange={() => this._handleCastShadowsChanged(this._castShadows)}
						/>
						<EditorInspectorSwitchField label="Receive Shadows" object={this.props.object} property="receiveShadows" />
					</EditorInspectorSectionField>
				)}

				<ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

				{isMesh(this.props.object) && (
					<>
						<MeshGeometryInspector object={this.props.object} editor={this.props.editor} />
						<MeshDecalInspector object={this.props.object} />
						{this._getLODsComponent()}
					</>
				)}

				{this._getMaterialComponent()}
				{this._getSkeletonComponent()}
				{this._getMorphTargetManagerComponent()}

				{this.props.object.geometry && (
					<EditorInspectorSectionField title="Misc">
						<EditorInspectorSwitchField label="Infinite Distance" object={this.props.object} property="infiniteDistance" />
						<EditorInspectorSwitchField label="Always Select As Active Mesh" object={this.props.object} property="alwaysSelectAsActiveMesh" />
					</EditorInspectorSectionField>
				)}

				<CustomMetadataInspector object={this.props.object} />
			</>
		);
	}

	private _gizmoObserver: Observer<Node> | null = null;

	public componentDidMount(): void {
		this._gizmoObserver = onGizmoNodeChangedObservable.add((node) => {
			if (node === this.props.object) {
				this.props.editor.layout.inspector.forceUpdate();
			}
		});
	}

	public componentWillUnmount(): void {
		if (this._collisionMesh) {
			this._collisionMesh.isVisible = false;
		}

		if (this._gizmoObserver) {
			onGizmoNodeChangedObservable.remove(this._gizmoObserver);
		}
	}

	private _handleTransformsUpdated(): void {
		if (isMesh(this.props.object)) {
			updateIblShadowsRenderPipeline(this.props.object.getScene());
		}
	}

	private _getLODsComponent(): ReactNode {
		const mesh = this.props.object as Mesh;

		const lods = mesh.getLODLevels();
		if (!lods.length) {
			return null;
		}

		const o = {
			distance: lods[lods.length - 1].distanceOrScreenCoverage ?? 1000,
		};

		function sortLods(value: number) {
			const lods = mesh.getLODLevels().slice();
			lods.forEach((lod) => mesh.removeLODLevel(lod.mesh!));

			lods.reverse().forEach((lod, index) => {
				mesh.addLODLevel(value * (index + 1), lod.mesh);
			});
		}

		return (
			<EditorInspectorSectionField title="LODs">
				<EditorInspectorNumberField
					object={o}
					property="distance"
					label="Linear Distance"
					tooltip="Defines the distance that separates each LODs"
					step={1}
					noUndoRedo
					onChange={(v) => sortLods(v)}
					onFinishChange={(value, oldValue) => {
						registerUndoRedo({
							executeRedo: true,
							undo: () => sortLods(oldValue),
							redo: () => sortLods(value),
						});
					}}
				/>
			</EditorInspectorSectionField>
		);
	}

	private _getMaterialComponent(): ReactNode {
		if (!this.props.object.geometry) {
			return;
		}

		if (!this.props.object.material) {
			return (
				<EditorInspectorSectionField title="Material">
					<div
						onDrop={(e) => this._handleMaterialDrop(e)}
						onDragLeave={() =>
							this.setState({
								dragOver: false,
							})
						}
						onDragOver={(ev) => this._handleMaterialDragOver(ev)}
						className={`flex flex-col justify-center items-center w-full p-4 rounded-lg border-[1px] border-secondary-foreground/35 border-dashed ${this.state.dragOver ? "bg-secondary-foreground/35" : ""} transition-all duration-300 ease-in-out`}
					>
						<div className="text-center">
							<div className="text-xl mb-2">No material</div>
							<div className="text-sm text-muted-foreground mb-2">Drop material file or create material</div>
						</div>

						<div className="flex gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" className="flex gap-2 items-center">
										<AiOutlinePlus className="w-4 h-4" />
										Create Material
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									{getMaterialCommands(this.props.editor).map((command) => (
										<DropdownMenuItem key={command.key} onClick={() => this._handleAddMaterial(command)}>
											{command.text}
										</DropdownMenuItem>
									))}

									<DropdownMenuSeparator />

									<DropdownMenuSub>
										<DropdownMenuSubTrigger>Materials Library</DropdownMenuSubTrigger>
										<DropdownMenuSubContent>
											{getMaterialsLibraryCommands(this.props.editor).map((command) => (
												<DropdownMenuItem key={command.key} onClick={() => this._handleAddMaterial(command)}>
													{command.text}
												</DropdownMenuItem>
											))}
										</DropdownMenuSubContent>
									</DropdownMenuSub>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</EditorInspectorSectionField>
			);
		}

		const inspector = this._getMaterialInspectorComponent(this.props.object.material);
		if (!inspector) {
			return (
				<EditorInspectorSectionField title="Material">
					<div className="text-center text-yellow-500">Unsupported material type: {this.props.object.material.getClassName()}</div>
				</EditorInspectorSectionField>
			);
		}

		return <div className="flex flex-col gap-2 relative">{inspector}</div>;
	}

	private _handleMaterialDrop(ev: React.DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		ev.stopPropagation();

		this.setState({
			dragOver: false,
		});

		const assets = ev.dataTransfer.getData("assets");
		if (assets) {
			this._handleMaterialDropped(assets);
		}
	}

	private _handleMaterialDragOver(ev: React.DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		ev.stopPropagation();

		this.setState({
			dragOver: true,
		});
	}

	private _handleMaterialDropped(assets: string): void {
		const absolutePaths = JSON.parse(assets) as string[];

		if (!Array.isArray(absolutePaths)) {
			return;
		}

		absolutePaths.forEach(async (absolutePath) => {
			await waitNextAnimationFrame();
			const extension = extname(absolutePath).toLowerCase();
			switch (extension) {
				case ".material":
					applyMaterialAssetToObject(this.props.editor, this.props.object, absolutePath);
					break;
			}
		});
	}

	private _handleAddMaterial(command: ICommandPaletteType): void {
		const material = command.action() as Material | null;

		if (!material) {
			return;
		}

		registerUndoRedo({
			executeRedo: true,
			onLost: () => material.dispose(),
			undo: () => (this.props.object.material = null),
			redo: () => (this.props.object.material = material),
		});

		this.forceUpdate();
	}

	private _getMaterialInspectorComponent(material: Material): ReactNode {
		switch (material.getClassName()) {
			case "PBRMaterial":
				return <EditorPBRMaterialInspector mesh={this.props.object} material={this.props.object.material as PBRMaterial} />;

			case "StandardMaterial":
				return <EditorStandardMaterialInspector mesh={this.props.object} material={this.props.object.material as StandardMaterial} />;

			case "NodeMaterial":
				return <EditorNodeMaterialInspector mesh={this.props.object} material={this.props.object.material as NodeMaterial} />;

			case "MultiMaterial":
				return <EditorMultiMaterialInspector material={this.props.object.material as MultiMaterial} />;

			case "SkyMaterial":
				return <EditorSkyMaterialInspector mesh={this.props.object} material={this.props.object.material as SkyMaterial} />;

			case "GridMaterial":
				return <EditorGridMaterialInspector mesh={this.props.object} material={this.props.object.material as GridMaterial} />;

			case "NormalMaterial":
				return <EditorNormalMaterialInspector mesh={this.props.object} material={this.props.object.material as NormalMaterial} />;

			case "WaterMaterial":
				return <EditorWaterMaterialInspector mesh={this.props.object} material={this.props.object.material as WaterMaterial} />;

			case "LavaMaterial":
				return <EditorLavaMaterialInspector mesh={this.props.object} material={this.props.object.material as LavaMaterial} />;

			case "TriPlanarMaterial":
				return <EditorTriPlanarMaterialInspector mesh={this.props.object} material={this.props.object.material as TriPlanarMaterial} />;

			case "CellMaterial":
				return <EditorCellMaterialInspector mesh={this.props.object} material={this.props.object.material as CellMaterial} />;

			case "FireMaterial":
				return <EditorFireMaterialInspector mesh={this.props.object} material={this.props.object.material as FireMaterial} />;

			case "GradientMaterial":
				return <EditorGradientMaterialInspector mesh={this.props.object} material={this.props.object.material as GradientMaterial} />;
		}
	}

	private _getSkeletonComponent(): ReactNode {
		if (!this.props.object.skeleton) {
			return null;
		}

		return (
			<EditorInspectorSectionField title="Skeleton">
				<EditorInspectorSwitchField label="Need Initial Skin Matrix" object={this.props.object.skeleton} property="needInitialSkinMatrix" />

				<Separator />

				<div className="px-[10px] text-lg text-center">Animation Ranges</div>

				{this.props.object.skeleton
					.getAnimationRanges()
					.filter((range) => range)
					.map((range, index) => (
						<div key={index} className="flex items-center gap-[10px]">
							<Button
								variant="ghost"
								className="justify-start w-1/2"
								onDoubleClick={async () => {
									const name = await showPrompt("Rename Animation Range", "Enter the new name for the animation range", range!.name);
									if (name) {
										range!.name = name;
										this.forceUpdate();
									}
								}}
								onClick={() => {
									this.props.object._scene.stopAnimation(this.props.object.skeleton);
									this.props.object.skeleton?.beginAnimation(range!.name, true, 1.0);
								}}
							>
								{range!.name}
							</Button>

							<div className="flex items-center w-1/2">
								<EditorInspectorNumberField
									object={range}
									property="from"
									onChange={() => {
										this.props.editor.layout.preview.scene.stopAnimation(this.props.object.skeleton);
										this.props.editor.layout.preview.scene.beginAnimation(this.props.object.skeleton, range!.from, range!.from, true, 1.0);
									}}
								/>
								<EditorInspectorNumberField
									object={range}
									property="to"
									onChange={() => {
										this.props.editor.layout.preview.scene.stopAnimation(this.props.object.skeleton);
										this.props.editor.layout.preview.scene.beginAnimation(this.props.object.skeleton, range!.to, range!.to, true, 1.0);
									}}
								/>

								<Button
									variant="ghost"
									className="p-2"
									onClick={() => {
										try {
											navigator.clipboard.writeText(range!.name);
											toast.success("Animation range name copied to clipboard");
										} catch (e) {
											toast.error("Failed to copy animation range name");
										}
									}}
								>
									<FaCopy />
								</Button>

								<Button
									variant="secondary"
									className="p-2"
									onClick={() => {
										this.props.object.skeleton?.deleteAnimationRange(range!.name, false);
										this.forceUpdate();
									}}
								>
									<IoCloseOutline className="w-4 h-4" />
								</Button>
							</div>
						</div>
					))}

				<Button
					variant="secondary"
					className="flex items-center gap-[5px] w-full"
					onClick={async () => {
						const name = await showPrompt("Add Animation Range", "Enter the name of the new animation range");
						if (name) {
							this.props.object.skeleton?.createAnimationRange(name, 0, 100);
							this.forceUpdate();
						}
					}}
				>
					<IoAddSharp className="w-6 h-6" /> Add
				</Button>
			</EditorInspectorSectionField>
		);
	}

	private _getMorphTargetManagerComponent(): ReactNode {
		if (!this.props.object.morphTargetManager) {
			return null;
		}

		const targets: MorphTarget[] = [];
		for (let i = 0, len = this.props.object.morphTargetManager.numTargets; i < len; ++i) {
			targets.push(this.props.object.morphTargetManager.getTarget(i));
		}

		return (
			<EditorInspectorSectionField title="Morph Targets">
				{targets.map((target, index) => (
					<EditorInspectorNumberField key={index} object={target} property="influence" min={0} max={1} label={target.name} />
				))}
			</EditorInspectorSectionField>
		);
	}

	private _handleCastShadowsChanged(enabled: boolean): void {
		const lightsWithShadows = this.props.editor.layout.preview.scene.lights.filter((light) => {
			return light.getShadowGenerator()?.getShadowMap()?.renderList;
		});

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				lightsWithShadows.forEach((light) => {
					if (enabled) {
						const index = light.getShadowGenerator()?.getShadowMap()?.renderList?.indexOf(this.props.object);
						if (index !== undefined && index !== -1) {
							light.getShadowGenerator()?.getShadowMap()?.renderList?.splice(index, 1);
						}
					} else {
						light.getShadowGenerator()?.getShadowMap()?.renderList?.push(this.props.object);
					}

					updateLightShadowMapRefreshRate(light);
					updatePointLightShadowMapRenderListPredicate(light);
				});
			},
			redo: () => {
				lightsWithShadows.forEach((light) => {
					if (enabled) {
						light.getShadowGenerator()?.getShadowMap()?.renderList?.push(this.props.object);
					} else {
						const index = light.getShadowGenerator()?.getShadowMap()?.renderList?.indexOf(this.props.object);
						if (index !== undefined && index !== -1) {
							light.getShadowGenerator()?.getShadowMap()?.renderList?.splice(index, 1);
						}
					}

					updateLightShadowMapRefreshRate(light);
					updatePointLightShadowMapRenderListPredicate(light);
				});
			},
		});
	}
}
