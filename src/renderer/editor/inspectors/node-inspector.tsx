import * as React from "react";

import { Node } from "babylonjs";

import { IObjectInspectorProps } from "../components/inspector";

import { InspectorBoolean } from "../gui/inspector/boolean";
import { InspectorSection } from "../gui/inspector/section";
import { InspectorString } from "../gui/inspector/string";

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
                    <InspectorString object={this.selectedObject} property="name" label="Name" />
                    <InspectorBoolean object={this.state} property="enabled" label="Enabled" onChange={(v) => this._handleEnabledChange(v)} />
                </InspectorSection>

                {super.renderContent()}
            </>
        );
    }

    /**
     * Called on the node is set to enabled/disabled.
     */
    private _handleEnabledChange(enabled: boolean): void {
        this.setState({ enabled });

        this.selectedObject.setEnabled(enabled);
    }
}
