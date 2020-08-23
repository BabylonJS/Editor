import { Scene } from "babylonjs";
import { LGraphNode, LiteGraph } from "litegraph.js";

import { ELinkErrorType, GraphNode } from "../../editor/graph/node";

declare module "litegraph.js" {
    interface LGraph {
        onNodeAdded?: (n: GraphNode) => void;

        add(graphOrGroup: GraphNode | LGraphGroup): void;
        remove(graphOrGroup: GraphNode | LGraphGroup): void;

        sendEventToAllNodes(event: string): void;

        hasPaused: boolean;
        scene?: Scene;
    }

    interface LGraphCanvas {
        read_only: boolean;
        notifyLinkError(errorType: ELinkErrorType): void;
        onNodeMoved?(node: GraphNode): void;
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
}

/**
 * Triggers an slot event in this node.
 * @param slot the index of the output slot.
 * @param param defines the parameters to send to the target slot.
 * @param link_id in case you want to trigger and specific output link in a slot.
 */
LGraphNode.prototype.triggerSlot = async function(slot: number, param: any, link_id): Promise<void> {
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