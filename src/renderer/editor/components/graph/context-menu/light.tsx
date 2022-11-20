import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { MenuDivider, MenuItem } from "@blueprintjs/core";

import { AbstractMesh, Light } from "babylonjs";

import { Editor } from "../../../editor";

import { undoRedo } from "../../../tools/undo-redo";

import { isLight } from "../tools/tools";

export interface IGraphContextMenuLightProps {
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
 * Defines the component used to configure lights in a graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuLight(props: IGraphContextMenuLightProps) {
    if (!isLight(props.object)) {
        return null;
    }

    return (
        <MenuItem text="Light">
            <MenuItem text="Copy Excluded Meshes" onClick={() => onCopyExcludedMeshes(props.object)} />
            <MenuDivider />
            <MenuItem text="Paste Excluded Meshes" disabled={excludedMeshes === null} onClick={() => onPasteExcludedMeshes(props.editor, props.object)} />
            <MenuItem text="Paste Included Meshes" disabled={excludedMeshes === null} onClick={() => onPasteIncludedMeshes(props.editor, props.object)} />
            <GraphContextMenuShadowLight editor={props.editor} object={props.object} />
        </MenuItem>
    );
}

let excludedMeshes: Nullable<AbstractMesh[]> = null;
let shadowsIncludedMeshes: Nullable<AbstractMesh[]> = null;

/**
 * Called on the user clicks the "Copy Excluded Meshes" menu item.
 */
function onCopyExcludedMeshes(object: Light): void {
    excludedMeshes = object.excludedMeshes.slice();
}

/**
 * Called on the user clicks the "Paste Excluded Meshes" menu item.
 */
function onPasteExcludedMeshes(editor: Editor, object: Light): void {
    if (!excludedMeshes) {
        return;
    }

    object.excludedMeshes ??= [];

    excludedMeshes.forEach((m) => {
        if (!object.excludedMeshes.find((m2) => m2 === m)) {
            object.excludedMeshes.push(m);
        }
    });

    editor.inspector.forceUpdate();
}

/**
 * Called on the user clicks on the "Paste Included Meshes" menu item.
 */
function onPasteIncludedMeshes(editor: Editor, object: Light): void {
    if (!excludedMeshes) {
        return;
    }

    object.excludedMeshes ??= [];

    const meshes = editor.scene!.meshes.filter((m) => !m._masterMesh && !excludedMeshes!.find((m2) => m2 === m));
    meshes.forEach((m) => {
        if (!object.excludedMeshes.find((m2) => m2 === m)) {
            object.excludedMeshes.push(m);
        }
    });

    editor.inspector.forceUpdate();
}

/**
 * Defines the component used to configure the shadow light in a graph.
 */
function GraphContextMenuShadowLight(props: IGraphContextMenuLightProps) {
    if (!isLight(props.object) || !props.object.getShadowGenerator()?.getShadowMap()?.renderList) {
        return null;
    }

    return (
        <>
            <MenuDivider title="Shadows" />
            <MenuItem text="Copy Included Meshes" onClick={() => onCopyShadowsIncludedMeshes(props.object)} />
            <MenuItem text="Paste Included Meshes" disabled={shadowsIncludedMeshes === null} onClick={() => onPasteShadowsIncludedMeshes(props.editor, props.object)} />
        </>
    );
}

/**
 * Called on the user clicks the shadow's "Copy Included Meshes" menu item.
 */
function onCopyShadowsIncludedMeshes(object: Light): void {
    shadowsIncludedMeshes = object.getShadowGenerator()?.getShadowMap()?.renderList?.slice() ?? null;
}

/**
 * Called on the user clicks the shadow's "Paste Included Meshes" menu item.
 */
function onPasteShadowsIncludedMeshes(editor: Editor, object: Light): void {
    const renderList = getShadowsRenderList(object);

    if (!shadowsIncludedMeshes || !renderList) {
        return;
    }

    const oldRenderList = renderList.slice();
    const oldShadowsIncludedMeshes = shadowsIncludedMeshes.slice();

    undoRedo.push({
        common: () => {
            editor.inspector.forceUpdate();
        },
        undo: () => {
            const renderList = getShadowsRenderList(object);
            if (renderList) {
                renderList.splice(0);
                oldRenderList.forEach((m) => renderList.push(m));
            }
        },
        redo: () => {
            const renderList = getShadowsRenderList(object);
            if (renderList) {
                oldShadowsIncludedMeshes.forEach((m) => {
                    if (!renderList.find((m2) => m2 === m)) {
                        renderList.push(m);
                    }
                });
            }
        },
    });
}

function getShadowsRenderList(object: Light): Nullable<AbstractMesh[]> {
    return object.getShadowGenerator()?.getShadowMap()?.renderList ?? null;
}
