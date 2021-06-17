import filenamify from "filenamify";
import { basename, dirname, extname, join } from "path";
import { pathExists, readJSON, writeJSON } from "fs-extra";

import { Nullable } from "../../../../../../shared/types";

import * as React from "react";
import { Spinner } from "@blueprintjs/core";

import {
	PickingInfo, SceneLoader, Mesh, MultiMaterial, Material, Texture,
	CubeTexture, TransformNode, Skeleton, Scene, IParticleSystem,
	AbstractMesh,
} from "babylonjs";

import { Tools } from "../../../../tools/tools";
import { GLTFTools } from "../../../../tools/gltf";

import { Icon } from "../../../../gui/icon";

import { Workers } from "../../../../workers/workers";
import AssetsWorker from "../../../../workers/workers/assets";

import { AssetsBrowserItemHandler } from "../item-handler";

export class MeshItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public async computePreview(): Promise<React.ReactNode> {
		this._computePreview();

		this.props.onSetTitleColor("#FFFF00");

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
	 * Called on the user double clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		this.props.editor.addWindowedPlugin("mesh-viewer", undefined, {
			rootUrl: join(dirname(this.props.absolutePath), "/"),
			name: basename(this.props.absolutePath),
		});
	}

	/**
	 * Called on the user starts dragging the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDragStart(ev: React.DragEvent<HTMLDivElement>): void {
		ev.dataTransfer.setData("text", this.props.absolutePath);
		ev.dataTransfer.setData("asset/mesh", JSON.stringify({
			absolutePath: this.props.absolutePath,
			relativePath: this.props.relativePath,
		}));
	}

	/**
	 * Computes the preview image of the object.
	 */
	private async _computePreview(): Promise<void> {
		const path = await Workers.ExecuteFunction<AssetsWorker, "createScenePreview">(
			AssetsBrowserItemHandler.AssetWorker,
			"createScenePreview",
			this.props.absolutePath,
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
	 * Called on the 
	 * @param ev defines the reference to the event object.
	 * @param pick defines the picking info generated while dropping in the preview.
	 */
	public async onDropInPreview(_: React.DragEvent<HTMLDivElement>, pick: PickingInfo): Promise<void> {
		require("babylonjs-loaders");

		const scene = this.props.editor.scene!;

		const extension = extname(this.props.absolutePath).toLowerCase();
		const isGltf = extension === ".glb" || extension === ".gltf";

		const result = await SceneLoader.ImportMeshAsync("", join(dirname(this.props.absolutePath), "/"), basename(this.props.absolutePath), scene);
		scene.stopAllAnimations();

		Promise.all([
			this._configureMeshes(result.meshes, pick, isGltf),
			this._configureTransformNodes(result.transformNodes, pick),
			this._configureSkeletons(result.skeletons, scene),
			this._configureParticleSystems(result.particleSystems),
		]).then(() => {
			this.props.editor.assets.refresh();
		});

		this.props.editor.graph.refresh();
	}

	/**
	 * Configures the given imported particle systems.
	 */
	private _configureParticleSystems(particleSystems: IParticleSystem[]): void {
		particleSystems.forEach((ps) => {
			ps.id = Tools.RandomId();
		});
	}

	/**
	 * Configures the given imported skeletons.
	 */
	private _configureSkeletons(skeletons: Skeleton[], scene: Scene): void {
		skeletons.forEach((s) => {
			// Skeleton Ids are not strings but numbers
			let id = 0;
			while (scene.getSkeletonById(id as any)) {
				id++;
			}

			s.id = id as any;
			s.bones.forEach((b) => {
				b.id = Tools.RandomId();

				b.metadata ??= {};
				b.metadata.originalId = b.id;
			});
		});
	}

	/**
	 * Configures the given imported transform nodes.
	 */
	private _configureTransformNodes(transformNodes: TransformNode[], pick: PickingInfo): void {
		transformNodes.forEach((tn) => {
			tn.id = Tools.RandomId();

			if (!tn.parent && pick?.pickedPoint) {
				tn.position.addInPlace(pick.pickedPoint);
			}
		});
	}

	/**
	 * Configures the given imported transform nodes.
	 */
	private async _configureMeshes(meshes: AbstractMesh[], pick: PickingInfo, isGltf: boolean): Promise<void> {
		for (const m of meshes) {
			m.metadata ??= {};
			m.metadata.basePoseMatrix = m.getPoseMatrix().asArray();

			if (!m.parent && pick?.pickedPoint) {
				m.position.addInPlace(pick.pickedPoint);
			}

			if (m.material) {
				this._configureMaterial(m.material, isGltf).then((material) => {
					m.material = material;
				});
			}

			if (m instanceof Mesh) {
				const meshMetadata = Tools.GetMeshMetadata(m);
				meshMetadata.originalSourceFile = {
					id: m.id,
					name: m.name,
					sceneFileName: this.props.relativePath,
				};

				if (m.geometry) {
					m.geometry.id = Tools.RandomId();
				}
			}

			m.id = Tools.RandomId();
		};
	}

	/**
	 * Configures the given imported material.
	 */
	private async _configureMaterial(material: Material, isGltf: boolean): Promise<Material> {
		if (!(material instanceof MultiMaterial)) {
			this._configureMaterialTextures(material, isGltf);

			const instantiatedMaterial = await this._createMaterialFile(material);
			if (instantiatedMaterial) {
				return instantiatedMaterial;
			}
		}

		const materialMetadata = Tools.GetMaterialMetadata(material);
		materialMetadata.originalSourceFile = materialMetadata.originalSourceFile ?? {
			id: material.id,
			name: material.name,
			sceneFileName: this.props.relativePath,
		};

		material.id = Tools.RandomId();

		if (material instanceof MultiMaterial) {
			for (let i = 0; i < material.subMaterials.length; i++) {
				const m = material.subMaterials[i];
				if (!m) {
					continue;
				}
				
				this._configureMaterialTextures(m, isGltf);

				const instantiatedMaterial = await this._createMaterialFile(m);
				if (instantiatedMaterial) {
					material.subMaterials[i] = instantiatedMaterial;
					continue;
				}

				const subMaterialMetadata = Tools.GetMaterialMetadata(m);
				subMaterialMetadata.originalSourceFile = subMaterialMetadata.originalSourceFile ?? {
					id: m.id,
					name: m.name,
					sceneFileName: this.props.relativePath,
				};

				m.id = Tools.RandomId();
			};
		}

		this.props.editor.assetsBrowser.refresh();

		return material;
	}

	/**
	 * Creates the given material file.
	 */
	private async _createMaterialFile(material: Material): Promise<Nullable<Material>> {
		const materialFilename = filenamify(`${material.name ?? basename(this.props.absolutePath)}-${material.id ?? Tools.RandomId()}.material`);
		const materialPath = join(dirname(this.props.absolutePath), materialFilename);

		material.metadata ??= {};
		material.metadata.editorPath = join(dirname(this.props.relativePath), materialFilename);

		const exists = await pathExists(materialPath);

		if (exists) {
			const json = await readJSON(materialPath, { encoding: "utf-8" });

			material.dispose(true, false);

			let instantiatedMaterial = this.props.editor.scene!.materials.find((m) => {
				return m.id === json.id;
			}) ?? null;

			if (instantiatedMaterial) {
				return instantiatedMaterial;
			}

			instantiatedMaterial = Material.Parse(
				json,
				this.props.editor.scene!,
				join(this.props.editor.assetsBrowser.assetsDirectory, "/"),
			);

			if (instantiatedMaterial && json.metadata) {
				try {
					instantiatedMaterial.metadata = Tools.CloneObject(json.metadata);
				} catch (e) { }
			}

			return instantiatedMaterial;
		}
		
		await writeJSON(materialPath, material.serialize(), {
			spaces: "\t",
			encoding: "utf-8",
		});

		return null;
	}

	/**
	 * In case of GLTF, texture, write all the files.
	 */
	private async _configureMaterialTextures(material: Material, isGltf: boolean): Promise<void> {
		const textures = material.getActiveTextures()
			.filter((t) => !t.isRenderTarget && (t instanceof Texture || t instanceof CubeTexture))
			.filter((t) => !t.metadata?.editorDone);

		if (isGltf) {
			textures.forEach((tex: Texture) => {
				tex.metadata ??= {};
				tex.metadata.editorDone = true;
	
				const mimeType = tex["_mimeType"];
				if (mimeType) {
					const existingExtension = extname(tex.name);
					const targetExtension = Tools.GetExtensionFromMimeType(mimeType);
					const relativePath = join(dirname(this.props.relativePath), basename(tex.name));
	
					if (existingExtension !== targetExtension) {
						tex.name = `${relativePath}${targetExtension}`;
					} else {
						tex.name = relativePath;
					}
				} else {
					tex.name = join(dirname(this.props.relativePath), basename(tex.url ?? tex.name));
				}
	
				if (tex.url) {
					tex.url = tex.name;
				}
			});
	
			await GLTFTools.TexturesToFiles(dirname(this.props.absolutePath), textures);
			await this.props.editor.assetsBrowser.refresh();
		} else {
			textures.forEach((tex: Texture) => {
				tex.name = join(dirname(this.props.relativePath), basename(tex.name));
				if (tex.url) {
					tex.url = tex.name;
				}
			});
		}
	}
}
