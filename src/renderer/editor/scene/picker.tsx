import { Nullable } from "../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, MenuDivider, Classes } from "@blueprintjs/core";

import { Observable, Node, Vector2, PointerEventTypes, AbstractMesh, SubMesh } from "babylonjs";

import { Editor } from "../editor";
import { Icon } from "../gui/icon";

import { SceneIcons } from "./icons";

export class ScenePicker {
    /**
     * Notifies users when the 
     */
    public onNodeOver: Observable<Node> = new Observable<Node>();

    private _editor: Editor;
    private _icons: SceneIcons;

    private _downMousePosition: Vector2 = Vector2.Zero();
    private _lastSelectedNode: Nullable<Node> = null;

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    public constructor(editor: Editor) {
        this._editor = editor;
        this._icons = new SceneIcons(editor);

        this._bindCanvasEvents();
    }

    /**
     * Resets the picker.
     */
    public reset(): void {
        this._lastSelectedNode = null;
    }

    /**
     * Returns the reference of the mesh that is under the pointer.
     * @param fastCheck Launch a fast check only using the bounding boxes. Can be set to null.
     */
    public getObjectUnderPointer(fastCheck: boolean = false): Nullable<Node | SubMesh> {
        // Icons
        let scene = this._icons._layer.utilityLayerScene;
        let pick = scene.pick(scene.pointerX, scene.pointerY, undefined, false);

        if (pick?.pickedMesh) { return pick.pickedMesh; }

        // Scene
        scene = this._editor.scene!;
        pick = scene.pick(scene.pointerX, scene.pointerY, undefined, fastCheck);
        
        if (!pick) { return null; }

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
        this._icons.onClickObservable.add((event) => {
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
    }

    /**
     * Called on the pointer is up on the canvas.
     */
    private _onCanvasUp(ev: MouseEvent, byPassDistance: boolean = false): void {
        if (!byPassDistance) {
            const distance = Vector2.Distance(this._downMousePosition, new Vector2(ev.offsetX, ev.offsetY));
            if (distance > 2) { return; }
        }

        let object = this.getObjectUnderPointer(false);
        
        if (ev.button === 2) {
            if (object instanceof SubMesh) { object = object.getMesh(); }
            if (object!._scene === this._icons._layer.utilityLayerScene) { object = object!.metadata.node as Node; }
            return this._onCanvasContextMenu(ev, object);
        }

        if (object) {
            if (object instanceof SubMesh) {
                this._editor.selectedSubMeshObservable.notifyObservers(object);
            } else {
                if (object._scene === this._icons._layer.utilityLayerScene) {
                    object = object.metadata.node as Node;
                }

                if (object instanceof Node) {
                    this._editor.selectedNodeObservable.notifyObservers(object);
                } else {
                    this._editor.selectedParticleSystemObservable.notifyObservers(object);
                }
            }
        }
    }

    /**
     * Called on the pointer is up with right button on the canvas.
     */
    private _onCanvasContextMenu(ev: MouseEvent, node: Nullable<Node>): void {
        if (!node) { return; }

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Clone" icon={<Icon src="clone.svg" />} onClick={() => {
                    this._editor.graph.cloneObject(node!);
                    this._editor.graph.refresh();
                }} />
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => {
                    this._editor.graph.removeObject(node!);
                    this._editor.graph.refresh();
                }} />
            </Menu>,
            { left: ev.clientX, top: ev.clientY }
        );
    }

    /**
     * Called on the pointer moves on the canvas.
     */
    private _onCanvasMove(): void {
        let object = this.getObjectUnderPointer(false);
        if (!object) { return; }
        if (object instanceof SubMesh) { object = object.getMesh(); }

        if (this._lastSelectedNode instanceof AbstractMesh) {
            this._lastSelectedNode.showBoundingBox = false;
            this._lastSelectedNode.showSubMeshesBoundingBox = false;
            this._lastSelectedNode.renderOverlay = false;
            this._lastSelectedNode = null;
        }

        if (object instanceof AbstractMesh) {
            object.showBoundingBox = true;
            object.showSubMeshesBoundingBox = true;
            object.renderOverlay = true;
            object.overlayAlpha = 0.3;
            this._lastSelectedNode = object;
        }

        if (object._scene === this._icons._layer.utilityLayerScene) {
            this.onNodeOver.notifyObservers(object.metadata.node as Node);
        } else {
            this.onNodeOver.notifyObservers(object);
        }
    }
}
