import { Nullable } from "../../../shared/types";

import * as React from "react";
import { ContextMenu, Classes, Menu, MenuItem, MenuDivider, Divider } from "@blueprintjs/core";

import { LGraphGroup, LLink } from "litegraph.js";

import { Icon } from "../../editor/gui/icon";

import { Graph } from "./components/graph";

export class GraphContextMenu {
    /**
     * Shows the context menu when a node is right-clicked.
     * @param event defines the mouse event.
     * @param editor defines the reference to the graph editor.
     */
    public static ShowNodeContextMenu( event: MouseEvent, editor: Graph): void {
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Clone" icon={<Icon src="plus.svg" />} onClick={() => editor.cloneNode()} />
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => editor.removeNode()} />
            </Menu>,
            { left: event.clientX, top: event.clientY }
        );
    }

    /**
     * Shows the context menu when the canvas is right-clicked.
     * @param event defines the mouse event.
     * @param editor defines the reference to the graph editor.
     * @param group defines the group that is under the pointer.
     */
    public static ShowGraphContextMenu(event: MouseEvent, editor: Graph, group: Nullable<LGraphGroup>): void {
        let groupItem: React.ReactNode;
        if (group) {
            groupItem = (
                <>
                    <Divider />
                    <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => editor.removeGroup(group)} />
                </>
            );
        }
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Add Node..." icon={<Icon src="plus.svg" />} onClick={() => editor.addNode(event)} />
                <MenuItem text="Add Group" icon={<Icon src="plus.svg" />} onClick={() => editor.addGroup(event)} />
                {groupItem}
            </Menu>,
            { left: event.clientX, top: event.clientY }
        );
    }

    /**
     * Shows the context menu when the canvas is right-clicked on a link.
     * @param link defines the link that is under the pointer.
     * @param event defines the mouse event.
     * @param editor defines the reference to the graph editor.
     */
    public static ShowLinkContextMenu(link: LLink, event: MouseEvent, editor: Graph): void {
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => editor.removeLink(link)} />
            </Menu>,
            { left: event.clientX, top: event.clientY }
        );
    }
}
