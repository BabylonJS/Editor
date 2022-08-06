import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, MenuDivider, Code, Classes, Pre } from "@blueprintjs/core";

import { IParticleSystem, Node, Sound, Mesh, MultiMaterial, AbstractMesh, Light, Camera, ParticleSystem, TransformNode } from "babylonjs";

import { Icon } from "../../gui/icon";
import { EditableText } from "../../gui/editable-text";

import { Tools } from "../../tools/tools";
import { undoRedo } from "../../tools/undo-redo";

import { SceneTools } from "../../scene/tools";

import { Prefab } from "../../prefab/prefab";

import { Editor } from "../../editor";

import { PreviewFocusMode } from "../preview";

export class GraphContextMenu {
	private static _CopiedTransform: Nullable<AbstractMesh | Light | Camera> = null;

	/**
	 * Shows the context menu of the graph according to the given right-clicked node.
	 * @param node defines the reference to the node that has been right-clicked.
	 */
	public static Show(ev: MouseEvent, editor: Editor, node: Node | IParticleSystem | Sound): void {
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
				{this._GetCopyPasterItem(editor, node)}
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
	private static _GetNameField(editor: Editor, node: Node | IParticleSystem | Sound): React.ReactNode {
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
							common: () => editor.graph.refresh(),
							redo: () => node!.name = v,
							undo: () => node!.name = oldName,
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
	private static _GetSubMeshesItems(editor: Editor, node: Node | IParticleSystem | Sound): React.ReactNode {
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
	 * Returns the items used to copy and paste transforms for the given node.
	 */
	private static _GetCopyPasterItem(editor: Editor, node: Node | IParticleSystem | Sound): React.ReactNode {
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
