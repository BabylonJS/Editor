import { ipcRenderer } from "electron";
import { join, extname } from "path";
import Zip from "adm-zip";

import { Nullable, Undefinable } from "../../../shared/types";
import { IPCResponses } from "../../../shared/ipc";

import * as React from "react";
import {
    ButtonGroup, Button, Classes, ContextMenu, Menu, MenuItem, MenuDivider, Divider,
    Popover, Position, Tag, Intent, Code,
} from "@blueprintjs/core";

import {
    Material, Mesh, ShaderMaterial, PickingInfo, Tools as BabylonTools,
    NodeMaterial, MultiMaterial, Scene, Node,
} from "babylonjs";

import { assetsHelper, OffscreenAssetsHelperMesh } from "../tools/offscreen-assets-helper/offscreen-asset-helper";
import { Tools } from "../tools/tools";
import { undoRedo } from "../tools/undo-redo";
import { IPCTools } from "../tools/ipc";

import { Icon } from "../gui/icon";
import { Dialog } from "../gui/dialog";
import { Overlay } from "../gui/overlay";

import { Project } from "../project/project";
import { FilesStore } from "../project/files";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";
import { Alert } from "../gui/alert";

export class MaterialAssets extends AbstractAssets {
    /**
     * Defines the type of the data transfer data when drag'n'dropping asset.
     * @override
     */
    public readonly dragAndDropType: string = "application/material";

    private static _NodeMaterialEditors: { id: number; material: NodeMaterial }[] = [];

    /**
     * Registers the component.
     */
    public static Register(): void {
        Assets.addAssetComponent({
            title: "Materials",
            identifier: "materials",
            ctor: MaterialAssets,
        });
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const node = super.render();

        const add = 
            <Menu>
                <MenuItem key="add-standard-material" text="Standard Material..." onClick={() => this._addMaterial("StandardMaterial")} />
                <MenuItem key="add-pbr-material" text="PBR Material..." onClick={() => this._addMaterial("PBRMaterial")} />
                <MenuItem key="add-node-material" text="Node Material..." onClick={() => this._addMaterial("NodeMaterial")} />
                <MenuDivider />
                <MenuItem key="add-node-material-from-snippet" text="Node Material From Snippet..." onClick={() => this._addNodeMaterialFromWeb()} />
                <MenuDivider />
                <MenuItem key="add-material-from-preset" icon={<Icon src="search.svg" />} text="From Preset..." onClick={() => this._handleLoadFromPreset()} />
                <MenuDivider />
                <Code>Materials Library</Code>
                <MenuItem key="add-cell-material" text="Add Cell Material..." onClick={() => this._addMaterial("CellMaterial")} />
                <MenuItem key="add-fire-material" text="Add Fire Material..." onClick={() => this._addMaterial("FireMaterial")} />
                <MenuItem key="add-lava-material" text="Add Lava Material..." onClick={() => this._addMaterial("LavaMaterial")} />
                <MenuItem key="add-water-material" text="Add Water Material..." onClick={() => this._addMaterial("WaterMaterial")} />
            </Menu>;

        return (
            <>
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        <Popover key="add-popover" content={add} position={Position.BOTTOM_LEFT}>
                            <Button key="add" icon={<Icon src="plus.svg"/>} rightIcon="caret-down" small={true} text="Add"/>
                        </Popover>
                        <Divider />
                        <Button key="clear-unused" icon={<Icon src="recycle.svg" />} small={true} text="Clear Unused" onClick={() => this._clearUnusedMaterials()} />
                    </ButtonGroup>
                </div>
                {node}
            </>
        );
    }

    /**
     * Refreshes the component.
     * @override
     */
    public async refresh(object?: Material): Promise<void> {
        await assetsHelper.init();
        await assetsHelper.createMesh(OffscreenAssetsHelperMesh.Sphere);
        
        for (const material of this.editor.scene!.materials) {
            if (material === this.editor.scene!.defaultMaterial || material instanceof ShaderMaterial || material.doNotSerialize) { continue; }
            if (object && object !== material) { continue; }
            
            const item = this.items.find((i) => i.key === material.id);
            if (!object && item) { continue; }

            const copy = material.serialize();
            await assetsHelper.setMaterial(copy, material instanceof NodeMaterial ? undefined : join(Project.DirPath!, "/"));

            const base64 = await assetsHelper.getScreenshot();

            const itemData: IAssetComponentItem = { id: material.name, key: material.id, base64 };
            if (material.metadata?.isLocked) {
                itemData.style = { border: "solid red" };
            }

            if (item) {
                const index = this.items.indexOf(item);
                if (index !== -1) { this.items[index] = itemData; }
            } else {
                this.items.push(itemData);
            }

            this.updateAssetThumbnail(material.id, base64);
            await assetsHelper.disposeMaterial();

            this.updateAssetObservable.notifyObservers();
        }

        await assetsHelper.reset();
        return super.refresh();
    }

    /**
     * Called on the user clicks on an item.
     * @param item the item being clicked.
     * @param img the clicked image element.
     */
    public onClick(item: IAssetComponentItem, img: HTMLImageElement): void {
        super.onClick(item, img);

        const material = this.editor.scene!.getMaterialByID(item.key);
        if (material) { this.editor.selectedMaterialObservable.notifyObservers(material); }
    }

    /**
     * Called on the user double clicks an item.
     * @param item the item being double clicked.
     * @param img the double-clicked image element.
     */
    public async onDoubleClick(item: IAssetComponentItem, img: HTMLImageElement): Promise<void> {
        super.onDoubleClick(item, img);

        const material = this.editor.scene!.getMaterialByID(item.key);
        if (!material) { return; }

        this.openMaterial(material);
    }

    /**
     * Called on the user right-clicks on an item.
     * @param item the item being right-clicked.
     * @param event the original mouse event.
     */
    public onContextMenu(item: IAssetComponentItem, e: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        super.onContextMenu(item, e);

        const material = this.editor.scene!.getMaterialByID(item.key);
        if (!material) { return; }

        material.metadata = material.metadata ?? { };
        material.metadata.isLocked = material.metadata.isLocked ?? false;

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Refresh..." icon={<Icon src="recycle.svg" />} onClick={() => this.refresh(material)} />
                <MenuDivider />
                <MenuItem text="Save Material Preset..." icon={<Icon src="save.svg" />} onClick={() => this._handleSaveMaterialPreset(item)} />
                <MenuDivider />
                <MenuItem text="Clone..." onClick={async () => {
                    const name = await Dialog.Show("Material Name?", "Please provide a name for the cloned material");

                    const existing = this.editor.scene!.materials.find((m) => m.name === name);
                    if (existing) {
                        return Alert.Show("Can't clone material", `A material named "${name}" already exists.`);
                    }

                    const clone = material.clone(name);
                    if (!clone) {
                        return Alert.Show("Failed to clone", "An error occured while clonig the material. The returned refenrence is equal to null.");
                    }

                    clone.uniqueId = this.editor.scene!.getUniqueId();
                    clone.id = Tools.RandomId();

                    this.refresh();
                }} />
                <MenuItem text="Locked" icon={material.metadata.isLocked ? <Icon src="check.svg" /> : undefined} onClick={() => {
                    material.metadata.isLocked = !material.metadata.isLocked;
                    item.style = item.style ?? { };
                    item.style.border = material.metadata.isLocked ? "solid red": "";
                    super.refresh();
                }} />
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveMaterial(item)} />
            </Menu>,
            { left: e.clientX, top: e.clientY },
        );
    }

    /**
     * Called on the user drops an asset in editor. (typically the preview canvas).
     * @param item the item being dropped.
     * @param pickInfo the pick info generated on the drop event.
     * @override
     */
    public async onDropAsset(item: IAssetComponentItem, pickInfo: PickingInfo): Promise<void> {
        super.onDropAsset(item, pickInfo);

        const mesh = pickInfo.pickedMesh;
        if (!mesh || !(mesh instanceof Mesh)) { return; }

        const material = this.editor.scene!.getMaterialByID(item.key);
        if (!material) { return; }

        const subMeshId = pickInfo.subMeshId ?? null;
        if (mesh.material && mesh.material instanceof MultiMaterial && subMeshId) {
            mesh.material.subMaterials[subMeshId] = material;
            mesh.getLODLevels().forEach((lod) => lod.mesh && lod.mesh.material instanceof MultiMaterial && (lod.mesh.material.subMaterials[subMeshId] = material));
        } else {
            mesh.material = material;
            mesh.getLODLevels().forEach((lod) => lod.mesh && (lod.mesh.material = material));
        }

        this.editor.inspector.refresh();
    }

    /**
     * Called on the user pressed the delete key on the asset.
     * @param item defines the item being deleted.
     */
    public onDeleteAsset(item: IAssetComponentItem): void {
        super.onDeleteAsset(item);
        this._handleRemoveMaterial(item);
    }

    /**
     * Called on an asset item has been drag'n'dropped on graph component.
     * @param data defines the data of the asset component item being drag'n'dropped.
     * @param nodes defines the array of nodes having the given item being drag'n'dropped.
     */
    public onGraphDropAsset(data: IAssetComponentItem, nodes: (Scene | Node)[]): boolean {
        super.onGraphDropAsset(data, nodes);

        const material = this.editor.scene!.getMaterialByID(data.key);
        if (!material) { return false; }

        const meshes = nodes.filter((n) => n instanceof Mesh) as Mesh[];
        meshes.forEach((m) => m.material = material);

        return true;
    }

    /**
     * Returns the content of the item's tooltip on the pointer is over the given item.
     * @param item defines the reference to the item having the pointer over.
     */
    protected getItemTooltipContent(item: IAssetComponentItem): Undefinable<JSX.Element> {
        const material = this.editor.scene!.getMaterialByID(item.key);
        if (!material) { return undefined; }

        const binded = material.getBindedMeshes();
        const attachedEllement = binded.length > 0 ? (
            <>
                <Divider />
                <b>Attached to:</b><br />
                <ul>
                    {binded.map((b) => <li key={`${b.id}-li`}><Tag interactive={true} fill={true} key={`${b.id}-tag`} intent={Intent.PRIMARY} onClick={() => {
                        this.editor.selectedNodeObservable.notifyObservers(b);
                        this.editor.preview.focusSelectedNode(false);
                    }}>{b.name}</Tag></li>)}
                </ul>
            </>
        ) : undefined;

        return (
            <>
                <Tag key="itemId" fill={true} intent={Intent.PRIMARY}>{item.id}</Tag>
                <Divider />
                <Tag key="itemClassName" fill={true} intent={Intent.PRIMARY}>{material.getClassName()}</Tag>
                {attachedEllement}
                <Divider />
                <img
                    src={item.base64}
                    style={{
                        width: `${Math.max(this.size * 2, 256)}px`,
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
     * Saves the given material as zip and returns its zip reference.
     * @param materialId the id of the material to save as zip.
     */
    public getZippedMaterial(materialId: string): Nullable<Zip> {
        const material = this.editor.scene!.getMaterialByID(materialId);
        if (!material) { return null; }

        const json = material.serialize();
        json.editorPreview = this.items.find((i) => i.key === materialId)?.base64;

        const jsonStr = JSON.stringify(json, null, "\t");

        const task = this.editor.addTaskFeedback(0, "Saving Material...");
        const textures = material.getActiveTextures();

        const zip = new Zip();
        zip.addFile("material.json", Buffer.alloc(jsonStr.length, jsonStr), "material configuration");

        textures.forEach((texture, index) => {
            // Take care of embeded textures.
            if (texture.name.indexOf("data:") === 0) { return; }

            const path = join(Project.DirPath!, texture.name);
            zip.addLocalFile(path, "files/");

            this.editor.updateTaskFeedback(task, (index / textures.length) * 100);
        });

        this.editor.closeTaskFeedback(task, 500);

        return zip;
    }

    /**
     * Loads a material preset from the given preset path.
     * @param path the absolute path of the material preset.
     */
    public loadMaterialFromZip(path: string): Nullable<Material> {
        const zip = new Zip(path);
        const entries = zip.getEntries();

        const jsonEntry = entries.find((e) => e.entryName === "material.json");
        if (!jsonEntry) { return null; }
        
        const json = JSON.parse(zip.readAsText(jsonEntry));

        entries.forEach((e) => {
            if (e === jsonEntry) { return; }
            zip.extractEntryTo(e.entryName, Project.DirPath!, true, true);
            FilesStore.AddFile(join(Project.DirPath!, e.entryName));
        });

        const material = Material.Parse(json, this.editor.scene!, Project.DirPath!);
        if (material instanceof NodeMaterial) {
            material.build(true);
        }

        return material;
    }

    /**
     * Opens the given material in a separated window.
     * @param material defines the reference to the material to open.
     */
    public async openMaterial(material: Material): Promise<void> {
        if (material instanceof NodeMaterial) {
            const index = MaterialAssets._NodeMaterialEditors.findIndex((m) => m.material === material);
            const existingId = index !== -1 ? MaterialAssets._NodeMaterialEditors[index].id : undefined;
            const popupId = await this.editor.addWindowedPlugin("node-material-editor", existingId, {
                json: material.serialize(),
                lights: material.getScene().lights.map((l) => l.serialize()),
                editorData: material.editorData,
            });
            if (!popupId) { return; }

            if (index === -1) {
                MaterialAssets._NodeMaterialEditors.push({ id: popupId, material });
            } else {
                MaterialAssets._NodeMaterialEditors[index].id = popupId;
            }

            let callback: (...args: any[]) => void;
            ipcRenderer.on(IPCResponses.SendWindowMessage, callback = (_, message) => {
                if (message.id !== "node-material-json") { return; }
                if (message.data.json && message.data.json.id !== material.id) { return; }

                if (message.data.closed) {
                    ipcRenderer.removeListener(IPCResponses.SendWindowMessage, callback);

                    const windowIndex = MaterialAssets._NodeMaterialEditors.findIndex((m) => m.id === popupId);
                    if (windowIndex !== -1) {
                        MaterialAssets._NodeMaterialEditors.splice(windowIndex, 1);
                    }
                }

                if (message.data.json) {
                    try {
                        // Clear textures
                        material.getTextureBlocks().forEach((block) => block.texture?.dispose());

                        material.editorData = message.data.editorData;
                        material.loadFromSerialization(message.data.json);
                        material.build();

                        IPCTools.SendWindowMessage(popupId, "node-material-json");
                    } catch (e) {
                        IPCTools.SendWindowMessage(popupId, "graph-json", { error: true });
                    }
                    this.refresh(material);
                }
            });
        } else {
            await this.editor.addWindowedPlugin("material-viewer", undefined, {
                rootUrl: join(Project.DirPath!),
                json: material.serialize(),
                environmentTexture: this.editor.scene!.environmentTexture?.serialize(),
            });
        }
    }

    /**
     * Called on the user wants to remove a material.
     */
    private _handleRemoveMaterial(item: IAssetComponentItem): void {
        const material = this.editor.scene!.getMaterialByID(item.key);
        if (!material || material.metadata?.isLocked) { return; }

        const bindedMeshes = material.getBindedMeshes();

        undoRedo.push({
            common: () => this.refresh(),
            redo: () => {
                this.editor.scene!.removeMaterial(material);
                bindedMeshes.forEach((m) => m.material = null);

                const index = this.items.indexOf(item);
                if (index !== -1) { this.items.splice(index, 1); }
            },
            undo: () => {
                this.editor.scene!.addMaterial(material);
                bindedMeshes.forEach((m) => m.material = material);
                this.items.push(item);
            },
        })
    }

    /**
     * Adds a new material on the user clicks on the "Add Material..." button in the toolbar.
     */
    private async _addMaterial(type: string): Promise<void> {
        const name = await Dialog.Show("Material Name", "Please provide a name for the new material to created.");
        
        const ctor = BabylonTools.Instantiate(`BABYLON.${type}`);
        const material = new ctor(name, this.editor.scene!);
        material.id = Tools.RandomId();

        if (material instanceof NodeMaterial) {
            material.setToDefault();
            material.build(true);
        }

        this.refresh();
    }

    /**
     * Adds a new Node Material from the given snippet Id.
     */
    private async _addNodeMaterialFromWeb(): Promise<void> {
        const snippetId = await Dialog.Show("Snippet Id", "Please provide the Id of the snippet.");

        Overlay.Show("Loading From Snippet...", true);
        try {
            const material = await NodeMaterial.ParseFromSnippetAsync(snippetId, this.editor.scene!);
            material.id = Tools.RandomId();
        } catch (e) {
            Alert.Show("Failed to load from snippet", e.message);
        }
        Overlay.Hide();

        this.refresh();
    }

    /**
     * Called on the user wants to save the material.
     * @param item the item select when the user wants to save a material.
     */
    private async _handleSaveMaterialPreset(item: IAssetComponentItem): Promise<void> {
        const zip = this.getZippedMaterial(item.key);
        if (!zip) { return; }
        
        let destination = await Tools.ShowSaveFileDialog("Save Material Preset");
        const task = this.editor.addTaskFeedback(0, "Saving Material...");

        const extension = extname(destination);
        if (extension !== ".zip") { destination += ".zip"; }

        this.editor.updateTaskFeedback(task, 50, "Writing preset...");
        zip.writeZip(destination);
        this.editor.updateTaskFeedback(task, 100, "Done");
        this.editor.closeTaskFeedback(task, 500);
    }

    /**
     * Called when the user wants to load a material from a preset.
     */
    private async _handleLoadFromPreset(): Promise<void> {
        const files = await Tools.ShowNativeOpenMultipleFileDialog();
        const task = this.editor.addTaskFeedback(0, "Loading presets...");

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const material = this.loadMaterialFromZip(file.path);
            if (material) {
                material.id = Tools.RandomId();
            }

            this.editor.updateTaskFeedback(task, (i / files.length) * 100, `Loaded preset "${material?.name}"`);
            await Tools.Wait(500);
        };

        this.editor.updateTaskFeedback(task, 100, "Done");
        this.editor.closeTaskFeedback(task, 1000);
        this.editor.assets.refresh();
    }

    /**
     * Clears the unused textures in the project.
     */
    private _clearUnusedMaterials(): void {
        const toRemove = this.editor.scene!.materials.concat(this.editor.scene!.multiMaterials).filter((m) => m !== this.editor.scene!.defaultMaterial && !(m instanceof ShaderMaterial));

        toRemove.forEach((material) => {
            if (!material || material.metadata?.isLocked) { return; }

            const bindedMesh = this.editor.scene!.meshes.find((m) => !m._masterMesh && m.material === material);

            // Used directly by a mesh, return.
            if (bindedMesh) { return; }

            // Search in multi materials
            const bindedMultiMaterial = this.editor.scene!.multiMaterials.find((mm) => mm.subMaterials.find((sm) => sm === material));
            if (bindedMultiMaterial) { return; }

            // Not used, remove material.
            material.dispose(true, false);

            const itemIndex = this.items.findIndex((i) => i.key === material.id);
            if (itemIndex !== -1) {
                this.items.splice(itemIndex, 1);
            }
        });

        this.refresh();
    }
}
