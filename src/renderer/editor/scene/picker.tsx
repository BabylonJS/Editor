import { Nullable, IStringDictionary } from "../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, MenuDivider, Classes } from "@blueprintjs/core";

import { Observable, Node, Vector2, PointerEventTypes, AbstractMesh, Vector3, Viewport, SubMesh } from "babylonjs";


import { Editor } from "../editor";
import { Icon } from "../gui/icon";

import { SceneSettings } from "./settings";

export class ScenePicker {
    /**
     * Notifies users when the 
     */
    public onNodeOver: Observable<Node> = new Observable<Node>();

    private _editor: Editor;
    private _downMousePosition: Vector2 = Vector2.Zero();
    private _lastSelectedNode: Nullable<Node> = null;

    private _cachedIconsElements: IStringDictionary<JSX.Element> = { };
    private _cachedIcons: IStringDictionary<Icon> = { };
    private _refHandler = {
        getIcon: (ref: Icon) => ref && (this._cachedIcons[ref.props.id!] = ref),
    };

    /**
     * Constructor.
     * @param editor the editor reference.
     */
    public constructor(editor: Editor) {
        this._editor = editor;

        this._bindCanvasEvents();
    }

    /**
     * Returns the current light icons.
     */
    public getNodesIcons(): JSX.Element[] {
        const result: JSX.Element[] = [];
        const viewport = new Viewport(0, 0, this._editor.engine!.getRenderWidth(), this._editor.engine!.getRenderHeight());
        
        this._editor.scene!.lights.forEach((l) => result.push(this._getNodeIcon(l, viewport, "lightbulb.svg")));
        this._editor.scene!.cameras.forEach((c) => {
            if (c === this._editor.scene!.activeCamera || c === SceneSettings.Camera) { return; }
            result.push(this._getNodeIcon(c, viewport, "camera.svg"));
        });

        return result;
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
        const scene = this._editor.scene!;
        const pick = scene.pick(scene.pointerX, scene.pointerY, undefined, fastCheck);
        
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
    private _onCanvasUp(ev: MouseEvent): void {
        const distance = Vector2.Distance(this._downMousePosition, new Vector2(ev.offsetX, ev.offsetY));
        if (distance > 2) { return; }

        if (ev.button === 2) { return this._onCanvasContextMenu(ev); }

        const object = this.getObjectUnderPointer(false);
        if (object) {
            if (object instanceof SubMesh) {
                this._editor.selectedSubMeshObservable.notifyObservers(object);
            } else {
                this._editor.selectedNodeObservable.notifyObservers(object);
            }
        }
    }

    /**
     * Called on the pointer is up with right button on the canvas.
     */
    private _onCanvasContextMenu(ev: MouseEvent): void {
        if (!this._lastSelectedNode) { return; }

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Clone" icon={<Icon src="clone.svg" />} onClick={() => {
                    this._editor.graph.cloneNode(this._lastSelectedNode!);
                    this._editor.graph.refresh();
                }} />
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => {
                    this._editor.graph.removeNode(this._lastSelectedNode!);
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
            this._lastSelectedNode = null;
        }

        if (object instanceof AbstractMesh) {
            object.showBoundingBox = true;
            object.showSubMeshesBoundingBox = true;
            this._lastSelectedNode = object;
        }

        this.onNodeOver.notifyObservers(object);
    }

    /**
     * Returns the icon element of the given node to be used as a gizmo in the preview canvas.
     */
    private _getNodeIcon(node: Node, viewport: Viewport, icon: string): JSX.Element {
        const translation = Vector3.Zero();
        node.getWorldMatrix().decompose(undefined, undefined, translation);

        const projection = Vector3.Project(translation, node.getWorldMatrix(), this._editor.scene!.getTransformMatrix(), viewport);

        const cachedIcon = this._cachedIcons[node.id];
        if (cachedIcon) {
            cachedIcon.setState({ style: { marginLeft: projection.x >> 0, marginTop: projection.y >> 0 } });
        } else {
            this._cachedIconsElements[node.id] = (
                <Icon
                    id={node.id}
                    ref={this._refHandler.getIcon}
                    key={node.id} src={icon}
                    style={{ width: "35px", height: "35px", position: "absolute" }}
                    onClick={(e) => this._handleIconClicked(node, e)}
                    onOver={(e) => {
                        (e.target as HTMLImageElement).style.borderStyle = "groove";
                        this.onNodeOver.notifyObservers(node);
                    }}
                    onLeave={(e) => (e.target as HTMLImageElement).style.borderStyle = ""}
                />
            );
        }

        return this._cachedIconsElements[node.id];
    }

    /**
     * Called on the user clicks on an icon.
     */
    private _handleIconClicked(node: Node, e: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        if (this._lastSelectedNode instanceof AbstractMesh) {
            this._lastSelectedNode.showBoundingBox = false;
            this._lastSelectedNode.showSubMeshesBoundingBox = false;
            this._lastSelectedNode = null;
        }

        this._lastSelectedNode = node;

        switch (e.button) {
            case 0: this._editor.selectedNodeObservable.notifyObservers(node); break;
            case 2: this._onCanvasContextMenu(e.nativeEvent); break;
            default: return;
        }

        e.stopPropagation();
    }
}
