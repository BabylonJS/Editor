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
        this.addTransforms();
    }

    /**
     * Adds the transforms editable properties.
     */
    protected addTransforms(): GUI {
        const transforms = this.tool!.addFolder("Transforms");
        transforms.open();

        const position = transforms.addFolder("Position");
        position.open();
        position.add(this.selectedObject.position, "x").step(0.1);
        position.add(this.selectedObject.position, "y").step(0.1);
        position.add(this.selectedObject.position, "z").step(0.1);

        const rotation = transforms.addFolder("Rotation");
        rotation.open();
        rotation.add(this.selectedObject.rotation, "x").step(0.1);
        rotation.add(this.selectedObject.rotation, "y").step(0.1);
        rotation.add(this.selectedObject.rotation, "z").step(0.1);

        const scaling = transforms.addFolder("Scaling");
        scaling.open();
        scaling.add(this.selectedObject.scaling, "x").step(0.1);
        scaling.add(this.selectedObject.scaling, "y").step(0.1);
        scaling.add(this.selectedObject.scaling, "z").step(0.1);

        return transforms;
    }
}

Inspector.registerObjectInspector({
    ctor: TransformNodeInspector,
    ctorNames: ["TransformNode"],
    title: "Transform Node",
});
