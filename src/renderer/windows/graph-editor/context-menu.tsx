import { Nullable } from "../../../shared/types";

import * as React from "react";
import { ContextMenu, Classes, Menu, MenuItem, MenuDivider, Divider } from "@blueprintjs/core";

import { LGraphGroup, LLink } from "litegraph.js";

import { Icon } from "../../editor/gui/icon";
import { Dialog } from "../../editor/gui/dialog";

import { undoRedo } from "../../editor/tools/undo-redo";

import { Graph } from "./components/graph";
import { GraphNode } from "../../editor/graph/node";

export class GraphContextMenu {
    /**
     * Shows the context menu when a node is right-clicked.
     * @param event defines the mouse event.
     * @param editor defines the reference to the graph editor.
     */
    public static ShowNodeContextMenu(event: MouseEvent, editor: Graph): void {
        let extraOptions: JSX.Element[] = [];
        
        const selectedNodes = Object.keys(editor.graphCanvas!.selected_nodes);
        if (selectedNodes.length === 1) {
            const node = editor.graphCanvas!.selected_nodes[selectedNodes[0]] as GraphNode;
            if (node.getContextMenuOptions) {
                extraOptions = node.getContextMenuOptions().map((o) => (
                    <MenuItem text={o.label} onClick={() => o.onClick()} />
                ));
                extraOptions.splice(0, 0, <MenuDivider />);
            }
        }

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Clone" icon={<Icon src="plus.svg" />} onClick={() => editor.cloneNode()} />
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => editor.removeNode()} />
                {extraOptions}
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

    /**
     * Shows the context menu when a slot is right-clicked.
     * @param node defines the reference to the node containing the clicked slot.
     * @param slot defines the index of the slot being clicked.
     * @param event defines the mouse event.
     */
    public static ShowSlotContextMenu(node: GraphNode, slot: number, event: MouseEvent): void {
        ContextMenu.show(
            <Menu>
                <MenuItem text="Rename Slot..." onClick={async () => {
                    const newName = await Dialog.Show("Input Name", "Please provide the new name of the input");
                    const oldName = node.inputs[slot].name;
                    const input = node.inputs[slot];

                    undoRedo.push({
                        common: () => {
                            node.computeSize();
                            node.setDirtyCanvas(true, true);
                        },
                        undo: () => input.name = oldName,
                        redo: () => input.name = newName,
                    });
                }} />
                <MenuItem text="Remove Slot" icon={<Icon src="times.svg" />} onClick={() => {
                    const input = node.inputs[slot];

                    undoRedo.push({
                        common: () => {
                            node.computeSize();
                            node.setDirtyCanvas(true, true);
                        },
                        undo: () => node.inputs.push(input),
                        redo: () => node.inputs.splice(node.inputs.indexOf(input)),
                    });
                }} />
            </Menu>,
            { left: event.clientX, top: event.clientY }
        );
    }
}
