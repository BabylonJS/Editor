import { LLink, LGraphGroup, LiteGraph } from "litegraph.js";

import { Alert } from "../../editor/gui/alert";
import { Confirm } from "../../editor/gui/confirm";

import { Tools } from "../../editor/tools/tools";

import { GraphNode } from "../../editor/graph/node";

import { Graph } from "./components/graph";

import { IGraphEditorTemplate } from "./index";

export class GraphEditorTemplate {
    /**
     * Refreshes the current list of available graph templates.
     */
    public static async GetTemplatesList(): Promise<IGraphEditorTemplate[]> {
        const templates = await Tools.LoadFile<string>("http://editor.babylonjs.com/templates/graphs/templates.json", false);
        return JSON.parse(templates);
    }

    /**
     * Applies the given template in the given graph handler.
     * @param template defines the reference to the template to add.
     * @param graphHandler defines the reference to the graph handler.
     */
    public static async ApplyTemplate(template: IGraphEditorTemplate, graphHandler: Graph): Promise<void> {
        const override = await Confirm.Show("Apply template?", `Are you sure to apply the template "${template.name}"? All current work will be overwritten.`);
        if (!override) { return; }

        if (!graphHandler.graph) { return; }

        try {
            const content = await Tools.LoadFile<string>(`http://editor.babylonjs.com/templates/graphs/${template.file}`, false);

            const json = JSON.parse(content);
            const graph = graphHandler.graph!;

            const nodes: GraphNode[] = [];
            const links: LLink[] = [];
            const groups: LGraphGroup[] = [];

            let minX = Infinity;
            let minY = -Infinity;

            const allNodes = graphHandler.getAllNodes();
            allNodes.forEach((n) => {
                if (n.pos[0] < minX) { minX = n.pos[0]; }
                if (n.pos[1] + n.size[1] > minY) { minY = n.pos[1] + n.size[1]; }
            });

            minY += 20;
            minX = minX >> 0;
            minY = minY >> 0;

            // Create links
            json.links?.forEach((l) => {
                const link = new LiteGraph.LLink(l.id, l.type, l.origin_id, l.origin_slot, l.target_id, l.target_slot);
                link.configure(l);

                links.push(link);
            });

            // Configure links
            links.forEach((l) => {
                let id = l.id;
                while (graph.links[id] || links.find((l2) => l2 !== l && l2.id === id)) {
                    id++;
                }

                json.nodes?.forEach((n) => {
                    n.inputs?.forEach((i) => {
                        if (i.link === l.id) { i.link = id; }
                    });

                    n.outputs?.forEach((o) => {
                        // if (o === id) { n.outputs[index] = id; }
                        o.links?.forEach((l2, index) => {
                            if (l2 === l.id) { o.links[index] = id; }
                        });
                    });
                })

                l.id = id;
            });
            
            // Register links
            links.forEach((l) => graph.links[l.id] = l);

            // Create nodes
            json.nodes?.forEach((n) => {
                const node = LiteGraph.createNode(n.type, n.title, { }) as GraphNode;
                node.configure(n);
                node.pos[0] += minX;
                node.pos[1] += minY;

                nodes.push(node);
            });

            // Create groups
            json.groups?.forEach((g) => {
                const group = new LGraphGroup();
                group.configure(g);
                group.move(minX, minY);

                groups.push(group);
            });

            // Configure Ids
            nodes.forEach((n) => {
                let id = n.id;
                while (graph.getNodeById(id) || nodes.find((n2) => n2 !== n && n2.id === id)) {
                    id++;
                }

                links.forEach((l) => {
                    if (l.origin_id === n.id) { l.origin_id = id; }
                    if (l.target_id === n.id) { l.target_id = id; }
                });

                n.id = id;
            });

            // Add to graph
            nodes.forEach((n) => graph.add(n, true));
            groups.forEach((g) => graph.add(g));

            graph.updateExecutionOrder();
            graph.setDirtyCanvas(true, true);

            if (nodes.length) {
                (graph.getNodeById(nodes[0].id) as GraphNode)?.focusOn();
            }
        } catch (e) {
            Alert.Show("Failed To Apply Template", e.message);
        }
    }
}
