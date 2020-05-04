import { TransformNode } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../components/inspector";
import { NodeInspector } from "./node-inspector";

export class TransformNodeInspector extends NodeInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: TransformNode;

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addCommon();
        this.addScript();
        this.addTransforms();
    }

    /**
     * Adds the transforms editable properties.
     */
    protected addTransforms(): GUI {
        const transforms = this.tool!.addFolder("Transforms");
        transforms.open();
        transforms.addVector("Position", this.selectedObject.position);
        transforms.addVector("Rotation", this.selectedObject.rotation);
        transforms.addVector("Scaling", this.selectedObject.scaling);

        return transforms;
    }
}

Inspector.registerObjectInspector({
    ctor: TransformNodeInspector,
    ctorNames: ["TransformNode"],
    title: "Transform Node",
});
