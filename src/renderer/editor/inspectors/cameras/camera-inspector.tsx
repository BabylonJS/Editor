import * as React from "react";

import { Camera } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../components/inspector";

import { InspectorNumber } from "../../gui/inspector/number";
import { InspectorSection } from "../../gui/inspector/section";

import { INodeInspectorState, NodeInspector } from "../node-inspector";

export class CameraInspector<T extends Camera, S extends INodeInspectorState> extends NodeInspector<T, S> {
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

                <InspectorSection title="Camera">
                    <InspectorNumber object={this.selectedObject} property="fov" label="FOV" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="minZ" label="Min Z" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="maxZ" label="Max Z" step={0.01} />
                    <InspectorNumber object={this.selectedObject} property="inertia" label="Inertia" step={0.01} />
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: CameraInspector,
    ctorNames: ["Camera"],
    title: "Camera",
});
