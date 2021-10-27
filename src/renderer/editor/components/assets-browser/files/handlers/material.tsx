import { join } from "path";
import { ipcRenderer } from "electron";
import { readJSON, writeJSON } from "fs-extra";

import { IPCResponses } from "../../../../../../shared/ipc";
import { Nullable, Undefinable } from "../../../../../../shared/types";

import * as React from "react";
import { Spinner, ContextMenu, Menu, MenuItem, MenuDivider, Icon as BPIcon } from "@blueprintjs/core";

import { PickingInfo, Mesh, Material, NodeMaterial } from "babylonjs";

import { Icon } from "../../../../gui/icon";
import { InspectorNotifier } from "../../../../gui/inspector/notifier";

import { Tools } from "../../../../tools/tools";
import { IPCTools } from "../../../../tools/ipc";

import { WorkSpace } from "../../../../project/workspace";

import { MaterialAssets } from "../../../../assets/materials";

import { Workers } from "../../../../workers/workers";
import AssetsWorker from "../../../../workers/workers/assets";

import { AssetsBrowserItemHandler } from "../item-handler";

export class MaterialItemHandler extends AssetsBrowserItemHandler {
	private static _NodeMaterialEditors: {
		id: number;
		absolutePath: string;
	}[] = [];

	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		this._computePreview();

		this.props.onSetTitleColor("#00FF00");

		return (
			<div style={{ width: "100%", height: "100%" }}>
				<Icon src="logo-babylon.svg" style={{ width: "100%", height: "100%", filter: "unset" }} />
				<div style={{ position: "absolute", top: "0", left: "0" }}>
					<Spinner size={24} />
				</div>
			</div>
		);
	}

	/**
	 * Called on the user clicks on the asset.
	 * @param ev defines the reference to the event object.
	 */
	public onClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		const existing = this.props.editor.scene!.materials.find((m) => m.metadata?.editorPath === this.props.relativePath);
		if (existing) {
			this.props.editor.inspector.setSelectedObject(existing);
		}
	}

	/**
	 * Called on the user double clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public async onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): Promise<void> {
		const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });
		if (json.customType === "BABYLON.NodeMaterial") {
			return this._handleOpenNodeMaterialEditor(json);
		}

		this.props.editor.addWindowedPlugin("material-viewer", undefined, {
			rootUrl: join(this.props.editor.assetsBrowser.assetsDirectory, "/"),
			json: await readJSON(this.props.absolutePath, { encoding: "utf-8" }),
			environmentTexture: this.props.editor.scene!.environmentTexture?.serialize(),
		});
	}

	/**
	 * Called on the user right clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		ContextMenu.show((
			<Menu>
				<MenuItem text="Refresh Preview" icon={<BPIcon icon="refresh" color="white" />} onClick={() => this._handleRefreshPreview()} />
				<MenuDivider />
				{this.getCommonContextMenuItems()}
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}

	/**
	 * Called on the user wants to refresh the preview of the material.
	 */
	private async _handleRefreshPreview(): Promise<void> {
		await Workers.ExecuteFunction<AssetsWorker, "deleteFromCache">(
			AssetsBrowserItemHandler.AssetWorker,
			"deleteFromCache",
			this.props.relativePath,
		);
		this._computePreview();
	}

	/**
	 * Called on the user starts dragging the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDragStart(ev: React.DragEvent<HTMLDivElement>): void {
		ev.dataTransfer.setData("asset/material", JSON.stringify({
			absolutePath: this.props.absolutePath,
			relativePath: this.props.relativePath,
		}));
		ev.dataTransfer.setData("plain/text", this.props.absolutePath);
	}

	/**
	 * Called on the 
	 * @param ev defines the reference to the event object.
	 * @param pick defines the picking info generated while dropping in the preview.
	 */
	public async onDropInPreview(_: React.DragEvent<HTMLDivElement>, pick: PickingInfo): Promise<void> {
		if (!pick.pickedMesh || !(pick.pickedMesh instanceof Mesh)) {
			return;
		}

		const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });

		let material = this.props.editor.scene?.materials.find((m) => m.id === json.id) ?? null;
		if (!material) {
			material = await this._readAndParseMaterialFile();
		}

		pick.pickedMesh.material = material;

		await this.props.editor.assets.refresh();
		InspectorNotifier.NotifyChange(pick.pickedMesh);
	}

	/**
	 * Called on the user drops the asset in a supported inspector field.
	 * @param ev defiens the reference to the event object.
	 * @param object defines the reference to the object being modified in the inspector.
	 * @param property defines the property of the object to assign the asset instance.
	 */
	public async onDropInInspector(_: React.DragEvent<HTMLElement>, object: any, property: string): Promise<void> {
		let material = this.props.editor.scene?.materials.find((m) => m.metadata?.editorPath === this.props.relativePath) ?? null;
		if (!material) {
			material = await this._readAndParseMaterialFile();
		}

		if (material) {
			object[property] = material;
		}

		await this.props.editor.assets.refresh();
	}

	/**
	 * Reads the parses the material file.
	 */
	private async _readAndParseMaterialFile(): Promise<Nullable<Material>> {
		try {
			const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });

			// Check linked to source
			if (json.metadata?.sourcePath) {
				const jsPath = Tools.GetSourcePath(WorkSpace.DirPath!, json.metadata.sourcePath);

				delete require.cache[jsPath];
				require(jsPath);
			} 
			
			const material = Material.Parse(json, this.props.editor.scene!, join(this.props.editor.assetsBrowser.assetsDirectory, "/"));
			if (material) {
				material.metadata = json.metadata;
			}

			return material;
		} catch (e) {
			this.props.editor.console.logError(`Failed to load material "${this.props.relativePath}":`);
			this.props.editor.console.logError(e?.message ?? "Unknown error.");
			return null;
		}
	}

	/**
	 * Computes the preview image of the object.
	 */
	private async _computePreview(): Promise<void> {
		const path = await Workers.ExecuteFunction<AssetsWorker, "createMaterialPreview">(
			AssetsBrowserItemHandler.AssetWorker,
			"createMaterialPreview",
			this.props.relativePath,
			this.props.absolutePath,
			join(this.props.editor.assetsBrowser.assetsDirectory, "/"),
		);

		const previewImage = (
			<img
				src={path}
				style={{
					width: "100%",
					height: "100%",
				}}
			/>
		);

		this.setState({ previewImage });
	}

	/**
	 * Called on the user wants to edit a node material.
	 */
	private async _handleOpenNodeMaterialEditor(json: any): Promise<void> {
		const existingMaterial = this.props.editor.scene!.materials.find((m) => {
			return m.id === json.id && m instanceof NodeMaterial;
		}) as Undefinable<NodeMaterial>;

		const index = MaterialItemHandler._NodeMaterialEditors.findIndex((m) => m.absolutePath === this.props.absolutePath);
		const existingId = index !== -1 ? MaterialItemHandler._NodeMaterialEditors[index].id : undefined;

		const popupId = await this.props.editor.addWindowedPlugin("node-material-editor", existingId, {
			json: json,
			editorData: (existingMaterial ?? json).editorData,
			lights: this.props.editor.scene!.lights.map((l) => l.serialize()),
		});

		if (!popupId) {
			return;
		}

		if (index === -1) {
			MaterialItemHandler._NodeMaterialEditors.push({
				id: popupId,
				absolutePath: this.props.absolutePath,
			});
		} else {
			MaterialItemHandler._NodeMaterialEditors[index].id = popupId;
		}

		let callback: (...args: any[]) => Promise<void>;
		ipcRenderer.on(IPCResponses.SendWindowMessage, callback = async (_, message) => {
			if (message.id !== "node-material-json" || message.data.json && message.data.json.id !== json.id) {
				return;
			}

			if (message.data.closed) {
				ipcRenderer.removeListener(IPCResponses.SendWindowMessage, callback);

				const windowIndex = MaterialItemHandler._NodeMaterialEditors.findIndex((m) => m.id === popupId);
				if (windowIndex !== -1) {
					MaterialItemHandler._NodeMaterialEditors.splice(windowIndex, 1);
				}
			}

			if (message.data.json) {
				try {
					// Clear textures
					if (existingMaterial) {
						existingMaterial.getTextureBlocks().forEach((block) => block.texture?.dispose());

						existingMaterial.editorData = message.data.editorData;
						existingMaterial.loadFromSerialization(message.data.json);
						existingMaterial.build();

						existingMaterial.metadata ??= {};
						existingMaterial.metadata.shouldExportTextures = true;

						this.props.editor.assets.refresh(MaterialAssets, existingMaterial);
					} else {
						await writeJSON(this.props.absolutePath, {
							...message.data.json,
							editorData: message.data.editorData,
						}, {
							spaces: "\t",
							encoding: "utf-8",
						});
					}

					IPCTools.SendWindowMessage(popupId, "node-material-json");
				} catch (e) {
					IPCTools.SendWindowMessage(popupId, "node-material-json", { error: true });
				}

			}
		});
	}
}
