import { Camera } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { NodeInspector } from "../node-inspector";

export class CameraInspector extends NodeInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: Camera;

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
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();
        common.add(this.selectedObject, "fov").step(0.01).name("FOV");
        common.add(this.selectedObject, "minZ").step(0.01).name("Min Z");
        common.add(this.selectedObject, "maxZ").step(0.01).name("Max Z");
        common.add(this.selectedObject, "inertia").step(0.01).name("Inertia");

        return common;
    }

    /**
     * Adds the transform editable properties.
     */
    protected addTransforms(): GUI {
        return this.addVector(this.tool!, "Position", this.selectedObject, "position");
    }
}

Inspector.registerObjectInspector({
    ctor: CameraInspector,
    ctorNames: ["Camera"],
    title: "Camera",
});
