import * as React from "react";

import { Camera } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../inspector";

import { InspectorNumber } from "../../../gui/inspector/fields/number";
import { InspectorSection } from "../../../gui/inspector/fields/section";

import { INodeInspectorState, NodeInspector } from "../node-inspector";
import { InspectorList } from "../../../gui/inspector/fields/list";

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
            </>
        );
    }

    /**
     * Returns the inspector used to edit the camera's properties.
     */
    protected getCameraInspector(): React.ReactNode {
        return (
            <InspectorSection title="Camera">
                <InspectorNumber object={this.selectedObject} property="minZ" label="Min Z" step={0.01} />
                <InspectorNumber object={this.selectedObject} property="maxZ" label="Max Z" step={0.01} />
                <InspectorNumber object={this.selectedObject} property="inertia" label="Inertia" step={0.01} />

                <InspectorSection title="FOV">
                    <InspectorNumber object={this.selectedObject} property="fov" label="FOV" step={0.01} />
                    <InspectorList object={this.selectedObject} property="fovMode" label="Mode" items={[
                        { label: "Horitzontal", data: Camera.FOVMODE_HORIZONTAL_FIXED },
                        { label: "Vertical", data: Camera.FOVMODE_VERTICAL_FIXED },
                    ]} />
                </InspectorSection>
            </InspectorSection>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: CameraInspector,
    ctorNames: ["Camera"],
    title: "Camera",
});
