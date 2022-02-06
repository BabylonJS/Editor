import { Nullable } from "../../../shared/types";

import { Scene } from "babylonjs";
import { INodeOutputSlot, LGraphCanvas, LGraphNode, LiteGraph } from "litegraph.js";

import { ELinkErrorType, GraphNode } from "../../editor/graph/node";

declare module "litegraph.js" {
    interface LGraph {
        onNodeAdded?: (n: GraphNode) => void;

        add(graphOrGroup: GraphNode | LGraphGroup): void;
        remove(graphOrGroup: GraphNode | LGraphGroup): void;

        sendEventToAllNodes(event: string): void;

        scene?: Scene;
        workspaceDir?: string;
        hasPaused: boolean;
    }

    interface LGraphCanvas {
        read_only: boolean;
        notifyLinkError(errorType: ELinkErrorType): void;
        onNodeMoved?(node: GraphNode): void;
        onLinkAborted?(event: MouseEvent, node: GraphNode, targetSlot: number): void;
    }

    interface INodeInputSlot {
        /**
         * Defines the output linked to the input. When a link exists, the output
         * type becomes the input's type.
         */
        linkedOutput?: string;
        /**
         * Defines wether or not the input is removable.
         */
        removable?: boolean;
    }

    interface INodeOutputSlot {
        /**
         * Defines wether or not the output is removable.
         */
        removable?: boolean;
    }
}

/**
 * Triggers an slot event in this node.
 * @param slot the index of the output slot.
 * @param param defines the parameters to send to the target slot.
 * @param link_id in case you want to trigger and specific output link in a slot.
 */
LGraphNode.prototype.triggerSlot = async function (slot: number, param: any, link_id): Promise<void> {
    const promises: Promise<void>[] = [];

    if (!this.outputs) {
        return;
    }

    var output = this.outputs[slot];
    if (!output) {
        return;
    }

    var links = output.links;
    if (!links || !links.length) {
        return;
    }

    if (this.graph) {
        this.graph._last_trigger_time = LiteGraph.getTime();
    }

    //for every link attached here
    for (var k = 0; k < links.length; ++k) {
        var id = links[k];
        if (link_id != null && link_id != id) {
            //to skip links
            continue;
        }
        var link_info = this.graph.links[links[k]];
        if (!link_info) {
            //not connected
            continue;
        }
        link_info._last_time = LiteGraph.getTime();
        var node = this.graph.getNodeById(link_info.target_id);
        if (!node) {
            //node not found?
            continue;
        }

        //used to mark events in graph
        var target_connection = node.inputs[link_info.target_slot];

        if (node.onAction) {
            node.onAction(target_connection.name, param);
        } else if (node.mode === LiteGraph.ON_TRIGGER) {
            if (node.onExecute) {
                const p = node.onExecute(param);
                if (p instanceof Promise) {
                    promises.push(p);
                }
            }
        }
    }

    await Promise.all(promises);
}

/**
 * Overrides the mouse down event to add custom behavior.
 */
let connecting_slot: Nullable<number> = null;
let connecting_node: Nullable<GraphNode> = null;
let connecting_output: Nullable<INodeOutputSlot> = null;

const processMouseDown = LGraphCanvas.prototype.processMouseDown;
LGraphCanvas.prototype.processMouseDown = function (e) {
    const result = processMouseDown.call(this, e);
    connecting_node = this.connecting_node;
    connecting_slot = this.connecting_slot;
    connecting_output = this.connecting_output;

    return result;
};

/**
 * Overrides the mouse up event to add custom behavior.
 */
const processMouseUp = LGraphCanvas.prototype.processMouseUp;
LGraphCanvas.prototype.processMouseUp = function (e) {
    const result = processMouseUp.call(this, e);

    const node = this.graph.getNodeOnPos(e["canvasX"], e["canvasY"], this.visible_nodes);
    const slot = node ? this.isOverNodeInput(node, e["canvasX"], e["canvasY"]) : null;

    if (connecting_node && connecting_slot !== -1 && connecting_output?.type === (LiteGraph.EVENT as any) && !node && slot === null) {
        this.onLinkAborted?.(e, connecting_node, connecting_slot);
    }

    connecting_node = null;
    connecting_slot = null;
    connecting_output = null;

    return result;
};