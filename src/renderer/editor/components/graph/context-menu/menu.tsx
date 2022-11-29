import * as React from "react";
import { Classes, ContextMenu, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";

import { Node } from "babylonjs";

import { Editor } from "../../../editor";

import { Icon } from "../../../gui/icon";

import { isNode } from "../tools/tools";

import { GraphContextMenuName } from "./name";
import { GraphContextMenuLock } from "./lock";
import { GraphContextMenuFocus } from "./focus";
import { GraphContextMenuLight } from "./light";
import { GraphContextMenuClone } from "./clone";
import { GraphContextMenuExport } from "./export";
import { GraphContextMenuRemove } from "./remove";
import { GraphContextMenuCutPast } from "./cut-paste";
import { GraphContextMenuMergeMeshes } from "./merge-meshes";
import { GraphContextMenuDoNotExport } from "./do-not-export";
import { GraphContextMenuClearThinInstances } from "./thin-instances";
import { GraphContextMenuCopyPasteTransform } from "./copy-paste-transform";

export class GraphContextMenu {
    /**
     * Shows the context menu of the given object right-clicked in the graph.
     * @param event defines the reference to the mouse right-click event.
     * @param editor defines the reference to the editor.
     * @param object defines the reference to the right-clicked node in the graph.
     */
    public static Show(event: MouseEvent, editor: Editor, object: Node): void {
        const menus: React.ReactNode[] = [];

        if (isNode(object)) {
            menus.push.apply(menus, [
                <MenuItem text="Add" icon={<Icon src="plus.svg" />}>
                    {editor.mainToolbar.getAddMenuItems(object)}
                </MenuItem>,
                <MenuItem text="Add Mesh" icon={<Icon src="plus.svg" />}>
                    {editor.mainToolbar.getAddMeshMenuItem(object)}
                </MenuItem>,
                <MenuDivider />
            ]);
        }

        const clone = GraphContextMenuClone({ editor, object });
        if (clone) {
            menus.push(clone, <MenuDivider />);
        }

        const focus = GraphContextMenuFocus({ editor, object });
        if (focus) {
            menus.push(focus, <MenuDivider />);
        }

        const cutPaste = GraphContextMenuCutPast({ editor, object });
        if (cutPaste) {
            menus.push(cutPaste, <MenuDivider />);
        }

        const copyPasteTransform = GraphContextMenuCopyPasteTransform({ editor, object });
        if (copyPasteTransform) {
            menus.push(copyPasteTransform, <MenuDivider />);
        }

        const light = GraphContextMenuLight({ editor, object });
        if (light) {
            menus.push(light, <MenuDivider />);
        }

        const lock = GraphContextMenuLock({ editor, object });
        const doNotExport = GraphContextMenuDoNotExport({ editor, object });
        if (lock || doNotExport) {
            menus.push(lock, doNotExport, <MenuDivider />);
        }

        const exportAs = GraphContextMenuExport({ editor, object });
        if (exportAs) {
            menus.push(exportAs, <MenuDivider />);
        }

        const mergeMeshes = GraphContextMenuMergeMeshes({ editor, object });
        const clearThinInstances = GraphContextMenuClearThinInstances({ editor, object });
        if (mergeMeshes || clearThinInstances) {
            menus.push(mergeMeshes, clearThinInstances, <MenuDivider />);
        }

        const remove = GraphContextMenuRemove({ editor, object });
        if (remove) {
            menus.push(remove);
        }

        ContextMenu.show((
            <Menu className={Classes.DARK}>
                <GraphContextMenuName editor={editor} object={object} />
                <MenuDivider />

                {menus.filter((m) => m)}
            </Menu>
        ), {
            top: event.clientY,
            left: event.clientX,
        });
    }
}
