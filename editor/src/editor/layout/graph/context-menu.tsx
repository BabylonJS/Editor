import { platform } from "os";

import { Component, PropsWithChildren, ReactNode } from "react";

import { IoMdCube } from "react-icons/io";
import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";

import { Mesh, Node, InstancedMesh, Sprite, IParticleSystem } from "babylonjs";

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubTrigger,
	ContextMenuSubContent,
	ContextMenuShortcut,
	ContextMenuCheckboxItem,
} from "../../../ui/shadcn/ui/context-menu";

import { showConfirm } from "../../../ui/dialog";
import { Separator } from "../../../ui/shadcn/ui/separator";

import { getNodeCommands } from "../../dialogs/command-palette/node";
import { getMeshCommands } from "../../dialogs/command-palette/mesh";
import { getLightCommands } from "../../dialogs/command-palette/light";
import { getCameraCommands } from "../../dialogs/command-palette/camera";
import { getSpriteCommands } from "../../dialogs/command-palette/sprite";

import { isSound } from "../../../tools/guards/sound";
import { reloadSound } from "../../../tools/sound/tools";
import { registerUndoRedo } from "../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../tools/tools";
import { isClusteredLight } from "../../../tools/light/cluster";
import { createMeshInstance } from "../../../tools/mesh/instance";
import { onNodesAddedObservable } from "../../../tools/observables";
import { isAnyParticleSystem } from "../../../tools/guards/particles";
import { isScene, isSceneLinkNode } from "../../../tools/guards/scene";
import { cloneNode, ICloneNodeOptions } from "../../../tools/node/clone";
import { isSprite, isSpriteMapNode } from "../../../tools/guards/sprites";
import { isAbstractMesh, isCamera, isClusteredLightContainer, isLight, isMesh, isNode } from "../../../tools/guards/nodes";
import { isNodeLocked, isNodeSerializable, isNodeVisibleInGraph, setNodeLocked, setNodeSerializable } from "../../../tools/node/metadata";

import { addGPUParticleSystem, addParticleSystem } from "../../../project/add/particles";

import { EditorInspectorSwitchField } from "../inspector/fields/switch";

import { Editor } from "../../main";

import { removeNodes } from "./remove";
import { exportScene, exportNode } from "./export";
import { showUpdateResourcesFromAsset } from "./update-resources";

export interface IEditorGraphContextMenuProps extends PropsWithChildren {
	editor: Editor;
	object: any | null;

	onOpenChange?(open: boolean): void;
}

export interface IEditorGraphContextMenuState {
	selectedMeshes: Mesh[];
}

export class EditorGraphContextMenu extends Component<IEditorGraphContextMenuProps, IEditorGraphContextMenuState> {
	public constructor(props: IEditorGraphContextMenuProps) {
		super(props);

		this.state = {
			selectedMeshes: [],
		};
	}

	public render(): ReactNode {
		const parent = this.props.object && isScene(this.props.object) ? undefined : this.props.object;

		return (
			<ContextMenu onOpenChange={(o) => this._handleContextMenuOpenChange(o)}>
				<ContextMenuTrigger className="w-full h-full">{this.props.children}</ContextMenuTrigger>

				{this.props.object && (
					<ContextMenuContent className="w-48">
						<>
							{isNode(this.props.object) && (
								<>
									{this._getMeshItems()}
									<ContextMenuSeparator />
								</>
							)}

							{!isScene(this.props.object) && !isSound(this.props.object) && !isClusteredLightContainer(this.props.object) && (
								<>
									<ContextMenuItem onClick={() => this._cloneNode(this.props.object)}>Clone</ContextMenuItem>

									{!isSprite(this.props.object) && (
										<>
											<ContextMenuSeparator />

											<ContextMenuItem onClick={() => this.props.editor.layout.graph.copySelectedNodes()}>
												Copy <ContextMenuShortcut>{platform() === "darwin" ? "⌘+C" : "CTRL+C"}</ContextMenuShortcut>
											</ContextMenuItem>

											{isNode(this.props.object) && (
												<ContextMenuItem
													disabled={this.props.editor.layout.graph._objectsToCopy.length === 0}
													onClick={(ev) => this.props.editor.layout.graph.pasteSelectedNodes(this.props.object, ev.shiftKey)}
												>
													Paste <ContextMenuShortcut>{platform() === "darwin" ? "⌘+V" : "CTRL+V"}</ContextMenuShortcut>
												</ContextMenuItem>
											)}

											{isNode(this.props.object) && (
												<>
													<ContextMenuSeparator />
													<ContextMenuItem onClick={() => this.props.editor.layout.graph.copySelectedNodeTransform(this.props.object)}>
														Copy Transform
													</ContextMenuItem>
													<ContextMenuItem
														disabled={this.props.editor.layout.graph._nodeToCopyTransform === null}
														onClick={() => this.props.editor.layout.graph.pasteSelectedNodeTransform(this.props.object)}
													>
														Paste Transform
													</ContextMenuItem>
													<ContextMenuSeparator />
												</>
											)}
										</>
									)}

									{isNode(this.props.object) && !isScene(this.props.object) && this.props.editor.state.enableExperimentalFeatures && (
										<>
											<ContextMenuItem onClick={() => exportNode(this.props.editor, this.props.object)}>Export Node (.babylon)</ContextMenuItem>
											<ContextMenuSeparator />
											<ContextMenuItem onClick={() => showUpdateResourcesFromAsset(this.props.editor, this.props.object)}>
												Update Resources...
											</ContextMenuItem>
											<ContextMenuSeparator />
										</>
									)}
								</>
							)}

							{isSound(this.props.object) && <ContextMenuItem onClick={() => this._reloadSound()}>Reload</ContextMenuItem>}

							{isScene(this.props.object) && this.props.editor.state.enableExperimentalFeatures && (
								<>
									<ContextMenuItem onClick={() => exportScene(this.props.editor)}>Export Scene (.babylon)</ContextMenuItem>
									<ContextMenuSeparator />
								</>
							)}

							{(isNode(this.props.object) || isScene(this.props.object)) &&
								!isSceneLinkNode(this.props.object) &&
								!(isLight(this.props.object) && isClusteredLight(this.props.object, this.props.editor)) && (
									<ContextMenuSub>
										<ContextMenuSubTrigger className="flex items-center gap-2">
											<AiOutlinePlus className="w-5 h-5" /> Add
										</ContextMenuSubTrigger>
										<ContextMenuSubContent>
											{getLightCommands(this.props.editor, parent).map((command) => (
												<ContextMenuItem key={command.key} disabled={command.disabled} onClick={command.action}>
													{command.text}
												</ContextMenuItem>
											))}
											<ContextMenuSeparator />
											{getNodeCommands(this.props.editor, parent).map((command) => {
												return (
													<ContextMenuItem key={command.key} disabled={command.disabled} onClick={command.action}>
														{command.text}
													</ContextMenuItem>
												);
											})}
											<ContextMenuSeparator />
											<ContextMenuSub>
												<ContextMenuSubTrigger className="flex items-center gap-2">
													<IoMdCube className="w-5 h-5" /> Meshes
												</ContextMenuSubTrigger>
												<ContextMenuSubContent>
													{getMeshCommands(this.props.editor, parent).map((command) => (
														<ContextMenuItem key={command.key} disabled={command.disabled} onClick={command.action}>
															{command.text}
														</ContextMenuItem>
													))}
												</ContextMenuSubContent>
											</ContextMenuSub>
											<ContextMenuSeparator />
											{getCameraCommands(this.props.editor, parent).map((command) => (
												<ContextMenuItem key={command.key} disabled={command.disabled} onClick={command.action}>
													{command.text}
												</ContextMenuItem>
											))}
											{isAbstractMesh(this.props.object) && (
												<>
													<ContextMenuSeparator />
													<ContextMenuItem onClick={() => addParticleSystem(this.props.editor, this.props.object)}>Particle System</ContextMenuItem>
													<ContextMenuItem onClick={() => addGPUParticleSystem(this.props.editor, this.props.object)}>
														GPU Particle System
													</ContextMenuItem>
												</>
											)}
											<ContextMenuSeparator />
											{getSpriteCommands(this.props.editor, parent).map((command) => (
												<ContextMenuItem key={command.key} disabled={command.disabled} onClick={command.action}>
													{command.text}
												</ContextMenuItem>
											))}
										</ContextMenuSubContent>
									</ContextMenuSub>
								)}

							{!isScene(this.props.object) &&
								!isSound(this.props.object) &&
								!isSprite(this.props.object) &&
								!isAnyParticleSystem(this.props.object) &&
								!isClusteredLightContainer(this.props.object) && (
									<>
										<ContextMenuSeparator />
										<ContextMenuCheckboxItem checked={isNodeLocked(this.props.object)} onClick={() => this._handleSetNodeLocked()}>
											Locked
										</ContextMenuCheckboxItem>
										<ContextMenuCheckboxItem checked={!isNodeSerializable(this.props.object)} onClick={() => this._handleSetNodeSerializable()}>
											Do not serialize
										</ContextMenuCheckboxItem>
									</>
								)}

							{!isScene(this.props.object) && !isClusteredLightContainer(this.props.object) && (
								<>
									<ContextMenuSeparator />
									{this._getRemoveItems()}
								</>
							)}
						</>
					</ContextMenuContent>
				)}
			</ContextMenu>
		);
	}

	private _handleContextMenuOpenChange(open: boolean): void {
		if (open) {
			this.setState({
				selectedMeshes: this.props.editor.layout.graph
					.getSelectedNodes()
					.filter((node) => isMesh(node.nodeData) && node.nodeData.geometry)
					.map((node) => node.nodeData as Mesh),
			});
		}

		this.props.onOpenChange?.(open);
	}

	private _getRemoveItems(): ReactNode {
		return (
			<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => removeNodes(this.props.editor)}>
				<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
			</ContextMenuItem>
		);
	}

	private _getMeshItems(): ReactNode {
		return (
			<>
				<ContextMenuItem onClick={() => this.props.editor.layout.preview.focusObject(this.props.object)}>
					Focus
					<ContextMenuShortcut>{platform() === "darwin" ? "⌘+F" : "CTRL+F"}</ContextMenuShortcut>
				</ContextMenuItem>

				{isMesh(this.props.object) && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem onClick={() => this._createMeshInstance(this.props.object)}>Create Instance</ContextMenuItem>

						{isMesh(this.props.object) && this.state.selectedMeshes.length > 1 && (
							<ContextMenuItem onClick={() => this._handleMergeMeshes(this.state.selectedMeshes, this.props.object.parent)}>Merge meshes...</ContextMenuItem>
						)}
					</>
				)}
			</>
		);
	}

	private _handleMergeMeshes(meshes: Mesh[], parent: Node | null): void {
		const savedMeshesParents = meshes.map((mesh) => ({
			mesh,
			parent: mesh.parent,
			position: mesh.position.clone(),
			rotation: mesh.rotation.clone(),
			scaling: mesh.scaling.clone(),
			rotationQuaternion: mesh.rotationQuaternion?.clone() ?? null,
		}));

		meshes.forEach((mesh) => {
			mesh.parent = null;
			mesh.computeWorldMatrix(true);
		});

		try {
			const mergedMesh = Mesh.MergeMeshes(meshes, false, true, undefined, true, true);
			if (mergedMesh) {
				mergedMesh.parent = parent;
			}
		} catch (e) {
			console.error(e);
		}

		savedMeshesParents.forEach((item) => {
			item.mesh.parent = item.parent;
			item.mesh.position.copyFrom(item.position);
			item.mesh.rotation.copyFrom(item.rotation);
			item.mesh.scaling.copyFrom(item.scaling);
			item.mesh.rotationQuaternion = item.rotationQuaternion;
		});

		onNodesAddedObservable.notifyObservers();
	}

	private _handleSetNodeLocked(): void {
		const locked = !isNodeLocked(this.props.object);

		this.props.editor.layout.graph.getSelectedNodes().forEach((node) => {
			if (isNode(node.nodeData)) {
				setNodeLocked(node.nodeData, locked);

				if (isCamera(node.nodeData) && this.props.editor.layout.preview.scene.activeCamera === node.nodeData) {
					if (locked) {
						node.nodeData.detachControl();
					} else {
						node.nodeData.attachControl(true);
					}
				}
			}
		});
		this.props.editor.layout.graph.refresh();
	}

	private _handleSetNodeSerializable(): void {
		const serializable = !isNodeSerializable(this.props.object);

		this.props.editor.layout.graph.getSelectedNodes().forEach((node) => {
			if (isNode(node.nodeData)) {
				setNodeSerializable(node.nodeData, serializable);
			}
		});
		this.props.editor.layout.graph.refresh();
	}

	private _createMeshInstance(mesh: Mesh): void {
		let instance: InstancedMesh | null = null;

		registerUndoRedo({
			executeRedo: true,
			action: () => {
				this.props.editor.layout.graph.refresh();

				waitNextAnimationFrame().then(() => {
					if (instance) {
						this.props.editor.layout.graph.setSelectedNode(instance);
						this.props.editor.layout.animations.setEditedObject(instance);
					}

					this.props.editor.layout.inspector.setEditedObject(instance);
					this.props.editor.layout.preview.gizmo.setAttachedObject(instance);
				});
			},
			undo: () => {
				instance?.dispose(false, false);
				instance = null;
			},
			redo: () => {
				instance = createMeshInstance(this.props.editor, mesh);
			},
		});
	}

	private async _cloneNode(node: any): Promise<void> {
		if (isNode(node) && node.parent && isSpriteMapNode(node.parent) && node.parent.outputPlane === node) {
			node = node.parent;
		}

		let clone: Node | Sprite | IParticleSystem | null = null;

		const cloneOptions: ICloneNodeOptions = {
			shareGeometry: true,
			shareSkeleton: true,
			cloneMaterial: true,
			cloneThinInstances: true,
		};

		let allNodes = isNode(node) ? [node, ...node.getDescendants(false)] : [node];
		allNodes = allNodes.filter((n) => {
			if (!isNodeVisibleInGraph(n)) {
				return false;
			}

			if (isAbstractMesh(n) && n._masterMesh) {
				return false;
			}

			return true;
		});

		if (allNodes.find((node) => isMesh(node))) {
			const result = await showConfirm(
				"Clone options",
				<div className="flex flex-col gap-2">
					<Separator />

					<div className="text-muted font-semibold">Options for meshes</div>

					<div className="flex flex-col">
						<EditorInspectorSwitchField object={cloneOptions} property="shareGeometry" label="Share Geometry" />
						<EditorInspectorSwitchField object={cloneOptions} property="shareSkeleton" label="Share Skeleton" />
						<EditorInspectorSwitchField object={cloneOptions} property="cloneMaterial" label="Clone Material" />
						<EditorInspectorSwitchField object={cloneOptions} property="cloneThinInstances" label="Clone Thin Instances" />
					</div>
				</div>,
				{
					asChild: true,
					confirmText: "Clone",
				}
			);

			if (!result) {
				return;
			}
		}

		registerUndoRedo({
			executeRedo: true,
			action: () => {
				this.props.editor.layout.graph.refresh();

				waitNextAnimationFrame().then(() => {
					if (clone) {
						this.props.editor.layout.graph.setSelectedNode(clone);
						this.props.editor.layout.animations.setEditedObject(clone);
					}

					this.props.editor.layout.inspector.setEditedObject(clone);

					if (isNode(clone) || isSprite(clone)) {
						this.props.editor.layout.preview.gizmo.setAttachedObject(clone);
					}
				});
			},
			undo: () => {
				clone?.dispose(false, false);
				clone = null;
			},
			redo: () => {
				clone = cloneNode(this.props.editor, node, cloneOptions);
			},
		});
	}

	private _reloadSound(): void {
		reloadSound(this.props.editor, this.props.object);

		if (this.props.editor.layout.inspector.state.editedObject === this.props.object) {
			this.props.editor.layout.inspector.setEditedObject(this.props.object);
		}
	}
}
