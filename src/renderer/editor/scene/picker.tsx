import { Nullable } from "../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, Classes } from "@blueprintjs/core";

import {
    Observable, Node, Vector2, PointerEventTypes, AbstractMesh, SubMesh, Sound,
    ParticleSystem,
} from "babylonjs";

import { Editor } from "../editor";

import { SceneIcons } from "./icons";
import { SceneSettings } from "./settings";

import { GraphContextMenu } from "../components/graph/context-menu";

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

        if (!ev.ctrlKey) {
            this._editor.scene!.meshes.forEach((m) => m.isPickable = false);
        }
    }

    /**
     * Called on the pointer is up on the canvas.
     */
    private _onCanvasUp(ev: MouseEvent, byPassDistance: boolean = false): void {
        this._editor.scene!.meshes.forEach((m) => {
            if (!m._masterMesh && !m.metadata?.collider) {
                m.isPickable = true;
            }
        });

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

        this._editor.graph.setSelected(node, ev.ctrlKey || ev.metaKey);
        
        GraphContextMenu.Show(ev, this._editor, node);
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
