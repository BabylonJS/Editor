import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { MenuDivider, MenuItem } from "@blueprintjs/core";

import { Quaternion, Vector3 } from "babylonjs";

import { Editor } from "../../../editor";

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

    return (
        <>
            <MenuItem text="Copy Transform" onClick={() => onCopyTransform(props.object)} />
            <MenuItem text="Paste Transform" disabled={transform === null}>
                <MenuItem text="All" onClick={() => onPasteTransform(props.editor, props.object)} />
                <MenuDivider />
                {getTransformItems(props.editor, props.object)}
            </MenuItem>
        </>
    );
}

/**
 * Returns the list of all menu items avaiable to paste transform.
 */
function getTransformItems(editor: Editor, object: any): React.ReactNode[] {
    if (!transform) {
        return [];
    }

    const result: React.ReactNode[] = [];

    if (transform.position && object.position) {
        result.push(<MenuItem text="Position" onClick={() => onPasteTransform(editor, object)} />);
    }
    if ((transform.rotation || transform.rotationQuaternion) && (object.rotation || object.rotationQuaternion)) {
        result.push(<MenuItem text="Rotation" onClick={() => onPasteTransform(editor, object)} />);
    }
    if (transform.scaling && object.scaling) {
        result.push(<MenuItem text="Scaling" onClick={() => onPasteTransform(editor, object)} />);
    }

    if (transform.direction && object.direction) {
        result.push(<MenuItem text="Direction" onClick={() => onPasteTransform(editor, object)} />);
    }

    if (transform.target && object.target) {
        result.push(<MenuItem text="Target" onClick={() => onPasteTransform(editor, object)} />);
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
function onPasteTransform(editor: Editor, object: any): void {
    if (!transform) {
        return;
    }

    // Abstract Mesh
    object.position?.copyFrom(transform.position ?? object.position);
    object.scaling?.copyFrom(transform.scaling ?? object.scaling);

    object.rotation?.copyFrom(transform.rotation ?? object.rotation);
    object.rotationQuaternion?.copyFrom(transform.rotationQuaternion ?? object.rotationQuaternion);

    // Light
    object.direction?.copyFrom(transform.direction ?? object.direction);

    // Camera
    object.target?.copyFrom(transform.target ?? object.target);

    editor.inspector.forceUpdate();
}
