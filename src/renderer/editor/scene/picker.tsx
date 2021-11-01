import { Nullable } from "../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, MenuDivider, Classes, Pre, Code } from "@blueprintjs/core";

import {
    Observable, Node, Vector2, PointerEventTypes, AbstractMesh, SubMesh, Sound,
    ParticleSystem, Mesh, MultiMaterial,
} from "babylonjs";

import { Icon } from "../gui/icon";

import { Editor } from "../editor";

import { SceneIcons } from "./icons";
import { SceneSettings } from "./settings";

import { Tools } from "../tools/tools";

export class ScenePicker {
    /**
     * Notifies users when the 
     */
    public onNodeOver: Observable<Node> = new Observable<Node>();
    /**
     * Defines the reference to the scene icons.
     */
    public icons: SceneIcons;
    /**
     * Defines wether or not an overlay is drawn on the elements over the user's mouse.
     */
    public drawOverlayOnOverElement: boolean = true;
    
    private _editor: Editor;

    private _downMousePosition: Vector2 = Vector2.Zero();
    private _lastSelectedNode: Nullable<Node> = null;

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    public constructor(editor: Editor) {
        this._editor = editor;
        this.icons = new SceneIcons(editor);

        this.drawOverlayOnOverElement = !(editor.getPreferences().noOverlayOnDrawElement ?? false);

        this._bindCanvasEvents();
    }

    /**
     * Resets the picker.
     */
    public reset(): void {
        this._lastSelectedNode = null;
    }

    /**
     * Called on the mouse exists the canvas.
     */
    public canvasBlur(): void {
        if (this._lastSelectedNode && this._lastSelectedNode instanceof AbstractMesh) {
            this._lastSelectedNode.renderOverlay = false;
            this._lastSelectedNode.showBoundingBox = false;
            this._lastSelectedNode.showSubMeshesBoundingBox = false;
        }
    }

    /**
     * Returns the reference of the mesh that is under the pointer.
     * @param fastCheck Launch a fast check only using the bounding boxes. Can be set to null.
     */
    public getObjectUnderPointer(fastCheck: boolean = false): Nullable<Node | SubMesh> {
        // Icons
        let scene = this.icons._layer.utilityLayerScene;
        let x = scene.pointerX / (parseFloat(document.body.style.zoom ?? "") || 1);
        let y = scene.pointerY / (parseFloat(document.body.style.zoom ?? "") || 1);
        let pick = scene.pick(x, y, undefined, false);

        if (pick?.pickedMesh) { return pick.pickedMesh; }

        // Scene
        scene = this._editor.scene!;
        x = scene.pointerX / (parseFloat(document.body.style.zoom ?? "") || 1);
        y = scene.pointerY / (parseFloat(document.body.style.zoom ?? "") || 1);
        pick = scene.pick(x, y, undefined, fastCheck);
        
        if (!pick) { return null; }
        if (pick.pickedMesh?.metadata?.isLocked) { return null; }

        if (pick.pickedMesh && pick.pickedMesh.subMeshes?.length > 1) {
            const subMesh = pick.pickedMesh.subMeshes[pick.subMeshId];
            if (subMesh) { return subMesh; }
        }

        return pick.pickedMesh;
    }

    /**
     * Binds all the needed canvas events.
     */
    private _bindCanvasEvents(): void {
        // Icons
        this.icons.onClickObservable.add((event) => {
            this._onCanvasUp(event, true);
        });

        // Scene
        this._editor.scene!.onPointerObservable.add(ev => {
            if (!this._editor.scene!.activeCamera) { return; }
            
            switch (ev.type) {
                case PointerEventTypes.POINTERDOWN: this._onCanvasDown(ev.event); break;
                case PointerEventTypes.POINTERUP: this._onCanvasUp(ev.event); break;
                case PointerEventTypes.POINTERMOVE: this._onCanvasMove(); break;
            }
        });
    }

    /**
     * Called on the pointer is down on the canvas.
     */
    private _onCanvasDown(ev: MouseEvent): void {
        this._downMousePosition.set(ev.offsetX, ev.offsetY);
        this._editor.scene!.meshes.forEach((m) => m.isPickable = false);
    }

    /**
     * Called on the pointer is up on the canvas.
     */
    private _onCanvasUp(ev: MouseEvent, byPassDistance: boolean = false): void {
        this._editor.scene!.meshes.forEach((m) => m.isPickable = true);

        if (SceneSettings.IsCameraLocked) {
            return;
        }

        if (!byPassDistance) {
            const distance = Vector2.Distance(this._downMousePosition, new Vector2(ev.offsetX, ev.offsetY));
            if (distance > 2) { return; }
        }

        let object = this.getObjectUnderPointer(false);
        
        if (ev.button === 2) {
            if (object instanceof SubMesh) { object = object.getMesh(); }
            if (object?._scene === this.icons._layer.utilityLayerScene) { object = object.metadata.node as Node; }
            return this._onCanvasContextMenu(ev, object);
        }

        if (object) {
            if (object instanceof SubMesh) {
                this._editor.selectedSubMeshObservable.notifyObservers(object);
            } else {
                if (object._scene === this.icons._layer.utilityLayerScene) {
                    object = object.metadata.node;
                }

                if (object instanceof Node) {
                    this._editor.selectedNodeObservable.notifyObservers(object, undefined, undefined, undefined, {
                        ctrlDown: ev.ctrlKey || ev.metaKey,
                    });
                } else if (object instanceof Sound) {
                    this._editor.selectedSoundObservable.notifyObservers(object);
                } else if (object instanceof ParticleSystem) {
                    this._editor.selectedParticleSystemObservable.notifyObservers(object);
                }
            }
        }
    }

    /**
     * Called on the pointer is up with right button on the canvas.
     */
    private _onCanvasContextMenu(ev: MouseEvent, node: Nullable<Node>): void {
        // Isolated?
        if (this._editor.preview.state.isIsolatedMode) {
            return ContextMenu.show(
                <Menu className={Classes.DARK}>
                    <MenuItem text="Exit isolated mode" onClick={() => this._editor.preview.toggleIsolatedMode()} />
                </Menu>,
                { left: ev.clientX, top: ev.clientY }
            );
        }
        
        if (!node) { return; }

        const subMeshesItems: JSX.Element[] = [];
        if (node instanceof Mesh && node.subMeshes?.length && node.subMeshes.length > 1) {
            const multiMaterial = node.material && node.material instanceof MultiMaterial ? node.material : null;

            subMeshesItems.push(<MenuDivider />);
            subMeshesItems.push(<Code style={{ width: "100%" }}>Sub-Meshes:</Code>);

            node.subMeshes.forEach((sm, index) => {
                const material = multiMaterial && sm.getMaterial();
                const text = material ? (material.name ?? Tools.GetConstructorName(material)) : `Sub Mesh "${index}`;
                const key = `${(node as Mesh)!.id}-${index}`;
                const extraMenu = <MenuItem key={key} text={text} icon={<Icon src="vector-square.svg" />} onClick={() => this._editor.selectedSubMeshObservable.notifyObservers(sm)} />;
                subMeshesItems.push(extraMenu);
            });
        }

        let subMeshesItem = subMeshesItems.length ? (
            <div style={{ maxHeight: "300px", overflow: "auto" }}>
                {subMeshesItems}
            </div>
        ) : undefined;

        let isolatedMode = node instanceof AbstractMesh ? (
            <>
                <MenuDivider />
                <MenuItem text="Isolate..." onClick={() => this._editor.preview.toggleIsolatedMode(node)} />
            </>
        ) : undefined;

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <Pre>
                    "{node.name}" <b style={{ color: "grey" }}>({Tools.GetConstructorName(node)})</b>
                </Pre>
                <MenuDivider />
                <MenuItem text="Clone" disabled={node instanceof Sound || node instanceof ParticleSystem} icon={<Icon src="clone.svg" />} onClick={() => {
                    this._editor.graph.cloneObject(node!);
                    this._editor.graph.refresh();
                }} />
                {isolatedMode}
                <MenuItem text="Focus..." onClick={() => this._editor.preview.focusNode(node!, false)} />
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => {
                    this._editor.graph.removeObject(node!);
                    this._editor.graph.refresh();
                }} />
                {subMeshesItem}
            </Menu>,
            { left: ev.clientX, top: ev.clientY }
        );
    }

    /**
     * Called on the pointer moves on the canvas.
     */
    private _onCanvasMove(): void {
        let object = this.getObjectUnderPointer(false);

        if (object === this._lastSelectedNode) { return; }

        if (this._lastSelectedNode instanceof AbstractMesh) {
            this._lastSelectedNode.showBoundingBox = false;
            this._lastSelectedNode.showSubMeshesBoundingBox = false;
            this._lastSelectedNode.renderOverlay = false;
            this._lastSelectedNode = null;
        }

        if (!object) { return; }
        
        if (object instanceof SubMesh) { object = object.getMesh(); }

        if (object instanceof AbstractMesh) {
            object.showBoundingBox = true;
            object.showSubMeshesBoundingBox = true;

            if (this.drawOverlayOnOverElement) {
                object.renderOverlay = true;
                object.overlayAlpha = 0.3;
            }

            this._lastSelectedNode = object;
        }

        if (object._scene === this.icons._layer.utilityLayerScene) {
            this.onNodeOver.notifyObservers(object.metadata.node as Node);
        } else {
            this.onNodeOver.notifyObservers(object);
        }
    }
}
