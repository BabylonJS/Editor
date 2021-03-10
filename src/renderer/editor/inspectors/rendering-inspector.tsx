import * as React from "react";

import { Scene } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../components/inspector";

import { InspectorSection } from "../gui/inspector/section";

import { AbstractInspector } from "./abstract-inspector";

export class RenderingInspector extends AbstractInspector<Scene, { }> {
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
                <InspectorSection title="SSAO 2">

                </InspectorSection>
                <InspectorSection title="Motion Blur">
                    
                </InspectorSection>
            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: RenderingInspector,
    ctorNames: ["Scene"],
    title: "Rendering",
});
