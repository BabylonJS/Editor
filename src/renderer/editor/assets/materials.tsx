import { ipcRenderer } from "electron";
import { join, extname } from "path";
import Zip from "adm-zip";

import { Nullable } from "../../../shared/types";
import { IPCResponses } from "../../../shared/ipc";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { ButtonGroup, Button, Classes, Dialog, FormGroup, InputGroup, ContextMenu, Menu, MenuItem, MenuDivider, Divider } from "@blueprintjs/core";

import { Material, Mesh, ShaderMaterial, PickingInfo, Tools as BabylonTools, NodeMaterial } from "babylonjs";

import { assetsHelper, OffscreenAssetsHelperMesh } from "../tools/offscreen-assets-helper/offscreen-asset-helper";
import { Tools } from "../tools/tools";
import { undoRedo } from "../tools/undo-redo";

import { Icon } from "../gui/icon";
import { List } from "../gui/list";

import { Project } from "../project/project";
import { FilesStore } from "../project/files";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";

export class MaterialAssets extends AbstractAssets {
    private static _NodeMaterialEditors: { id: number; material: NodeMaterial }[] = [];

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const node = super.render();

        return (
            <>
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        <Button key="add-material" icon={<Icon src="plus.svg" />} small={true} text="Add Material..." onClick={() => this._addMaterial()} />
                        <Divider />
                        <Button key="load-preset" icon={<Icon src="search.svg" />} small={true} text="Load Preset..." onClick={() => this._handleLoadFromPreset()} />
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
            if (material === this.editor.scene!.defaultMaterial || material instanceof ShaderMaterial) { continue; }
            if (object && object !== material) { continue; }
            
            const item = this.items.find((i) => i.key === material.id);
            if (!object && item) { continue; }

            const copy = material.serialize();
            await assetsHelper.setMaterial(copy, join(Project.DirPath!, "/"));

            const base64 = await assetsHelper.getScreenshot();

            const itemData = { id: material.name, key: material.id, base64 };
            if (item) {
                const index = this.items.indexOf(item);
                if (index !== -1) { this.items[index] = itemData; }
            } else {
                this.items.push(itemData);
            }

            this.updateAssetObservable.notifyObservers();
            await assetsHelper.disposeMaterial();
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

            ipcRenderer.on(IPCResponses.SendWindowMessage, (_, data) => {
                if (data.id !== "node-material-json") { return; }
                if (data.json.id !== material.id) { return; }

                // CLear textures
                material.getTextureBlocks().forEach((block) => block.texture?.dispose());

                material.editorData = data.editorData;
                material.loadFromSerialization(data.json, Project.DirPath!);
                material.build();
                this.refresh(material);
            });
        }
    }

    /**
     * Called on the user right-clicks on an item.
     * @param item the item being right-clicked.
     * @param event the original mouse event.
     */
    public onContextMenu(item: IAssetComponentItem, e: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        super.onContextMenu(item, e);

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Save Material Preset..." icon={<Icon src="save.svg" />} onClick={() => this._handleSaveMaterialPreset(item)} />
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

        mesh.material = material;
        mesh.getLODLevels().forEach((lod) => lod.mesh && (lod.mesh.material = material));

        this.editor.inspector.refresh();
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
        if (material) {
            this.items.push({ id: material.name, key: material.id, base64: json.editorPreview });
        }

        return material;
    }

    /**
     * Called on the user wants to remove a material.
     */
    private _handleRemoveMaterial(item: IAssetComponentItem): void {
        const material = this.editor.scene!.getMaterialByID(item.key);
        if (!material) { return; }

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
    private async _addMaterial(): Promise<void> {
        let name = "";
        let type = "StandardMaterial";

        const availableMaterials = ["StandardMaterial", "PBRMaterial", "NodeMaterial"];

        ReactDOM.render((
            <Dialog
                className={Classes.DARK}
                isOpen={true}
                usePortal={true}
                title="Add New Material"
                enforceFocus={true}
                onClose={() => ReactDOM.unmountComponentAtNode(document.getElementById("BABYLON-EDITOR-OVERLAY") as Element)}
            >
                <div className={Classes.DIALOG_BODY}>
                    <FormGroup label="Please provide a name for the new material" labelFor="material-name" labelInfo="(required)">
                        <InputGroup id="material-name" placeholder="Name..." autoFocus={true} onChange={(ev) => name = ev.target.value} />
                        <List onChange={(i) => type = i} selected={type} items={availableMaterials} placeHolder="Type..."></List>
                    </FormGroup>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button key="add" icon={<Icon src="plus.svg" />} small={true} text="Add" onClick={() => {
                            if (!name || !type) { return; }
                            const ctor = BabylonTools.Instantiate(`BABYLON.${type}`);
                            const material = new ctor(name, this.editor.scene!);
                            material.id = Tools.RandomId();

                            if (material instanceof NodeMaterial) {
                                material.setToDefault();
                            }

                            this.refresh();
                            ReactDOM.unmountComponentAtNode(document.getElementById("BABYLON-EDITOR-OVERLAY") as Element);
                        }} />
                    </div>
                </div>
            </Dialog>
        ), document.getElementById("BABYLON-EDITOR-OVERLAY"));
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
        const toRemove = this.items.map((i) => this.editor.scene!.getMaterialByID(i.key));

        toRemove.forEach((material) => {
            if (!material) { return; }

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

Assets.addAssetComponent({
    title: "Materials",
    ctor: MaterialAssets,
});
