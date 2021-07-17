import * as React from "react";

import { TransformNode } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../inspector";

import { InspectorSection } from "../../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../../gui/inspector/fields/vector3";

import { INodeInspectorState, NodeInspector } from "../node-inspector";

export class TransformNodeInspector extends NodeInspector<TransformNode, INodeInspectorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
     public constructor(props: IObjectInspectorProps) {
        super(props);
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>
                {super.renderContent()}

                <InspectorSection title="Transforms">
                    <InspectorVector3 object={this.selectedObject} property="position" label="Position" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="rotation" label="Rotation" step={0.01} />
                    <InspectorVector3 object={this.selectedObject} property="scaling" label="Scaling" step={0.01} />
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: TransformNodeInspector,
    ctorNames: ["TransformNode"],
    title: "Transform Node",
});
