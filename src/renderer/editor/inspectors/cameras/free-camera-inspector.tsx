import { FreeCamera, UniversalCamera } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { CameraInspector } from "./camera-inspector";

export class FreeCameraInspector extends CameraInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: FreeCamera | UniversalCamera;

    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();
        common.add(this.selectedObject, "speed").min(0).step(0.01).name("Speed");
        common.add(this.selectedObject, "noRotationConstraint").name("No Rotation Constraint");

        return common;
    }

    /**
     * Adds the transform editable properties.
     * @override
     */
    protected addTransforms(): GUI {
        const transforms = super.addTransforms();
        transforms.addVector("Rotation", this.selectedObject.rotation);

        this.addCollisions();

        return transforms;
    }

    /**
     * Adds the collisions editable properties.
     */
    protected addCollisions(): void {
        const collisions = this.tool!.addFolder("Collisions");
        collisions.open();
        
        collisions.add(this.selectedObject, "checkCollisions").name("Check Collisions");
        collisions.add(this.selectedObject, "applyGravity").name("Apply Gravity");

        collisions.addVector("Ellipsoid", this.selectedObject.ellipsoid);
        collisions.addVector("Ellipsoid Offset", this.selectedObject.ellipsoidOffset);
    }
}

Inspector.registerObjectInspector({
    ctor: FreeCameraInspector,
    ctorNames: ["FreeCamera", "UniversalCamera"],
    title: "Free Camera",
});
