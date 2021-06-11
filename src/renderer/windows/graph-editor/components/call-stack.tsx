import * as React from "react";
import { Classes, Tree, ITreeNode, Callout, Intent, Tooltip, ButtonGroup, Button, Pre, Position } from "@blueprintjs/core";

import { LiteGraph } from "litegraph.js";

import { Icon } from "../../../editor/gui/icon";
import { GraphNode } from "../../../editor/graph/node";
import { NodeUtils } from "../../../editor/graph/utils";

import GraphEditorWindow from "../index";

export interface ICallStackProps {
    /**
     * Defines the reference to the editor's window main class.
     */
    editor: GraphEditorWindow;
}

export interface ICallStackState {
    /**
     * Defines the list of all tree nodes.
     */
    nodes: ITreeNode<GraphNode>[];
}

export class CallStack extends React.Component<ICallStackProps, ICallStackState> {
    private _editor: GraphEditorWindow;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: ICallStackProps) {
        super(props);

        this.state = { nodes: [] };
        
        this._editor = props.editor;
        this._editor.callStack = this;
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        let tree: React.ReactNode;
        let empty: React.ReactNode;

        if (this.state.nodes.length) {
            tree = (
                <Tree
                    contents={this.state.nodes}
                    onNodeDoubleClick={(n) => this._handleNodeDoubleClick(n)}
                    onNodeClick={(n) => this._handleNodeClick(n)}
                    className={Classes.DARK}
                />
            );
        } else {
            empty = (
                <Callout title="Call Stack" style={{ height: "100%" }} intent={Intent.PRIMARY} icon="info-sign">
                    <p>This panel (Call Stack) draws the current call stack when a debugger is set on the graph.</p>
                </Callout>
            );
        }

        return (
            <>
                <div className="bp3-dark" style={{ width: "100%", height: "30px", backgroundColor: "#444444" }}>
                    <ButtonGroup>
                        <Button disabled={!this.state.nodes.length} icon={<Icon src="play.svg" />} text="Resume" onClick={() => NodeUtils.ResumeExecution()} />
                    </ButtonGroup>
                </div>
                <div style={{ width: "100%", height: "calc(100% - 30px)", overflow: "auto" }}>
                    {empty}
                    {tree}
                </div>
            </>
        );
    }

    /**
     * Clears the call stack.
     */
    public clear(): void {
        this.setState({ nodes: [] });
    }
    
    /**
     * Refreshes the current call stack.
     */
    public refresh(): void {
        const nodes: ITreeNode<GraphNode>[] = [];

        if (!NodeUtils.PausedNode) {
            return this.setState({ nodes });
        }
        
        // Exit locks
        const engine = this._editor.preview.engine;
        if (engine) {
            if (engine.isPointerLock) { engine.exitPointerlock(); }
            if (engine.isFullscreen) { engine.exitFullscreen(); }
        }

        const graph = this._editor.graph.graph!;
        const ancestors = graph.getAncestors(NodeUtils.PausedNode);

        const all = ancestors.filter((n) => n.mode === LiteGraph.ON_TRIGGER) as GraphNode[];
        all.push(NodeUtils.PausedNode);

        all.reverse().forEach((n, index) => {
            const isLast = index === 0;

            const inputs = n.inputs.map((i, index) => {
                if (i.type === LiteGraph.EVENT as any) {
                    return (<h2 style={{ color: "white", left: "50%" }} key={`node-title-${index}`}>{n.title}</h2>);
                }

                const input = n.getInputData(index);
                let inputDetails = input?.toString();
                if (inputDetails === "[object Object]") {
                    if (input.serialize) {
                        inputDetails = JSON.stringify(input.serialize(), null, "\t");
                    } else {
                        try {
                            inputDetails = JSON.stringify(input, null, "\t");
                        } catch (e) {
                            inputDetails = `(Error): ${e.message}`;
                        }
                    }
                }
                return (<Pre key={`input-info-${index}`}>{i.name}: {inputDetails ?? "No input"}</Pre>);
            });

            const content = (
                <div style={{ width: "400px" }}>{inputs}</div>
            );

            nodes.push({
                id: n.id,
                hasCaret: false,
                icon: isLast ? "arrow-right" : undefined,
                secondaryLabel: (
                    <Tooltip key="node-inputs" content={content} interactionKind="hover" usePortal={true} position={Position.TOP} >
                        <Icon src="eye.svg" />
                    </Tooltip>
                ),
                isSelected: isLast,
                label: n.title,
                isExpanded: false,
                childNodes: [],
                nodeData: n,
            });
        });

        this.setState({ nodes });
    }

    /**
     * Called on a node is double clicked.
     */
    private _handleNodeDoubleClick(node: ITreeNode<GraphNode>): void {
        if (!node.nodeData) { return; }

        node.nodeData.focusOn();
    }

    /**
     * Called on a node is clicked.
     */
    private _handleNodeClick(node: ITreeNode<GraphNode>): void {
        this.state.nodes.forEach((n) => n.isSelected = false);
        node.isSelected = true;

        this.setState({ nodes: this.state.nodes });
    }
}
