import { platform } from "os";

import { Component, PropsWithChildren, ReactNode } from "react";

import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";

import { Mesh, SubMesh, Node, InstancedMesh } from "babylonjs";

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
import { SceneAssetBrowserDialogMode, showAssetBrowserDialog } from "../../../ui/scene-asset-browser";

import { getMeshCommands } from "../../dialogs/command-palette/mesh";
import { getLightCommands } from "../../dialogs/command-palette/light";

import { isSound } from "../../../tools/guards/sound";
import { cloneNode, ICloneNodeOptions } from "../../../tools/node/clone";
import { reloadSound } from "../../../tools/sound/tools";
import { registerUndoRedo } from "../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../tools/tools";
import { createMeshInstance } from "../../../tools/mesh/instance";
import { isScene, isSceneLinkNode } from "../../../tools/guards/scene";
import { isAbstractMesh, isMesh, isNode } from "../../../tools/guards/nodes";
import { isNodeLocked, isNodeSerializable, setNodeLocked, setNodeSerializable } from "../../../tools/node/metadata";

import { addGPUParticleSystem, addParticleSystem } from "../../../project/add/particles";

import { EditorInspectorSwitchField } from "../inspector/fields/switch";

import { Editor } from "../../main";

import { removeNodes } from "./remove";

export interface IEditorGraphContextMenuProps extends PropsWithChildren {
	editor: Editor;
	object: any | null;

	onOpenChange?(open: boolean): void;
}

export class EditorGraphContextMenu extends Component<IEditorGraphContextMenuProps> {
	public render(): ReactNode {
		const parent = this.props.object && isScene(this.props.object) ? undefined : this.props.object;

		return (
			<ContextMenu onOpenChange={(o) => this.props.onOpenChange?.(o)}>
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

							{!isScene(this.props.object) && !isSound(this.props.object) && (
								<>
									<ContextMenuItem onClick={() => this._cloneNode(this.props.object)}>Clone</ContextMenuItem>

									<ContextMenuSeparator />

									<ContextMenuItem onClick={() => this.props.editor.layout.graph.copySelectedNodes()}>
										Copy <ContextMenuShortcut>{platform() === "darwin" ? "⌘+C" : "CTRL+C"}</ContextMenuShortcut>
									</ContextMenuItem>

									{isNode(this.props.object) && (
										<ContextMenuItem onClick={() => this.props.editor.layout.graph.pasteSelectedNodes(this.props.object)}>
											Paste <ContextMenuShortcut>{platform() === "darwin" ? "⌘+V" : "CTRL+V"}</ContextMenuShortcut>
										</ContextMenuItem>
									)}

									<ContextMenuSeparator />
								</>
							)}

							{isSound(this.props.object) && <ContextMenuItem onClick={() => this._reloadSound()}>Reload</ContextMenuItem>}

							{(isNode(this.props.object) || isScene(this.props.object)) && !isSceneLinkNode(this.props.object) && (
								<ContextMenuSub>
									<ContextMenuSubTrigger className="flex items-center gap-2">
										<AiOutlinePlus className="w-5 h-5" /> Add
									</ContextMenuSubTrigger>
									<ContextMenuSubContent>
										{getMeshCommands(this.props.editor, parent).map((command) => (
											<ContextMenuItem key={command.key} onClick={command.action}>
												{command.text}
											</ContextMenuItem>
										))}
										<ContextMenuSeparator />
										{getLightCommands(this.props.editor, parent).map((command) => (
											<ContextMenuItem key={command.key} onClick={command.action}>
												{command.text}
											</ContextMenuItem>
										))}
										{isAbstractMesh(this.props.object) && (
											<>
												<ContextMenuSeparator />
												<ContextMenuItem onClick={() => addParticleSystem(this.props.editor, this.props.object)}>Particle System</ContextMenuItem>
												<ContextMenuItem onClick={() => addGPUParticleSystem(this.props.editor, this.props.object)}>GPU Particle System</ContextMenuItem>
											</>
										)}
									</ContextMenuSubContent>
								</ContextMenuSub>
							)}

							{!isScene(this.props.object) && !isSound(this.props.object) && (
								<>
									<ContextMenuSeparator />

									<ContextMenuCheckboxItem
										checked={isNodeLocked(this.props.object)}
										onClick={() => {
											const locked = !isNodeLocked(this.props.object);

											this.props.editor.layout.graph.getSelectedNodes().forEach((node) => {
												if (isNode(node.nodeData)) {
													setNodeLocked(node.nodeData, locked);
												}
											});
											this.props.editor.layout.graph.refresh();
										}}
									>
										Locked
									</ContextMenuCheckboxItem>

									<ContextMenuCheckboxItem
										checked={!isNodeSerializable(this.props.object)}
										onClick={() => {
											const serializable = !isNodeSerializable(this.props.object);

											this.props.editor.layout.graph.getSelectedNodes().forEach((node) => {
												if (isNode(node.nodeData)) {
													setNodeSerializable(node.nodeData, serializable);
												}
											});
											this.props.editor.layout.graph.refresh();
										}}
									>
										Do not serialize
									</ContextMenuCheckboxItem>
								</>
							)}

							{!isScene(this.props.object) && (
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
					Focus in Preview
					<ContextMenuShortcut>{platform() === "darwin" ? "⌘+F" : "CTRL+F"}</ContextMenuShortcut>
				</ContextMenuItem>

				{isMesh(this.props.object) && (
					<>
						<ContextMenuSeparator />

						<ContextMenuItem onClick={() => this._createMeshInstance(this.props.object)}>Create Instance</ContextMenuItem>

						<ContextMenuSeparator />
						<ContextMenuItem onClick={() => this._updateMeshGeometry(this.props.object)}>Update Geometry...</ContextMenuItem>
					</>
				)}
			</>
		);
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
					this.props.editor.layout.preview.gizmo.setAttachedNode(instance);
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
		let clone: Node | null = null;

		const cloneOptions: ICloneNodeOptions = {
			shareGeometry: true,
			shareSkeleton: true,
			cloneMaterial: true,
			cloneThinInstances: true,
		};

		const allNodes = isNode(node) ? [node, ...node.getDescendants(false)] : [node];
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
					this.props.editor.layout.preview.gizmo.setAttachedNode(clone);
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

	private async _updateMeshGeometry(mesh: Mesh): Promise<void> {
		const result = await showAssetBrowserDialog(this.props.editor, {
			multiSelect: false,
			filter: SceneAssetBrowserDialogMode.Meshes,
		});

		const selectedMesh = result.selectedMeshes[0];
		if (!selectedMesh?.geometry) {
			return;
		}

		const scene = this.props.editor.layout.preview.scene;

		scene.addGeometry(selectedMesh.geometry);
		if (selectedMesh.skeleton) {
			scene.addSkeleton(selectedMesh.skeleton);
		}

		const oldkeleton = mesh.skeleton;
		const oldGeometry = mesh.geometry;

		const oldSubMeshes = mesh.subMeshes.slice(0);
		const newSubMeshes = selectedMesh.subMeshes.slice(0);

		const newSkeleton = selectedMesh.skeleton;
		const newGeometry = selectedMesh.geometry;

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				newGeometry.releaseForMesh(mesh, false);
				oldGeometry?.applyToMesh(mesh);

				mesh.skeleton = oldkeleton;
				mesh.subMeshes = oldSubMeshes.map(
					(subMesh, index) => new SubMesh(index, subMesh.verticesStart, subMesh.verticesCount, subMesh.indexStart, subMesh.indexCount, mesh, mesh, true, false)
				);

				result.selectedAnimationGroups.forEach((animationGroup) => {
					scene.removeAnimationGroup(animationGroup);
				});
			},
			redo: () => {
				oldGeometry?.releaseForMesh(mesh, false);
				newGeometry.applyToMesh(mesh);

				mesh.skeleton = newSkeleton;
				mesh.subMeshes = newSubMeshes.map(
					(subMesh, index) => new SubMesh(index, subMesh.verticesStart, subMesh.verticesCount, subMesh.indexStart, subMesh.indexCount, mesh, mesh, true, false)
				);

				result.selectedAnimationGroups.forEach((animationGroup) => {
					scene.addAnimationGroup(animationGroup);
				});
			},
		});

		result.container.dispose();
	}

	private _reloadSound(): void {
		reloadSound(this.props.editor, this.props.object);

		if (this.props.editor.layout.inspector.state.editedObject === this.props.object) {
			this.props.editor.layout.inspector.setEditedObject(this.props.object);
		}
	}
}
