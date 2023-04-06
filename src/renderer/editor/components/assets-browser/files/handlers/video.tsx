import { basename } from "path";
import { clipboard } from "electron";

import * as React from "react";
import { ContextMenu, Menu, MenuDivider, MenuItem, Icon as BPIcon, H4, Tag } from "@blueprintjs/core";

import { Mesh, PBRMaterial, PickingInfo, StandardMaterial, VideoTexture } from "babylonjs";

import { undoRedo } from "../../../../tools/undo-redo";

import { AssetsBrowserItemHandler } from "../item-handler";

export class VideoItemHandler extends AssetsBrowserItemHandler {
    /**
     * Computes the image to render.
     */
    public computePreview(): React.ReactNode {
        return (
            <video
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                }}
            >
                <source
                    src={this.props.absolutePath}
                />
            </video>
        );
    }

    /**
     * Called on the user clicks on the asset.
     * @param ev defines the reference to the event object.
     */
    public onClick(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        const existing = this.props.editor.scene!.textures.filter((t) => t.name === this.props.relativePath);
        if (existing.length === 1) {
            this.props.editor.inspector.setSelectedObject(existing[0]);
        } else {
            const items = existing.map((t) => (
                <MenuItem text={basename(t.metadata?.editorName ?? t.name)} onClick={() => this.props.editor.inspector.setSelectedObject(t)} />
            ));

            ContextMenu.show((
                <Menu>
                    <Tag>Edit:</Tag>
                    {items}
                </Menu>
            ), {
                top: ev.clientY,
                left: ev.clientX,
            });
        }
    }

    /**
     * Called on the user double clicks on the item.
     * @param ev defines the reference to the event object.
     */
    public onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        this.props.editor.addWindowedPlugin("texture-viewer", false, undefined, this.props.absolutePath);
    }

    /**
     * Called on the user right clicks on the item.
     * @param ev defines the reference to the event object.
     */
    public onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        ContextMenu.show((
            <Menu>
                <MenuItem text="Copy Path" icon={<BPIcon icon="clipboard" color="white" />} onClick={() => clipboard.writeText(this.props.relativePath, "clipboard")} />
                <MenuItem text="Copy Absolute Path" icon={<BPIcon icon="clipboard" color="white" />} onClick={() => clipboard.writeText(this.props.absolutePath, "clipboard")} />
                <MenuDivider />
                {this.getCommonContextMenuItems()}
            </Menu>
        ), {
            top: ev.clientY,
            left: ev.clientX,
        });
    }

    /**
     * Called on the user starts dragging the item.
     * @param ev defines the reference to the event object.
     */
    public onDragStart(ev: React.DragEvent<HTMLDivElement>): void {
        ev.dataTransfer.setData("asset/video", JSON.stringify({
            absolutePath: this.props.absolutePath,
            relativePath: this.props.relativePath,
        }));
        ev.dataTransfer.setData("plain/text", this.props.absolutePath);
    }

    /**
     * Called on the assets has been dropped in the preview panel.
     * @param ev defines the reference to the event object.
     * @param pick defines the picking info generated while dropping in the preview.
     */
    public onDropInPreview(ev: DragEvent, pick: PickingInfo): void {
        if (!pick.pickedMesh || !(pick.pickedMesh instanceof Mesh)) {
            return;
        }

        const material = pick.pickedMesh.material;
        if (!material) {
            return;
        }

        let textures: string[] = [];

        if (material instanceof PBRMaterial) {
            textures.push(...[
                "albedoTexture", "bumpTexture", "reflectivityTexture",
                "microSurfaceTexture", "metallicTexture",
                "ambientTexture", "opacityTexture", "emissiveTexture",
                "lightmapTexture",
            ]);
        } else if (material instanceof StandardMaterial) {
            textures.push(...[
                "diffuseTexture", "bumpTexture", "specularTexture",
                "ambientTexture", "opacityTexture", "emissiveTexture",
                "lightmapTexture",
            ]);
        }

        if (!textures.length) {
            return;
        }

        ContextMenu.show((
            <Menu>
                <H4 style={{ textAlign: "center" }}>{basename(this.props.relativePath)}</H4>
                <div style={{ width: "128px", height: "128px", margin: "auto" }}>
                    <video autoPlay src={this.props.absolutePath} style={{ objectFit: "contain", width: "100%", height: "100%" }}>
                        <source src={this.props.absolutePath} />
                    </video>
                </div>

                <MenuDivider />

                {textures.map((t) => (
                    <MenuItem icon={<BPIcon icon="arrow-right" color="white" />} text={t} onClick={() => {
                        const oldTexture = material[t];
                        undoRedo.push({
                            undo: () => material[t] = oldTexture,
                            redo: () => material[t] = this._getFirstInstantiatedTexture(),
                        });
                        material[t] = this._getFirstInstantiatedTexture();
                    }} />
                ))}
            </Menu>
        ), {
            top: ev.clientY,
            left: ev.clientX,
        });
    }

    /**
     * Called on the user drops the asset in a supported inspector field.
     * @param ev defiens the reference to the event object.
     * @param object defines the reference to the object being modified in the inspector.
     * @param property defines the property of the object to assign the asset instance.
     */
    public async onDropInInspector(_: React.DragEvent<HTMLElement>, object: any, property: string): Promise<void> {
        object[property] = this._getFirstInstantiatedTexture();
        await this.props.editor.assets.refresh();
    }

    /**
     * Returns the reference to the first instantiated texture.
     * If the texture doesn't exist, creates the texture.
     */
    private _getFirstInstantiatedTexture(): VideoTexture {
        let texture = this.props.editor.scene!.textures.find((tex) => tex instanceof VideoTexture && tex.name === this.props.relativePath) as VideoTexture;

        if (!texture) {
            texture = new VideoTexture(this.props.relativePath, this.props.absolutePath, this.props.editor.scene!, true);
        }

        return texture;
    }
}
