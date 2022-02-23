import filenamify from "filenamify";
import { basename, dirname, extname, join } from "path";
import { pathExists, readJSON, writeJSON } from "fs-extra";

import { Nullable } from "../../../../../../shared/types";

import * as React from "react";
import { Spinner, ContextMenu, Menu, MenuItem, MenuDivider, Icon as BPIcon } from "@blueprintjs/core";

import {
	PickingInfo, SceneLoader, Mesh, MultiMaterial, Material, Texture,
	CubeTexture, TransformNode, Skeleton, Scene, IParticleSystem,
	AbstractMesh, SubMesh,
} from "babylonjs";

import { Tools } from "../../../../tools/tools";
import { GLTFTools } from "../../../../tools/gltf";

import { Icon } from "../../../../gui/icon";
import { Confirm } from "../../../../gui/confirm";
import { Overlay } from "../../../../gui/overlay";

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
	 * Called on the user right clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		ContextMenu.show((
			<Menu>
				<MenuItem text="Refresh Preview" icon={<BPIcon icon="refresh" color="white" />} onClick={() => {
					this.props.editor.assetsBrowser._callSelectedItemsMethod("_handleRefreshPreview");
				}} />
				<MenuDivider />
				<MenuItem text="Update Instantiated References">
					<MenuItem text="Force Update" onClick={() => this._handleUpdateInstantiatedReferences(true)} />
					<MenuItem text="Update Per Object" onClick={() => this._handleUpdateInstantiatedReferences(false)} />
				</MenuItem>
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
	 * Computes the preview image of the object.
	 */
	private async _computePreview(): Promise<void> {
		const path = await Workers.ExecuteFunction<AssetsWorker, "createScenePreview">(
			AssetsBrowserItemHandler.AssetWorker,
			"createScenePreview",
			this.props.relativePath,
			this.props.absolutePath,
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
	 * Prepares handler before the scene is loaded.
	 */
	private _prepareLoad(): void {
		require("babylonjs-loaders");
	}

	/**
	 * Called on the 
	 * @param ev defines the reference to the event object.
	 * @param pick defines the picking info generated while dropping in the preview.
	 */
	public async onDropInPreview(_: React.DragEvent<HTMLDivElement>, pick: PickingInfo): Promise<void> {
		this._prepareLoad();

		const scene = this.props.editor.scene!;

		const extension = extname(this.props.absolutePath).toLowerCase();
		const isGltf = extension === ".glb" || extension === ".gltf";

		const result = await SceneLoader.ImportMeshAsync("", join(dirname(this.props.absolutePath), "/"), basename(this.props.absolutePath), scene);
		scene.stopAllAnimations();

		const parentNode = new TransformNode(basename(this.props.relativePath));
		parentNode.id = Tools.RandomId();

		Promise.all([
			this._configureMeshes(result.meshes, parentNode, isGltf),
			this._configureTransformNodes(result.transformNodes, parentNode),
			this._configureSkeletons(result.skeletons, scene),
			this._configureParticleSystems(result.particleSystems),
		]).then(() => {
			if (pick?.pickedPoint) {
				const children = parentNode.getChildren();
				if (children.length <= 1) {
					const child = children[0];
					child.parent = null;

					parentNode.dispose(true, false);

					const position = child["position"];
					position?.copyFrom?.(pick?.pickedPoint);

					this.props.editor.graph.refresh();
				} else {
					parentNode.position.copyFrom(pick.pickedPoint);
				}
			}

			this.props.editor.assets.refresh();
			this.props.editor.assetsBrowser.refresh();
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
	private _configureTransformNodes(transformNodes: TransformNode[], parent: TransformNode): void {
		transformNodes.forEach((tn) => {
			tn.id = Tools.RandomId();

			if (!tn.parent) {
				tn.parent = parent;
			}
		});
	}

	/**
	 * Configures the given imported transform nodes.
	 */
	private async _configureMeshes(meshes: AbstractMesh[], parent: TransformNode, isGltf: boolean): Promise<void> {
		for (const m of meshes) {
			m.metadata ??= {};
			m.metadata.basePoseMatrix = m.getPoseMatrix().asArray();

			if (!m.parent) {
				m.parent = parent;
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
	private async _configureMaterial(material: Material, isGltf: boolean, force: boolean = false): Promise<Material> {
		if (!(material instanceof MultiMaterial)) {
			if (isGltf) {
				Overlay.Show("Configuring GLTF...");
			}

			const instantiatedMaterial = await this._getEffectiveMaterial(material, force);
			if (instantiatedMaterial) {
				Overlay.Hide();
				return instantiatedMaterial;
			}

			this._configureMaterialTextures(material, isGltf).then(() => {
				Overlay.Hide();

				const materialMetadata = Tools.GetMaterialMetadata(material);
				materialMetadata.originalSourceFile = materialMetadata.originalSourceFile ?? {
					id: material.id,
					name: material.name,
					sceneFileName: this.props.relativePath,
				};

				material.id = Tools.RandomId();

				this._writeMaterialFile(material);
			});
		}

		if (material instanceof MultiMaterial) {
			for (let i = 0; i < material.subMaterials.length; i++) {
				const m = material.subMaterials[i];
				if (!m) {
					continue;
				}

				const instantiatedMaterial = await this._getEffectiveMaterial(m, force);
				if (instantiatedMaterial) {
					material.subMaterials[i] = instantiatedMaterial;
					continue;
				}

				this._configureMaterialTextures(m, isGltf).then(() => {
					const subMaterialMetadata = Tools.GetMaterialMetadata(m);
					subMaterialMetadata.originalSourceFile = subMaterialMetadata.originalSourceFile ?? {
						id: m.id,
						name: m.name,
						sceneFileName: this.props.relativePath,
					};

					m.id = Tools.RandomId();

					this._writeMaterialFile(m);
				});
			};
		}

		this.props.editor.assetsBrowser.refresh();

		return material;
	}

	/**
	 * Writes the given material.
	 */
	private async _writeMaterialFile(material: Material): Promise<void> {
		this.props.editor.console.logInfo(`Saved material configuration: ${material.metadata.editorPath}`);

		const serializationObject = material.serialize();
		try {
			serializationObject.metadata = Tools.CloneObject(material.metadata);
		} catch (e) {
			// Catch silently.
		}

		writeJSON(join(dirname(this.props.absolutePath), basename(material.metadata.editorPath)), serializationObject, {
			spaces: "\t",
			encoding: "utf-8",
		});
	}

	/**
	 * Creates the given material file.
	 */
	private async _getEffectiveMaterial(material: Material, force: boolean = false): Promise<Nullable<Material>> {
		const materialFilename = filenamify(`${material.name ?? basename(this.props.absolutePath)}-${material.id ?? Tools.RandomId()}.material`);
		const materialPath = join(dirname(this.props.absolutePath), materialFilename);

		material.metadata ??= {};
		material.metadata.editorPath = join(dirname(this.props.relativePath), materialFilename);

		const exists = force ? false : await pathExists(materialPath);

		if (exists) {
			const json = await readJSON(materialPath, { encoding: "utf-8" });

			material.dispose(true, true);

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

	/**
	 * Called on the user wants to update the already instantiated meshes. Allows to update per mesh
	 * which to update and chosse geometry, material, etc.
	 */
	private async _handleUpdateInstantiatedReferences(force: boolean): Promise<void> {
		if (force && !await Confirm.Show("Force Update?", "Are you sure to force update instantiated references?")) {
			return;
		}

		this._prepareLoad();

		const scene = this.props.editor.scene!;

		const extension = extname(this.props.absolutePath).toLowerCase();
		const isGltf = extension === ".glb" || extension === ".gltf";

		const container = await SceneLoader.LoadAssetContainerAsync(join(dirname(this.props.absolutePath), "/"), basename(this.props.absolutePath), scene);
		const instantiatedMeshes = scene.meshes.filter((m) => m.metadata?.originalSourceFile?.sceneFileName === this.props.relativePath);

		container.meshes.forEach((m) => {
			if (!m.id || !(m instanceof Mesh)) { return; }

			// Find all meshes instantiated with this original id
			const linkedMeshes = instantiatedMeshes.filter((im) => im.metadata?.originalSourceFile?.id === m.id);
			linkedMeshes.forEach((im) => {
				if (!(im instanceof Mesh)) {
					return;
				}

				const metadata = Tools.GetMeshMetadata(im);
				metadata._waitingUpdatedReferences = {};

				metadata._waitingUpdatedReferences.geometry = {
					geometry: m.geometry,
					skeleton: m.skeleton,
					subMeshes: m.subMeshes?.slice() ?? [],
					handler: (m, s) => this._updateInstantiatedGeometryReferences(m, s),
				};

				if (force) {
					this._updateInstantiatedGeometryReferences(im, false);
				}

				const material = m.material;
				if (material) {
					metadata._waitingUpdatedReferences.material = {
						isGltf,
						material,
						handler: (m) => this._updateInstantiatedMaterialReferences(m),
					};
				}

				if (force) {
					this._updateInstantiatedMaterialReferences(im);
				}
			});
		});

		this.props.editor.graph.refresh();
	}

	/**
	 * Called on the user wants to update the material of the mesh from source file.
	 */
	private _updateInstantiatedMaterialReferences(mesh: Mesh): void {
		const metadata = Tools.GetMeshMetadata(mesh);

		if (metadata._waitingUpdatedReferences?.material) {
			mesh.material = metadata._waitingUpdatedReferences.material?.material ?? null;

			if (mesh.material) {
				this.props.editor.scene!.addMaterial(mesh.material);
				this._configureMaterial(mesh.material, metadata._waitingUpdatedReferences.material.isGltf, true);
			}
		}

		delete metadata._waitingUpdatedReferences?.material;

		this.props.editor.graph.refresh();
	}

	/**
	 * Called on the user wants to update the geometry of the mesh from source file.
	 */
	private _updateInstantiatedGeometryReferences(mesh: Mesh, withSkeleton: boolean): void {
		const metadata = Tools.GetMeshMetadata(mesh);

		metadata._waitingUpdatedReferences?.geometry?.geometry?.applyToMesh(mesh);

		if (withSkeleton) {
			mesh.skeleton = metadata._waitingUpdatedReferences?.geometry?.skeleton ?? null;
		}

		if (metadata._waitingUpdatedReferences?.geometry?.subMeshes) {
			mesh.subMeshes = [];
			metadata._waitingUpdatedReferences.geometry.subMeshes.forEach((sm) => {
				new SubMesh(sm.materialIndex, sm.verticesStart, sm.verticesCount, sm.indexStart, sm.indexCount, mesh, mesh, true, true);
			});
		}

		delete metadata._waitingUpdatedReferences?.geometry;

		this.props.editor.graph.refresh();
	}
}
