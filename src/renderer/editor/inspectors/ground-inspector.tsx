import * as React from "react";

import { GroundMesh } from "babylonjs";

import { Inspector } from "../components/inspector";

import { AbstractInspector } from "./abstract-inspector";

export class GroundInspector extends AbstractInspector<GroundMesh, { }> {
    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <>

            </>
        );
    }
}

Inspector.RegisterObjectInspector({
    ctor: GroundInspector,
    ctorNames: ["GroundMesh"],
    title: "Ground Mesh",
});
