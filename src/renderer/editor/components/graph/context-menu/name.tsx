import * as React from "react";
import { Classes, Pre } from "@blueprintjs/core";

import { ReflectionProbe } from "babylonjs";

import { Editor } from "../../../editor";

import { Tools } from "../../../tools/tools";
import { undoRedo } from "../../../tools/undo-redo";

import { EditableText } from "../../../gui/editable-text";

import { isSound } from "../tools/tools";

export interface IGraphContextMenuNameProps {
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
 * Defines the component used to rename a node in the graph.
 * @param props defines the component's props.
 */
export function GraphContextMenuName(props: IGraphContextMenuNameProps) {
    return (
        <Pre>
            <p style={{ color: "white", marginBottom: "0px" }}>Name</p>
            <EditableText
                multiline
                intent="primary"
                selectAllOnFocus
                confirmOnEnterKey
                className={Classes.FILL}
                disabled={isSound(props.object)}
                value={props.object.name ?? Tools.GetConstructorName(props.object)}
                onConfirm={(v) => {
                    const oldName = props.object!.name;
                    undoRedo.push({
                        description: `Changed name of node "${props.object?.name ?? "undefined"}" from "${oldName}" to "${v}"`,
                        common: () => {
                            props.editor.graph.refresh();

                            if (props.object instanceof ReflectionProbe) {
                                props.editor.assets.refresh();
                            }
                        },
                        redo: () => {
                            props.object!.name = v;
                            if (props.object instanceof ReflectionProbe) {
                                props.object.cubeTexture.name = v;
                            }
                        },
                        undo: () => {
                            props.object!.name = oldName;
                            if (props.object instanceof ReflectionProbe) {
                                props.object.cubeTexture.name = oldName;
                            }
                        },
                    });
                }}
            />
        </Pre>
    );
}
