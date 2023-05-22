import * as React from "react";
import { MenuItem } from "@blueprintjs/core";

import { AbstractMesh, MultiMaterial } from "babylonjs";

import { Editor } from "../../../editor";

export interface IGraphContextMenuSubMeshesProps {
    /**
     * Defines the reference to the object that may contain the sub-meshes.
     */
    object: any;
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
}

/**
 * Defines the component used to edit sub-meshes of a mesh.
 * @param props defines the component's props.
 */
export function GraphContextMenuSubMeshes(props: IGraphContextMenuSubMeshesProps) {
    if (!(props.object instanceof AbstractMesh) || (props.object.subMeshes?.length ?? 0) < 2) {
        return null;
    }

    const isMultiMaterial = props.object.material instanceof MultiMaterial;

    return (
        <MenuItem text="Sub-Meshes">
            {props.object.subMeshes.map((sm, index) => (
                <MenuItem
                    key={index}
                    text={`Sub-Mesh ${index}`}
                    onClick={() => props.editor.inspector.setSelectedObject(sm)}
                    label={isMultiMaterial ? props.object.material.subMaterials?.[index]?.name : undefined}
                />
            ))}
        </MenuItem>
    );
}
