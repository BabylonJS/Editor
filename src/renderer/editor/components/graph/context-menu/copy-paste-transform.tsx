import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { MenuDivider, MenuItem } from "@blueprintjs/core";

import { Quaternion, Vector3 } from "babylonjs";

import { Editor } from "../../../editor";

import { undoRedo } from "../../../tools/undo-redo";

import { isAbstractMesh, isCamera, isDirectionalLight, isLight, isNode, isPointLight, isSpotLight, isTargetCamera, isTransformNode } from "../tools/tools";

export interface IGraphContextMenuCopyPasteTransformProps {
    /**
     * Defines the reference to the object to rename.
     */
    object: any;
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
}

/**
 * Defines the component used to configure transforms of a node in a graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuCopyPasteTransform(props: IGraphContextMenuCopyPasteTransformProps) {
    if (!isNode(props.object)) {
        return null;
    }

    const selectedNodes = props.editor.graph.state.selectedNodes.filter((n) => isNode(n.nodeData)).map((n) => n.nodeData) as Node[];

    return (
        <>
            <MenuItem text="Copy Transform" onClick={() => onCopyTransform(props.object)} />
            <MenuItem text="Paste Transform" disabled={transform === null}>
                <MenuItem text="All" onClick={() => onPasteTransform(props.editor, selectedNodes)} />
                <MenuDivider />
                {getTransformItems(props.editor, props.object, selectedNodes)}
            </MenuItem>
        </>
    );
}

/**
 * Returns the list of all menu items avaiable to paste transform.
 */
function getTransformItems(editor: Editor, object: any, objects: any[]): React.ReactNode[] {
    if (!transform) {
        return [];
    }

    const result: React.ReactNode[] = [];

    if (transform.position && object.position) {
        result.push(<MenuItem text="Position" onClick={() => onPasteTransform(editor, objects, "position")} />);
    }
    if ((transform.rotation || transform.rotationQuaternion) && (object.rotation || object.rotationQuaternion)) {
        result.push(<MenuItem text="Rotation" onClick={() => {
            onPasteTransform(editor, objects, "rotation");
            onPasteTransform(editor, objects, "rotationQuaternion");
        }} />);
    }
    if (transform.scaling && object.scaling) {
        result.push(<MenuItem text="Scaling" onClick={() => onPasteTransform(editor, objects, "scaling")} />);
    }

    if (transform.direction && object.direction) {
        result.push(<MenuItem text="Direction" onClick={() => onPasteTransform(editor, objects, "direction")} />);
    }

    if (transform.target && object.target) {
        result.push(<MenuItem text="Target" onClick={() => onPasteTransform(editor, objects, "target")} />);
    }

    return result;
}

interface _ICopiedTransform {
    position?: Vector3;
    scaling?: Vector3;

    rotation?: Vector3;
    rotationQuaternion?: Quaternion;

    target?: Vector3;
    direction?: Vector3;
}

let transform: Nullable<_ICopiedTransform> = null;

/**
 * Called on the user clicks the "Copy Transform" menu item.
 */
function onCopyTransform(object: any): void {
    transform = null;

    if (isAbstractMesh(object) || isTransformNode(object)) {
        transform = {
            position: object.position.clone(),
            scaling: object.scaling.clone(),

            rotation: object.rotation.clone(),
            rotationQuaternion: object.rotationQuaternion?.clone(),
        };
        return;
    }

    if (isLight(object)) {
        if (isPointLight(object)) {
            transform = {
                position: object.position.clone(),
            };
            return;
        }

        if (isDirectionalLight(object) || isSpotLight(object)) {
            transform = {
                position: object.position.clone(),
                direction: object.direction.clone(),
            };
            return;
        }
    }

    if (isCamera(object)) {
        transform = {
            position: object.position.clone(),
        };

        if (isTargetCamera(object)) {
            transform.target = object.target.clone();
        }
        return;
    }
}

/**
 * Called on the user clicks the "Paste Transform" menu item.
 */
function onPasteTransform(editor: Editor, objects: any[], property: string = ""): void {
    if (!transform) {
        return;
    }

    const savedValues = objects.map((o) => ({
        position: o.position?.clone(),
        scaling: o.scaling?.clone(),

        rotation: o.rotation?.clone(),
        rotationQuaternion: o.rotationQuaternion?.clone(),

        direction: o.direction?.clone(),
        target: o.target?.clone(),
    } as _ICopiedTransform));

    undoRedo.push({
        common: () => editor.inspector.forceUpdate(),
        undo: () => objects.forEach((o, index) => pasteTransform(o, savedValues[index], property)),
        redo: () => objects.forEach((o) => pasteTransform(o, transform!, property)),
    });

    editor.inspector.forceUpdate();
}

function pasteTransform(object: any, transformObject: _ICopiedTransform, property: string): void {
    if (property && transformObject![property] && object[property]) {
        return object[property].copyFrom(transformObject![property]);
    }

    // Abstract Mesh
    object.position?.copyFrom(transformObject!.position ?? object.position);
    object.scaling?.copyFrom(transformObject!.scaling ?? object.scaling);

    object.rotation?.copyFrom(transformObject!.rotation ?? object.rotation);
    object.rotationQuaternion?.copyFrom(transformObject!.rotationQuaternion ?? object.rotationQuaternion);

    // Light
    object.direction?.copyFrom(transformObject!.direction ?? object.direction);

    // Camera
    object.target?.copyFrom(transformObject!.target ?? object.target);
}
