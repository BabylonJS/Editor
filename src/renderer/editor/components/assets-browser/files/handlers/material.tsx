import { join } from "path";
import { readJSON } from "fs-extra";

import { Nullable } from "../../../../../../shared/types";

import * as React from "react";
import { Spinner } from "@blueprintjs/core";

import { PickingInfo, Mesh, Material } from "babylonjs";

import { Icon } from "../../../../gui/icon";

import { Workers } from "../../../../workers/workers";
import AssetsWorker from "../../../../workers/workers/assets";

import { AssetsBrowserItemHandler } from "../item-handler";

export class MaterialItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		this._computePreview();

		return (
			<div style={{ width: "100%", height: "100%", outlineColor: "#00FF00", outlineWidth: "1px", outlineStyle: "groove" }}>
				<Icon src="logo-babylon.svg" style={{ width: "100%", height: "100%", filter: "unset" }} />
				<div style={{ position: "absolute", top: "0", left: "0" }}>
					<Spinner size={24} />
				</div>
			</div>
		);
	}

	/**
	 * Called on the user double clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public async onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): Promise<void> {
		this.props.editor.addWindowedPlugin("material-viewer", undefined, {
			rootUrl: join(this.props.editor.assetsBrowser.assetsDirectory, "/"),
			json: await readJSON(this.props.absolutePath, { encoding: "utf-8" }),
			environmentTexture: this.props.editor.scene!.environmentTexture?.serialize(),
		});
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

		let material = this.props.editor.scene?.materials.find((m) => m.metadata?.editorPath === this.props.relativePath) ?? null;
		if (!material) {
			try {
				const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });
				material = Material.Parse(json, this.props.editor.scene!, join(this.props.editor.assetsBrowser.assetsDirectory, "/"));
			} catch (e) {
				this.props.editor.console.logError(`Failed to load material "${this.props.relativePath}":`);
				this.props.editor.console.logError(e?.message ?? "Unknown error.");
				return;
			}
		}

		pick.pickedMesh.material = material;
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
			return Material.Parse(json, this.props.editor.scene!, join(this.props.editor.assetsBrowser.assetsDirectory, "/"));
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
			this.props.absolutePath,
			join(this.props.editor.assetsBrowser.assetsDirectory, "/"),
		);

		const previewImage = (
			<img
				src={path}
				style={{
					width: "100%",
					height: "100%",
					outlineWidth: "1px",
					outlineStyle: "groove",
					outlineColor: "#00FF00",
				}}
			/>
		);

		this.setState({ previewImage });
	}
}
