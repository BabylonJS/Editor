import * as React from "react";

import { Node } from "babylonjs";

import { IObjectInspectorProps } from "../components/inspector";

import { InspectorBoolean } from "../gui/inspector/fields/boolean";
import { InspectorSection } from "../gui/inspector/fields/section";
import { InspectorString } from "../gui/inspector/fields/string";

import { undoRedo } from "../tools/undo-redo";

import { IScriptInspectorState, ScriptInspector } from "./script-inspector";

export interface INodeInspectorState extends IScriptInspectorState {
    /**
     * Defines weher or not the node is enabled.
     */
    enabled: boolean;
}

export class NodeInspector<T extends Node, S extends INodeInspectorState> extends ScriptInspector<T, S> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
     public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            ...this.state,
            enabled: this.selectedObject.isEnabled(),
        }
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                <InspectorSection title="Common">
                    <InspectorString object={this.selectedObject} property="name" label="Name" noUndoRedo={true} onFinishChange={(v, o) => this._handleNameChanged(v, o)} />
                    <InspectorBoolean object={this.state} property="enabled" label="Enabled" noUndoRedo={true} onFinishChange={(v, o) => this._handleEnabledChange(v, o)} />
                </InspectorSection>

                {super.renderContent()}
            </>
        );
    }

    /**
     * Called on the user changed the name of the node.
     */
    private _handleNameChanged(name: string, oldName: string): void {
        undoRedo.push({
            common: () => {
                this.forceUpdate();
                this.editor.graph.refresh();
            },
            undo: () => this.selectedObject.name = oldName,
            redo: () => this.selectedObject.name = name,
        })
        this.editor.graph.refresh();
    }

    /**
     * Called on the node is set to enabled/disabled.
     */
    private _handleEnabledChange(enabled: boolean, wasEnabled: boolean): void {
        undoRedo.push({
            common: () => this.forceUpdate(),
            undo: () => this.selectedObject.setEnabled(wasEnabled),
            redo: () => this.selectedObject.setEnabled(enabled),
        });
    }
}
