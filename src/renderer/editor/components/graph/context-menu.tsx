import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, MenuDivider, Code, Classes, Pre } from "@blueprintjs/core";

import {
	IParticleSystem, Node, Sound, Mesh, MultiMaterial, AbstractMesh, Light, Camera, ParticleSystem, TransformNode,
	ReflectionProbe,
} from "babylonjs";

import { Icon } from "../../gui/icon";
import { EditableText } from "../../gui/editable-text";

import { Tools } from "../../tools/tools";
import { undoRedo } from "../../tools/undo-redo";

import { SceneTools } from "../../scene/tools";

import { Prefab } from "../../prefab/prefab";

import { Editor } from "../../editor";

import { PreviewFocusMode } from "../preview";

export class GraphContextMenu {
	private static _CopiedLightExcludedMeshes: Nullable<AbstractMesh[]> = null;
	private static _CopiedLightShadowsIncludedMeshes: Nullable<AbstractMesh[]> = null;

	private static _CopiedTransform: Nullable<AbstractMesh | Light | Camera> = null;

	/**
	 * Shows the context menu of the graph according to the given right-clicked node.
	 * @param node defines the reference to the node that has been right-clicked.
	 */
	public static Show(ev: MouseEvent, editor: Editor, node: Node | IParticleSystem | Sound | ReflectionProbe): void {
		const graph = editor.graph

		let mergeMeshesItem: React.ReactNode;
		let doNotExportItem: React.ReactNode;
		let lockedMeshesItem: React.ReactNode;

		if (graph.state.selectedNodeIds) {
			const all = graph.state.selectedNodeIds.map((id) => graph._getNodeById(id)) as Mesh[];
			const notAllMeshes = all.find((n) => !(n instanceof Mesh));
			const notAllAbstractMeshes = all.find((n) => !(n instanceof AbstractMesh));
			const notAllNodes = all.find((n) => !(n instanceof Node));

			if (!notAllMeshes && all.length > 1) {
				mergeMeshesItem = (
					<>
						<MenuDivider />
						<MenuItem text="Merge Meshes..." onClick={() => SceneTools.MergeMeshes(editor, all as Mesh[])} />
					</>
				);
			}

			if (!notAllNodes) {
				all.forEach((n) => {
					n.metadata = n.metadata ?? {};
					n.metadata.doNotExport = n.metadata.doNotExport ?? false;
				});

				doNotExportItem = (
					<>
						<MenuDivider />
						<MenuItem text="Do Not Export" icon={(node as Node).metadata.doNotExport ? <Icon src="check.svg" /> : undefined} onClick={() => {
							all.forEach((n) => {
								n.metadata.doNotExport = !n.metadata.doNotExport;
							});

							graph.refresh();
						}} />
					</>
				)
			}

			if (!notAllAbstractMeshes) {
				lockedMeshesItem = (
					<>
						<MenuDivider />
						<MenuItem text="Locked" icon={(node as Mesh).metadata?.isLocked ? <Icon src="check.svg" /> : undefined} onClick={() => {
							all.forEach((m) => {
								m.metadata = m.metadata ?? {};
								m.metadata.isLocked = m.metadata.isLocked ?? false;
								m.metadata.isLocked = !m.metadata.isLocked;
							});

							graph.refresh();
						}} />
					</>
				);
			}
		}

		if (node instanceof ReflectionProbe) {
			return ContextMenu.show(
				<Menu className={Classes.DARK}>
					{this._GetNameField(editor, node)}
					<MenuDivider />
					<MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => graph._handleRemoveObject()} />
				</Menu>,
				{ left: ev.clientX, top: ev.clientY }
			);
		}

		ContextMenu.show(
			<Menu className={Classes.DARK}>
				{this._GetNameField(editor, node)}
				<MenuDivider />
				<MenuItem text="Clone" disabled={node instanceof Sound || node instanceof ParticleSystem} icon={<Icon src="clone.svg" />} onClick={() => graph._handleCloneObject()} />
				<MenuDivider />
				<MenuItem text="Focus..." onClick={() => editor.preview.focusNode(node!, PreviewFocusMode.Target | PreviewFocusMode.Position)}>
					<MenuItem text="Back" onClick={() => editor.preview.focusNode(node!, PreviewFocusMode.Target | PreviewFocusMode.Back)} />
					<MenuItem text="Front" onClick={() => editor.preview.focusNode(node!, PreviewFocusMode.Target | PreviewFocusMode.Front)} />
					<MenuItem text="Top" onClick={() => editor.preview.focusNode(node!, PreviewFocusMode.Target | PreviewFocusMode.Top)} />
					<MenuItem text="Bottom" onClick={() => editor.preview.focusNode(node!, PreviewFocusMode.Target | PreviewFocusMode.Bottom)} />
					<MenuItem text="Left" onClick={() => editor.preview.focusNode(node!, PreviewFocusMode.Target | PreviewFocusMode.Left)} />
					<MenuItem text="Right" onClick={() => editor.preview.focusNode(node!, PreviewFocusMode.Target | PreviewFocusMode.Right)} />
				</MenuItem>
				<MenuDivider />
				{this._GetCopyPasterNodeItem(editor, node)}
				{this._GetLightItem(editor, node)}
				<MenuItem text="Prefab">
					<MenuItem text="Create Prefab..." disabled={!(node instanceof Mesh)} icon={<Icon src="plus.svg" />} onClick={() => Prefab.CreateMeshPrefab(editor, node as Mesh, false)} />
					<MenuItem text="Create Prefab As..." disabled={!(node instanceof Mesh)} icon={<Icon src="plus.svg" />} onClick={() => Prefab.CreateMeshPrefab(editor, node as Mesh, true)} />
				</MenuItem>
				<MenuItem text="Export">
					<MenuItem text="Export as Babylon..." disabled={!(node instanceof Mesh)} onClick={() => SceneTools.ExportMeshToBabylonJSFormat(editor, node as Mesh)} />
				</MenuItem>
				{mergeMeshesItem}
				{doNotExportItem}
				{lockedMeshesItem}
				<MenuDivider />
				<MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => graph._handleRemoveObject()} />
				{this._GetSubMeshesItems(editor, node)}
			</Menu>,
			{ left: ev.clientX, top: ev.clientY }
		);
	}

	/**
	 * Returns the field used to edit the given node's name.
	 */
	private static _GetNameField(editor: Editor, node: Node | IParticleSystem | Sound | ReflectionProbe): React.ReactNode {
		return (
			<Pre>
				<p style={{ color: "white", marginBottom: "0px" }}>Name</p>
				<EditableText
					multiline
					value={node.name ?? Tools.GetConstructorName(node)}
					intent="primary"
					selectAllOnFocus
					confirmOnEnterKey
					className={Classes.FILL}
					disabled={node instanceof Sound}
					onConfirm={(v) => {
						const oldName = node!.name;
						undoRedo.push({
							description: `Changed name of node "${node?.name ?? "undefined"}" from "${oldName}" to "${v}"`,
							common: () => {
								editor.graph.refresh();

								if (node instanceof ReflectionProbe) {
									editor.assets.refresh();
								}
							},
							redo: () => {
								node!.name = v;
								if (node instanceof ReflectionProbe) {
									node.cubeTexture.name = v;
								}
							},
							undo: () => {
								node!.name = oldName;
								if (node instanceof ReflectionProbe) {
									node.cubeTexture.name = oldName;
								}
							},
						});
					}}
				/>
			</Pre>
		);
	}

	/**
	 * Retruns the list of all sub meshes items avaiable for the given node.
	 * Checks wether or not the given node is a mesh else returns undefined.
	 */
	private static _GetSubMeshesItems(editor: Editor, node: Node | IParticleSystem | Sound | ReflectionProbe): React.ReactNode {
		const subMeshesItems: React.ReactNode[] = [];
		if (node instanceof Mesh && node.subMeshes?.length && node.subMeshes.length > 1) {
			const multiMaterial = node.material && node.material instanceof MultiMaterial ? node.material : null;

			subMeshesItems.push(<MenuDivider />);
			subMeshesItems.push(<Code>Sub-Meshes:</Code>);

			node.subMeshes.forEach((sm, index) => {
				const material = multiMaterial && sm.getMaterial();
				const text = material ? (material.name ?? Tools.GetConstructorName(material)) : `Sub Mesh "${index}`;
				const key = `${(node as Mesh)!.id}-${index}`;
				const extraMenu = <MenuItem key={key} text={text} icon={<Icon src="vector-square.svg" />} onClick={() => editor.selectedSubMeshObservable.notifyObservers(sm)} />;
				subMeshesItems.push(extraMenu);
			});
		}

		return subMeshesItems.length ? (
			<div style={{ maxHeight: "300px", overflow: "auto" }}>
				{subMeshesItems}
			</div>
		) : undefined;
	}

	/**
	 * Returns the item for lights used to copy/paste excluded meshes list etc.
	 */
	private static _GetLightItem(editor: Editor, node: Node | IParticleSystem | Sound | ReflectionProbe): React.ReactNode {
		if (!(node instanceof Light)) {
			return undefined;
		}

		const shadowMapRenderList = node.getShadowGenerator()?.getShadowMap()?.renderList;
		const shadowsItems = shadowMapRenderList ? (
			<>
				<MenuDivider title="Shadows" />
				<MenuItem text="Copy Included Meshes" onClick={() => this._CopiedLightShadowsIncludedMeshes = shadowMapRenderList} />
				<MenuItem text="Paste Included Meshes" disabled={(this._CopiedLightShadowsIncludedMeshes ?? null) === null} onClick={() => {
					this._CopiedLightShadowsIncludedMeshes?.forEach((m) => {
						if (shadowMapRenderList.indexOf(m) === -1) {
							shadowMapRenderList.push(m);
						}
					});
					editor.inspector.forceUpdate();
				}} />
			</>
		) : undefined;

		return (
			<MenuItem text="Light">
				<MenuItem text="Copy Excluded Meshes" onClick={() => this._CopiedLightExcludedMeshes = node.excludedMeshes} />
				<MenuDivider />
				<MenuItem text="Paste Excluded Meshes" disabled={(this._CopiedLightExcludedMeshes ?? null) === null} onClick={() => {
					this._CopiedLightExcludedMeshes?.forEach((m) => {
						if (node.excludedMeshes.indexOf(m) === -1) {
							node.excludedMeshes.push(m);
						}
					});
					editor.inspector.forceUpdate();
				}} />
				<MenuItem text="Paste Included Meshes" disabled={(this._CopiedLightExcludedMeshes ?? null) === null} onClick={() => {
					const meshes = editor.scene!.meshes.filter((m) => this._CopiedLightExcludedMeshes!.indexOf(m) === -1);
					meshes.forEach((m) => {
						if (node.excludedMeshes.indexOf(m) === -1) {
							node.excludedMeshes.push(m);
						}
					});
					editor.inspector.forceUpdate();
				}} />
				{shadowsItems}
			</MenuItem>
		);
	}

	/**
	 * Returns the items used to copy and paste transforms for the given node.
	 */
	private static _GetCopyPasterNodeItem(editor: Editor, node: Node | IParticleSystem | Sound | ReflectionProbe): React.ReactNode {
		if (!(node instanceof TransformNode) && !(node instanceof Light) && !(node instanceof Camera)) {
			return undefined;
		}

		const copyTransform = (property: string) => {
			if (this._CopiedTransform?.[property]) {
				const base = node![property]?.clone();
				const target = this._CopiedTransform[property].clone();

				undoRedo.push({
					description: `Changed transform information of object "${node?.["name"] ?? "undefiend"}" from "${base.toString()}" to "${target.toString()}"`,
					common: () => editor.inspector.refresh(),
					undo: () => node![property] = base,
					redo: () => node![property] = target,
				});
			}

			editor.inspector.refresh();
		};

		return (
			<>
				<MenuItem text="Copy Transform" icon="duplicate" onClick={() => this._CopiedTransform = node as any} />
				<MenuItem text="Paste Transform" icon="clipboard" label={`(${this._CopiedTransform?.name ?? "None"})`} disabled={this._CopiedTransform === null}>
					<MenuItem text="All" onClick={() => {
						copyTransform("position");
						copyTransform("rotationQuaternion");
						copyTransform("rotation");
						copyTransform("scaling");
						copyTransform("direction");
					}} />
					<MenuDivider />
					<MenuItem text="Position" disabled={(this._CopiedTransform?.["position"] ?? null) === null} onClick={() => {
						copyTransform("position");
					}} />
					<MenuItem text="Rotation" disabled={((this._CopiedTransform?.["rotationQuaternion"] ?? null) || (this._CopiedTransform?.["rotation"] ?? null)) === null} onClick={() => {
						copyTransform("rotationQuaternion");
						copyTransform("rotation");
					}} />
					<MenuItem text="Scaling" disabled={(this._CopiedTransform?.["scaling"] ?? null) === null} onClick={() => {
						copyTransform("scaling");
					}} />
					<MenuDivider />
					<MenuItem text="Direction" disabled={(this._CopiedTransform?.["direction"] ?? null) === null} onClick={() => {
						copyTransform("direction");
					}} />
				</MenuItem>
				<MenuDivider />
			</>
		);
	}
}
