import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { MenuItem } from "@blueprintjs/core";

import { Node } from "babylonjs";

import { Editor } from "../../../editor";

import { Icon } from "../../../gui/icon";

import { Tools } from "../../../tools/tools";

import { isAbstractMesh, isCamera, isLight, isNode, isTransformNode } from "../tools/tools";

export interface IGraphContextMenuCloneProps {
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
 * Defines the component used to clone objects in a graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuClone(props: IGraphContextMenuCloneProps) {
    if (!isNode(props.object)) {
        return null;
    }

    return (
        <MenuItem text="Clone" icon={<Icon src="clone.svg" />} onClick={() => onClick(props.editor, props.object)} />
    );
}

/**
 * Called on the user clicks the menu item.
 */
function onClick(editor: Editor, object: Node): void {
    const clone = getClone(object);
    if (!clone) {
        return;
    }

    clone.id = Tools.RandomId();

    if (isAbstractMesh(clone)) {
        if (clone.parent) {
            clone.physicsImpostor?.forceUpdate();
        }

        clone.physicsImpostor?.sleep();
    }

    // Metadata
    const metadata = { ...clone.metadata };
    delete metadata._waitingUpdatedReferences;

    clone.metadata = Tools.CloneObject(metadata);

    // Refresh and select
    editor.graph.refresh(() => {
        editor.selectedNodeObservable.notifyObservers(clone);
    });
}

function getClone(object: Node): Nullable<Node> {
    if (isAbstractMesh(object)) {
        return object.clone(object.name, object.parent, true, true);
    }

    if (isTransformNode(object)) {
        return object.clone(object.name, object.parent, true);
    }

    if (isLight(object)) {
        return object.clone(object.name, object.parent);
    }

    if (isCamera(object)) {
        return object.clone(object.name, object.parent);
    }

    return null;
}
