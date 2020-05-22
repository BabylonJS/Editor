import * as React from "react";
import { ContextMenu, Classes, Menu, MenuItem, MenuDivider } from "@blueprintjs/core";

import { LGraphNode, LGraphGroup } from "litegraph.js";

import { Icon } from "../../editor/gui/icon";

import GraphEditorWindow from "./index";

export class GraphContextMenu {
    /**
     * Shows the context menu when a node is right-clicked.
     * @param node defines the node that is being right-clicked.
     * @param event defines the mouse event.
     * @param editor defines the reference to the graph editor.
     */
    public static ShowNodeContextMenu(node: LGraphNode, event: MouseEvent, editor: GraphEditorWindow): void {
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Clone" icon={<Icon src="plus.svg" />} onClick={() => editor.cloneNode(node)} />
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => editor.removeNode(node)} />
            </Menu>,
            { left: event.clientX, top: event.clientY }
        );
    }

    /**
     * Shows the context menu when a group is right-clicked.
     * @param group defines the group that is being right-clicked.
     * @param event defines the mouse event.
     * @param editor defines the reference to the graph editor.
     */
    public static ShowGroupContextMenu(group: LGraphGroup, event: MouseEvent, editor: GraphEditorWindow): void {
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => editor.removeGroup(group)} />
            </Menu>,
            { left: event.clientX, top: event.clientY }
        );
    }

    /**
     * Shows the context menu when the canvas is right-clicked.
     * @param event defines the mouse event.
     * @param editor defines the reference to the graph editor.
     */
    public static ShowGraphContextMenu(event: MouseEvent, editor: GraphEditorWindow): void {
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Add Node..." icon={<Icon src="plus.svg" />} onClick={() => editor.addNode(event)} />
                <MenuItem text="Add Group" icon={<Icon src="plus.svg" />} onClick={() => editor.addGroup(event)} />
            </Menu>,
            { left: event.clientX, top: event.clientY }
        );
    }
}
