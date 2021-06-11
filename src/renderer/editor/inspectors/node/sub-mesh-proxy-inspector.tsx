import * as React from "react";

import { SubMesh } from "babylonjs";

import { Inspector } from "../../components/inspector";

import { Tools } from "../../tools/tools";

import { AbstractInspector } from "../abstract-inspector";
import { MeshInspector } from "./mesh-inspector";

export class SubMeshProxyInspector extends AbstractInspector<SubMesh, { }> {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <MeshInspector _objectRef={this.selectedObject.getMesh()} editor={this.editor} toolId={Tools.RandomId()} />;
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return undefined;
    }
}

Inspector.RegisterObjectInspector({
    ctor: SubMeshProxyInspector,
    ctorNames: ["SubMesh"],
    title: "Mesh",
});
