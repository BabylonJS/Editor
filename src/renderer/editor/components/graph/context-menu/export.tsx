import * as React from "react";
import { MenuItem } from "@blueprintjs/core";

import { Mesh } from "babylonjs";

import { Editor } from "../../../editor";

import { SceneTools } from "../../../scene/tools";

import { isMesh } from "../tools/tools";

export interface IGraphContextMenuExportProps {
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
 * Defines the component used to export an object in a graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuExport(props: IGraphContextMenuExportProps) {
    if (!isMesh(props.object)) {
        return null;
    }

    return (
        <MenuItem text="Export">
            <MenuItem text="Babylon..." onClick={() => onExportBabylonJS(props.editor, props.object)} />
        </MenuItem>
    );
}

/**
 * Called on the user clicks the user wants to export as BabylonJS format.
 */
function onExportBabylonJS(editor: Editor, object: Mesh): void {
    SceneTools.ExportMeshToBabylonJSFormat(editor, object);
}
