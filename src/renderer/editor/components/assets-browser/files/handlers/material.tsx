import { ipcRenderer } from "electron";
import { dirname, extname, join } from "path";
import { readJSON, writeJSON } from "fs-extra";

import { IPCResponses } from "../../../../../../shared/ipc";
import { Nullable, Undefinable } from "../../../../../../shared/types";

import * as React from "react";
import { Spinner, ContextMenu, Menu, MenuItem, MenuDivider, Icon as BPIcon } from "@blueprintjs/core";

import { PickingInfo, Mesh, Material, NodeMaterial, AbstractMesh, PBRMetallicRoughnessMaterial, PBRMaterial } from "babylonjs";

import { Icon } from "../../../../gui/icon";
import { Dialog } from "../../../../gui/dialog";
import { InspectorNotifier } from "../../../../gui/inspector/notifier";

import { Tools } from "../../../../tools/tools";
import { IPCTools } from "../../../../tools/ipc";
import { undoRedo } from "../../../../tools/undo-redo";

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
		return this._handleOpenMaterialEditorOrViewer();
	}

	/**
	 * Called on the user right clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public async onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): Promise<void> {
		ev.persist();

		let json: any = null;
		let isNodeMaterial = false;
		let existingMaterial: Nullable<Material> = null;

		try {
			json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });
			isNodeMaterial = json.customType === "BABYLON.NodeMaterial";
			existingMaterial = this.props.editor.scene!.getMaterialById(json.id);
		} catch (e) {
			/* Catch silently */
		}

		const nodeMaterialEditItems = isNodeMaterial ? (
			<>
				<MenuItem text="Edit..." disabled={existingMaterial === null} icon={<Icon src="edit.svg" />} onClick={() => this._handleEditNodeMaterial(existingMaterial!)} />
				<MenuItem text="Edit In Node Material Editor..." icon={<Icon src="edit.svg" />} onClick={() => this._handleOpenNodeMaterialEditor(json)} />
				<MenuDivider />
			</>
		) : undefined;

		const addMaterial = existingMaterial ? undefined : (
			<>
				<MenuDivider />
				<MenuItem text="Add Material To Scene" icon={<BPIcon icon="plus" color="white" />} onClick={() => this._handleAddMaterialToScene()} />
			</>
		);

		const convertToPBRMaterial = json?.customType === "BABYLON.PBRMetallicRoughnessMaterial" ? (
			<MenuItem text="Convert to PBR Material" icon={<BPIcon icon="exchange" color="white" />} onClick={() => {
				this.props.editor.assetsBrowser._callSelectedItemsMethod("_convertMetallicRoughnessToPBR");
			}} />
		) : undefined;

		ContextMenu.show((
			<Menu>
				<MenuItem text="Refresh Preview" icon={<BPIcon icon="refresh" color="white" />} onClick={() => {
					this.props.editor.assetsBrowser._callSelectedItemsMethod("_handleRefreshPreview");
				}} />
				{addMaterial}
				{convertToPBRMaterial}
				<MenuDivider />
				<MenuItem text="Clone..." icon={<Icon src="clone.svg" />} onClick={() => this._handleCloneMaterialFile()} />
				<MenuDivider />
				{nodeMaterialEditItems}
				{this.getCommonContextMenuItems()}
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}

	/**
	 * Converts the given PBR Metallic Roughness material to full PBR Material.
	 * @internal
	 */
	public async _convertMetallicRoughnessToPBR(): Promise<void> {
		let json: any = null;
		let existingMaterial: Nullable<Material> = null;

		try {
			json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });
			existingMaterial = this.props.editor.scene!.getMaterialById(json.id);
		} catch (e) {
			return;
		}

		if (json.customType !== "BABYLON.PBRMetallicRoughnessMaterial") {
			return;
		}

		const mrMaterial = PBRMetallicRoughnessMaterial.Parse(json, this.props.editor.scene!, join(WorkSpace.DirPath!, "assets/"));
		const pbrMaterial = new PBRMaterial(mrMaterial.name, this.props.editor.scene!);

		pbrMaterial.id = mrMaterial.id;

		pbrMaterial.albedoTexture = mrMaterial.baseTexture;
		pbrMaterial.albedoColor.copyFrom(mrMaterial.baseColor);

		pbrMaterial.bumpTexture = mrMaterial.normalTexture;

		pbrMaterial.reflectionTexture = mrMaterial.environmentTexture;

		if (mrMaterial.occlusionTexture) {
			pbrMaterial.useAmbientOcclusionFromMetallicTextureRed = true;
			pbrMaterial.ambientTextureStrength = mrMaterial.occlusionStrength;
		}

		if (mrMaterial.metallicRoughnessTexture) {
			pbrMaterial.metallicTexture = mrMaterial.metallicRoughnessTexture;
			pbrMaterial.metallic = mrMaterial.metallic;
			pbrMaterial.roughness = mrMaterial.roughness;

			pbrMaterial.useMetallnessFromMetallicTextureBlue = true;
			pbrMaterial.useRoughnessFromMetallicTextureAlpha = false;
			pbrMaterial.useRoughnessFromMetallicTextureGreen = true;
		}

		pbrMaterial.emissiveTexture = mrMaterial.emissiveTexture;
		pbrMaterial.emissiveColor.copyFrom(mrMaterial.emissiveColor);

		pbrMaterial.lightmapTexture = mrMaterial.lightmapTexture;
		pbrMaterial.useLightmapAsShadowmap = mrMaterial.useLightmapAsShadowmap;

		pbrMaterial.metadata = mrMaterial.metadata;

		// Write
		await writeJSON(this.props.absolutePath, {
			...pbrMaterial.serialize(),
			metadata: Tools.CloneObject(pbrMaterial.metadata),
		}, {
			spaces: "\t",
			encoding: "utf-8",
		});

		// Dispose or assign
		if (existingMaterial) {
			// Check binded meshes
			existingMaterial.getBindedMeshes().forEach((m) => {
				m.material = pbrMaterial;
			});

			// Check multi-materials
			this.props.editor.scene!.multiMaterials.forEach((mm) => {
				const index = mm.subMaterials.indexOf(existingMaterial);
				if (index !== -1) {
					mm.subMaterials[index] = pbrMaterial;
				}
			});
		} else {
			pbrMaterial.dispose(true, false);
		}

		mrMaterial.dispose(true, false);
	}

	/**
	 * Called on the user wants to clone the material file.
	 */
	private async _handleCloneMaterialFile(): Promise<void> {
		let newName = await Dialog.Show("Cloned Material Name", "Please provide a new name for the cloned material file");

		const extension = extname(newName).toLowerCase();
		if (extension !== ".material") {
			newName += ".material";
		}

		const relativePath = join(dirname(this.props.relativePath), newName);
		const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });

		json.id = Tools.RandomId();
		json.name = newName.replace(".material", "");

		json.metadata ??= {};
		json.metadata.editorPath = relativePath;

		await writeJSON(join(this.props.editor.assetsBrowser.assetsDirectory, relativePath), json, { encoding: "utf-8" });

		this.props.editor.assetsBrowser.refresh();
	}

	/**
	 * Called on the user wants to refresh the preview of the material.
	 * @hidden
	 */
	public async _handleRefreshPreview(): Promise<void> {
		await Workers.ExecuteFunction<AssetsWorker, "deleteFromCache">(
			AssetsBrowserItemHandler.AssetWorker,
			"deleteFromCache",
			this.props.relativePath,
		);

		return this._computePreview();
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
	 * Called on the user drops the asset in the editor's preview canvas.
	 * @param ev defines the reference to the event object.
	 * @param pick defines the picking info generated while dropping in the preview.
	 */
	public async onDropInPreview(_: DragEvent, pick: PickingInfo): Promise<void> {
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
	 * Called on the user drops the asset in the editor's graph.
	 * @param ev defines the reference to the event object.
	 * @param objects defines the reference to the array of objects selected in the graph.
	 */
	public async onDropInGraph(_: React.DragEvent<HTMLElement>, objects: any[]): Promise<void> {
		const oldMaterials = objects.map((o) => o.material);

		undoRedo.push({
			common: () => {
				this.props.editor.assets.refresh();
			},
			undo: () => {
				objects.forEach((o, index) => {
					if (o instanceof AbstractMesh && !o.isAnInstance) {
						o.material = oldMaterials[index];
						if (o instanceof Mesh) {
							o.getLODLevels()?.forEach((lod) => lod.mesh && (lod.mesh.material = oldMaterials[index]));
						}
					}
				});
			},
			redo: async () => {
				let material = this.props.editor.scene?.materials.find((m) => m.metadata?.editorPath === this.props.relativePath) ?? null;
				if (!material) {
					material = await this._readAndParseMaterialFile();
				}

				objects.forEach((o) => {
					if (o instanceof AbstractMesh && !o.isAnInstance) {
						o.material = material;
						if (o instanceof Mesh) {
							o.getLODLevels()?.forEach((lod) => lod.mesh && (lod.mesh.material = material));
						}
					}
				});
			},
		});

		await this.props.editor.assets.refresh();
	}

	/**
	 * Adds the current material to the scene.
	 */
	private async _handleAddMaterialToScene(): Promise<void> {
		await this._readAndParseMaterialFile();
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
		const material = this.props.editor.scene!.materials.find((m) => m.metadata?.editorPath === this.props.relativePath);

		const path = await Workers.ExecuteFunction<AssetsWorker, "createMaterialPreview">(
			AssetsBrowserItemHandler.AssetWorker,
			"createMaterialPreview",
			this.props.relativePath,
			this.props.absolutePath,
			join(this.props.editor.assetsBrowser.assetsDirectory, "/"),
			material?.serialize(),
		);

		const previewImage = (
			<img
				ref={(r) => r && requestAnimationFrame(() => r.style.opacity = "1.0")}
				src={path}
				style={{
					width: "100%",
					height: "100%",
					opacity: "0",
					transition: "opacity 0.3s ease-in-out",
				}}
			/>
		);

		this.setState({ previewImage });
	}

	/**
	 * Edits the material in the node material editor.
	 */
	private async _handleOpenMaterialEditorOrViewer(): Promise<void> {
		const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });
		if (json.customType === "BABYLON.NodeMaterial") {
			return this._handleOpenNodeMaterialEditor(json);
		}

		this.props.editor.addWindowedPlugin("material-viewer", true, undefined, {
			rootUrl: join(this.props.editor.assetsBrowser.assetsDirectory, "/"),
			json: await readJSON(this.props.absolutePath, { encoding: "utf-8" }),
			environmentTexture: this.props.editor.scene!.environmentTexture?.serialize(),
		});
	}

	/**
	 * Called on the user wants to edit the given node material in the editor's context.
	 */
	private async _handleEditNodeMaterial(material: Material): Promise<void> {
		const plugin = this.props.editor.plugins["Node Material Editor"];
		if (plugin) {
			this.props.editor.closePlugin("node-material-editor");
		}

		await Tools.Wait(0);
		this.props.editor.addBuiltInPlugin("node-material-editor", material);
	}

	/**
	 * Called on the user wants to edit a node material in a separated window.
	 */
	private async _handleOpenNodeMaterialEditor(json: any): Promise<void> {
		const existingMaterial = this.props.editor.scene!.materials.find((m) => {
			return m.id === json.id && m instanceof NodeMaterial;
		}) as Undefinable<NodeMaterial>;

		const index = MaterialItemHandler._NodeMaterialEditors.findIndex((m) => m.absolutePath === this.props.absolutePath);
		const existingId = index !== -1 ? MaterialItemHandler._NodeMaterialEditors[index].id : undefined;

		const popupId = await this.props.editor.addWindowedPlugin("node-material-editor", true, existingId, {
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
					}

					await writeJSON(this.props.absolutePath, {
						...message.data.json,
						editorData: message.data.editorData,
						metadata: {
							...message.data.json?.metadata ?? {},
							...existingMaterial?.metadata ?? {},
						}
					}, {
						spaces: "\t",
						encoding: "utf-8",
					});

					this._handleRefreshPreview().then(() => {
						this.props.editor.assets.refresh(MaterialAssets, existingMaterial);
					});

					IPCTools.SendWindowMessage(popupId, "node-material-json");
				} catch (e) {
					IPCTools.SendWindowMessage(popupId, "node-material-json", { error: true });
				}

			}
		});
	}
}
