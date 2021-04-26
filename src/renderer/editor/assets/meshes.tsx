import { shell } from "electron";
import { join, extname, basename } from "path";
import { copy, readdir, remove } from "fs-extra";
import * as os from "os";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, Classes, ButtonGroup, Button, Divider, MenuDivider, Tag, Intent } from "@blueprintjs/core";

import {
    SceneLoader, PickingInfo, Material, MultiMaterial, CubeTexture, Texture, Mesh, AbstractMesh, SubMesh,
} from "babylonjs";
import "babylonjs-loaders";

import { assetsHelper } from "../tools/offscreen-assets-helper/offscreen-asset-helper";
import { Tools } from "../tools/tools";
import { GLTFTools } from "../tools/gltf";
import { undoRedo } from "../tools/undo-redo";

import { Overlay } from "../gui/overlay";
import { Icon } from "../gui/icon";

import { IFile, FilesStore } from "../project/files";
import { Project } from "../project/project";

import { SceneTools } from "../scene/tools";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";

export class MeshesAssets extends AbstractAssets {
    /**
     * Defines the size of assets to be drawn in the panel. Default is 100x100 pixels.
     * @override
     */
    protected size: number = 75;

    /**
     * Defines the list of all supported extensions.
     */
    public extensions: string[] = [".babylon", ".glb", ".gltf", ".obj"];

    /**
     * Defines the list of all avaiable meshes in the assets component.
     */
    public static Meshes: IFile[] = [];

    /**
     * Registers the component.
     */
    public static Register(): void {
        Assets.addAssetComponent({
            title: "Meshes",
            identifier: "meshes",
            ctor: MeshesAssets,
        });
    }

    /**
     * Renders the component.
     * @override
     */
    public render(): React.ReactNode {
        return (
            <>
                <div className={Classes.FILL} key="meshes-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        <Button key="add-meshes" icon={<Icon src="plus.svg" />} small={true} text="Add..." onClick={() => this._addMeshes()} />
                        <Divider />
                    </ButtonGroup>
                </div>
                {super.render()}
            </>
        );
    }

    /**
     * Refreshes the component.
     * @param object defines the optional reference to the object to refresh.
     * @override
     */
    public async refresh(object?: string): Promise<void> {
        await assetsHelper.init();

        for (const m of MeshesAssets.Meshes) {
            if (!object && this.items.find((i) => i.key === m.path)) { continue; }
            if (object && m.path !== object) { continue; }

            const rootUrl = join(Project.DirPath!, "files", "/");
            const name = join("..", "assets/meshes", m.name);

            const importSuccess = await assetsHelper.importMesh(rootUrl, name);

            const base64 = (importSuccess ? await assetsHelper.getScreenshot() : "../css/svg/times.svg");
            const style = (importSuccess ? { } : { background: "darkred" });
            
            const item = this.items.find((i) => i.key === m.path);

            if (item) {
                item.style = style;
                item.base64 = base64;
            } else {
                this.items.push({ id: m.name, key: m.path, base64, style });
            }

            this.updateAssetThumbnail(m.path, base64);

            await assetsHelper.reset();
            this.updateAssetObservable.notifyObservers();
        }
        
        return super.refresh();
    }

    /**
     * Called once a project has been loaded, this function is used to clean up
     * unused assets files automatically.
     */
    public async clean(): Promise<void> {
        if (!Project.DirPath) { return; }

        const existingFiles = await readdir(join(Project.DirPath, "assets/meshes"));
        for (const file of existingFiles) {
            const exists = MeshesAssets.Meshes.find((m) => m.name === file);
            if (!exists) {
                await remove(join(Project.DirPath, "assets/meshes", file));
            }
        }
    }

    /**
     * Called on the user double clicks an item.
     * @param item the item being double clicked.
     * @param img the double-clicked image element.
     */
    public async onDoubleClick(item: IAssetComponentItem, img: HTMLImageElement): Promise<void> {
        super.onDoubleClick(item, img);

        await this.editor.addWindowedPlugin("mesh-viewer", undefined, {
            rootUrl: join(Project.DirPath!, "files", "/"),
            name: join("..", "assets/meshes", item.id),
        });
    }

    /**
     * Called on the user right-clicks on an item.
     * @param item the item being right-clicked.
     * @param event the original mouse event.
     */
    public onContextMenu(item: IAssetComponentItem, e: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        super.onContextMenu(item, e);

        const platform = os.platform();
        const explorer = platform === "darwin" ? "Finder" : "File Explorer";

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Refresh..." icon={<Icon src="recycle.svg" />} onClick={() => this._refreshMeshPreview(item.id, item.key)} />
                <MenuDivider />
                <MenuItem text="Update Instantiated References..." onClick={() => this.addOrUpdateMeshesInScene(item, true, false)} />
                <MenuItem text="Force Update Instantiated References..." onClick={() => this.addOrUpdateMeshesInScene(item, true, true)} />
                <MenuDivider />
                <MenuItem text={`Show in ${explorer}`} icon="document-open" onClick={() => shell.showItemInFolder(Tools.NormalizePathForCurrentPlatform(item.key))} />
                <MenuItem text="Export To" icon="export">
                    <MenuItem text="To Babylon..." icon={<Icon src="logo-babylon.svg" style={{ filter: "none" }} />} onClick={() => SceneTools.ExportMeshAssetToBabylonJSFormat(this.editor, item.id)} />
                    <MenuItem text="To GLB..." icon={<Icon src="gltf.svg" style={{ filter: "none" }} />} onClick={() => SceneTools.ExportMeshAssetToGLTF(this.editor, item.id, "glb")} />
                    <MenuItem text="To GLTF..." icon={<Icon src="gltf.svg" style={{ filter: "none" }} />} onClick={() => SceneTools.ExportMeshAssetToGLTF(this.editor, item.id, "gltf")} />
                </MenuItem>
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveMesh(item)} />
            </Menu>,
            { left: e.clientX, top: e.clientY },
        );
    }

    private async _refreshMeshPreview(name: string, path: string): Promise<void> {
        const task = this.editor.addTaskFeedback(50, `Refresing "${name}"`);

        try {
            await this.editor.assets.refresh(MeshesAssets, path);
            this.editor.updateTaskFeedback(task, 100, "Done");
        } catch (e) {
            this.editor.updateTaskFeedback(task, 0, "Failed");
        }

        this.editor.closeTaskFeedback(task, 500);
    }

    /**
     * Called on the user drops an asset in editor. (typically the preview canvas).
     * @param item the item being dropped.
     * @param pickInfo the pick info generated on the drop event.
     * @override
     */
    public onDropAsset(item: IAssetComponentItem, pickInfo: PickingInfo): Promise<void> {
        super.onDropAsset(item, pickInfo);
        return this.addOrUpdateMeshesInScene(item, false, false, pickInfo);
    }

    /**
     * Adds or updates the meshes/material in scehe scene. In case of an update, it will just add the newest meshes.
     * @param item defines the item being added or updated.
     * @param update defines wether or not the instantiated meshes in scene should be updated.
     * @param forceUpdate defines wether or not, in case of an update, the update should be forced.
     * @param pickInfo defines the pick info generated in case of a drop event.
     */
    public async addOrUpdateMeshesInScene(item: IAssetComponentItem, update: boolean, forceUpdate: boolean, pickInfo?: PickingInfo): Promise<void> {
        require("babylonjs-loaders");

        const extension = extname(item.id).toLowerCase();
        const isGltf = extension === ".glb" || extension === ".gltf";
        if (isGltf) {
            Overlay.Show("Configuring GLTF...", true);
        }

        const rootUrl = join(Project.DirPath!, "files", "/");
        const sceneFilename = join("..", "assets/meshes", item.id);

        // Load and stop all animations
        const result = await SceneLoader.ImportMeshAsync("", rootUrl, sceneFilename, this.editor.scene!);
        this.editor.scene!.stopAllAnimations();

        const onTextureDone = (n: string) => Overlay.SetMessage(`Configuring GLTF... ${n}`);

        await SceneTools.ImportAnimationGroupsFromFile(this.editor, item.key);

        for (const mesh of result.meshes) {
            if (!update || !this._updateImportedMeshGeometry(mesh, item.id, forceUpdate)) {
                // Store the pose matrix of the mesh.
                mesh.metadata ??= { };
                mesh.metadata.basePoseMatrix = mesh.getPoseMatrix().asArray();

                // Place mesh
                if (!mesh.parent && pickInfo?.pickedPoint) {
                    mesh.position.addInPlace(pickInfo.pickedPoint);
                }
                
                if (mesh instanceof Mesh) {
                    const meshMetadata = Tools.GetMeshMetadata(mesh);
                    meshMetadata.originalSourceFile = {
                        id: mesh.id,
                        name: mesh.name,
                        sceneFileName: item.id,
                    };

                    if (mesh.geometry) {
                        mesh.geometry.id = Tools.RandomId();
                    }
                }

                mesh.id = Tools.RandomId();
            }

            // Materials
            if (mesh.material) {
                // Store original datas
                const materialMetadata = Tools.GetMaterialMetadata(mesh.material);
                materialMetadata.originalSourceFile = materialMetadata.originalSourceFile ?? {
                    id: mesh.material.id,
                    name: mesh.material.name,
                    sceneFileName: item.id,
                };

                mesh.material.id = Tools.RandomId();

                if (mesh.material instanceof MultiMaterial) {
                    for (const m of mesh.material.subMaterials) {
                        if (!m) { return; }

                        // Store original datas
                        const subMaterialMetadata = Tools.GetMaterialMetadata(m);
                        subMaterialMetadata.originalSourceFile = subMaterialMetadata.originalSourceFile ?? {
                            id: m.id,
                            name: m.name,
                            sceneFileName: item.id,
                        };
                        
                        m.id = Tools.RandomId();
                        
                        if (isGltf) {
                            await this._configureGltfMaterial(m, onTextureDone);
                        }

                        this._configureMaterialTextures(m);
                    };
                } else {
                    if (isGltf) {
                        await this._configureGltfMaterial(mesh.material, onTextureDone);
                    }

                    this._configureMaterialTextures(mesh.material);
                }
            }
        }

        // Don't forget transform nodes
        for (const transformNode of this.editor.scene!.transformNodes) {
            if (!transformNode.metadata || !transformNode.metadata.gltf) { continue; }
            if (transformNode.metadata.gltf.editorDone) { continue; }

            if (update) {
                transformNode.dispose(true, false);
            } else {
                transformNode.id = Tools.RandomId();
                transformNode.metadata.gltf.editorDone = true;
            }
        }

        result.skeletons.forEach((skeleton) => {
            // Skeleton Ids are not strings but numbers
            let id = 0;
            while (this.editor.scene!.getSkeletonById(id as any)) {
                id++;
            }

            skeleton.id = id as any;

            skeleton.bones.forEach((b) => {
                b.id = Tools.RandomId();

                b.metadata ??= { };
                b.metadata.originalId = b.id;
            });
        });
        
        result.particleSystems.forEach((ps) => ps.id = Tools.RandomId());

        this.editor.assets.refresh();
        this.editor.graph.refresh();

        if (isGltf) {
            Overlay.Hide();
        }
    }

    /**
     * Called on the user drops files in the assets component and returns true if the files have been computed.
     * @param files the list of files being dropped.
     */
    public async onDropFiles(files: IFile[]): Promise<void> {
        for (const file of files) {
            const extension = extname(file.name).toLowerCase();
            if (extension === ".bin") {
                // For GLTF files.
                await copy(file.path, join(Project.DirPath!, "files", file.name));
            }

            if (this.extensions.indexOf(extension) === -1) { continue; }

            const existing = MeshesAssets.Meshes.find((m) => m.name === file.name);

            // Copy assets
            const dest = join(Project.DirPath!, "assets", "meshes", file.name);
            if (dest) {
                try {
                    await copy(file.path, dest);
                } catch (e) {
                    this.editor.console.logError(e.message);
                }
            }

            if (!existing) {
                MeshesAssets.Meshes.push({ name: file.name, path: dest });
            } else {
                this.editor.assets.refresh(MeshesAssets, existing.path);
            }
        }
    }

    /**
     * Called on the user pressed the delete key on the asset.
     * @param item defines the item being deleted.
     */
    public onDeleteAsset(item: IAssetComponentItem): void {
        super.onDeleteAsset(item);
        this._handleRemoveMesh(item);
    }

    /**
     * Returns the content of the item's tooltip on the pointer is over the given item.
     * @param item defines the reference to the item having the pointer over.
     */
    protected getItemTooltipContent(item: IAssetComponentItem): JSX.Element {
        return (
            <>
                <Tag fill={true} intent={Intent.PRIMARY}>{item.id}</Tag>
                <Divider />
                <Tag fill={true} interactive={true} intent={Intent.PRIMARY} onClick={() => shell.showItemInFolder(Tools.NormalizePathForCurrentPlatform(item.key))}>{item.key}</Tag>
                <Divider />
                <img
                    src={item.base64}
                    style={{
                        width: "256}px",
                        height: "256px",
                        objectFit: "contain",
                        backgroundColor: "#222222",
                        left: "50%",
                    }}
                ></img>
            </>
        );
    }

    /**
     * Called on the user wants to add textures.
     */
    private async _addMeshes(): Promise<void> {
        const files = await Tools.ShowNativeOpenMultipleFileDialog();

        // Meshes can be scenes. Textures, sounds, etc. should be selected as well.
        return this.editor.assets.addFilesToAssets(files);
    }

    /**
     * Updates the existing meshes in scene with the given mesh's geometry.
     */
    private _updateImportedMeshGeometry(mesh: AbstractMesh, sceneFileName: string, force: boolean): boolean {
        if (!(mesh instanceof Mesh)) {
            return false;
        }

        // Check mesh already exists
        const updatedMeshes: Mesh[] = [];

        this.editor.scene!.meshes.forEach((m) => {
            if (!(m instanceof Mesh)) {
                return undefined;
            }

            const meshMetadata = Tools.GetMeshMetadata(m);
            if (!meshMetadata.originalSourceFile?.id || meshMetadata.originalSourceFile.sceneFileName !== sceneFileName) {
                return;
            }

            if (meshMetadata.originalSourceFile.id === mesh.id) {
                meshMetadata._waitingUpdatedReferences = { };
                
                meshMetadata._waitingUpdatedReferences!.geometry = {
                    geometry: mesh.geometry,
                    skeleton: mesh.skeleton,
                    subMeshes: mesh.subMeshes?.slice() ?? [],
                };

                // Material
                if (mesh.material) {
                    if (!m.material) {
                        meshMetadata._waitingUpdatedReferences!.material = mesh.material;
                    } else {
                        meshMetadata._waitingUpdatedReferences!.material = mesh.material;
                    }
                } else if (m.material) {
                    meshMetadata._waitingUpdatedReferences!.material = null;
                }

                // Keep updated mesh metadata.
                updatedMeshes.push(m);
            }
        });

        if (!updatedMeshes.length) {
            return false;
        }

        if (force) {
            updatedMeshes.forEach((um) => {
                const umMetadata = Tools.GetMeshMetadata(um);
                if (!umMetadata._waitingUpdatedReferences) { return; }

                umMetadata._waitingUpdatedReferences.geometry!.geometry?.applyToMesh(um);
                um.skeleton = umMetadata._waitingUpdatedReferences.geometry!.skeleton ?? null;

                if (umMetadata._waitingUpdatedReferences.geometry!.subMeshes) {
                    um.subMeshes = [];
                    umMetadata._waitingUpdatedReferences.geometry!.subMeshes?.forEach((sm) => {
                        new SubMesh(sm.materialIndex, sm.verticesStart, sm.verticesCount, sm.indexStart, sm.indexCount, um, um, true, true);
                    });
                }

                um.material = umMetadata._waitingUpdatedReferences.material ?? null;

                delete umMetadata._waitingUpdatedReferences;
            });
        }

        mesh._geometry = null;
        mesh.subMeshes = [];
        mesh.dispose(true, false);
        return true;
    }

    /**
     * Configures the given material's textures.
     */
    private _configureMaterialTextures(material: Material): void {
        const textures = material.getActiveTextures();
        textures?.forEach((t) => {
            if (!(t instanceof Texture) && !(t instanceof CubeTexture)) { return; }
            const path = join("files", basename(t.name));

            t.name = path;
            if (t.url) { t.url = path; }
        });
    }

    /**
     * Called on the user wants to remove a mesh from the library.
     */
    private _handleRemoveMesh(item: IAssetComponentItem): void {
        undoRedo.push({
            description: `Removed mesh asset "${item.id}" at path "${item.key}"`,
            common: () => this.refresh(),
            redo: () => {
                const meshIndex = MeshesAssets.Meshes.findIndex((m) => m.path === item.key);
                if (meshIndex !== -1) { MeshesAssets.Meshes.splice(meshIndex, 1); }

                const itemIndex = this.items.indexOf(item);
                if (itemIndex !== -1) { this.items.splice(itemIndex, 1); }
            },
            undo: () => {
                MeshesAssets.Meshes.push({ name: item.id, path: item.key });
                this.items.push(item);
            },
        });
    }

    /**
     * Configures the given material's textures.
     */
    private async _configureGltfMaterial(material: Material, onTextureDone: (name: string) => void): Promise<void> {
        const textures = material.getActiveTextures();

        for (const texture of textures) {
            if (texture.metadata?.gltf?.editorDone) { continue; }

            if (!(texture instanceof Texture) && !(texture instanceof CubeTexture)) { return; }
            if (texture.isRenderTarget) { return; }

            const mimeType = texture["_mimeType"];

            if (mimeType) {
                const existingExtension = extname(texture.name);
                const targetExtension = Tools.GetExtensionFromMimeType(mimeType);

                if (existingExtension !== targetExtension) {
                    texture.name = join("files", `${basename(texture.name)}${targetExtension}`);
                } else {
                    texture.name = join("files", basename(texture.name));
                }
            } else {
                texture.name = join("files", basename(texture.url!));
                if (texture.url) { texture.url = texture.name; }
            }

            if (texture.url) { texture.url = texture.name; }

            FilesStore.AddFile(join(Project.DirPath!, texture.name));
        }

        await GLTFTools.TexturesToFiles(join(Project.DirPath!, "files"), textures, onTextureDone);
    }
}
