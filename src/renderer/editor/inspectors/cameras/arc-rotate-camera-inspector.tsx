import { ArcRotateCamera } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { CameraInspector } from "./camera-inspector";

export class ArcRotateCameraInspector extends CameraInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: ArcRotateCamera;

    private _lowerRadiusLimit: number = 0;
    private _upperRadiusLimit: number = 0;

    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();
        common.add(this.selectedObject, "noRotationConstraint").name("No Rotation Constraint");
        common.add(this.selectedObject, "wheelPrecision").min(0).step(0.1).name("Wheel Precision");

        common.add(this.selectedObject, "panningSensibility").name("Panning Sensibility");
        common.add(this.selectedObject, "angularSensibilityX").name("Angular Sensibility X");
        common.add(this.selectedObject, "angularSensibilityY").name("Angular Sensibility Y");

        return common;
    }

    /**
     * Adds the transform editable properties.
     * @override
     */
    protected addTransforms(): GUI {
        const transforms = super.addTransforms();
        this.addVector(this.tool!, "Rotation", this.selectedObject, "rotation");
        this.addVector(this.tool!, "Target", this.selectedObject, "target");
        this.addVector(this.tool!, "Panning Axis", this.selectedObject, "panningAxis");

        this.addRadius();
        this.addCollisions();

        return transforms;
    }

    /**
     * Adds the radius editable properties.
     */
    protected addRadius(): void {
        const radius = this.tool!.addFolder("Radius");
        radius.open();

        radius.add(this.selectedObject, "radius").min(0).name("Radius");

        this._lowerRadiusLimit = this.selectedObject.lowerRadiusLimit ?? 0;
        radius.add(this, "_lowerRadiusLimit").min(0).name("Lower Radius Limit").onChange(() => this.selectedObject.lowerRadiusLimit = this._lowerRadiusLimit);

        this._upperRadiusLimit = this.selectedObject.upperRadiusLimit ?? 0;
        radius.add(this, "_upperRadiusLimit").min(0).name("Upper Radius Limit").onChange(() => this.selectedObject.upperRadiusLimit = this._upperRadiusLimit);
    }

    /**
     * Adds the collisions editable properties.
     */
    protected addCollisions(): void {
        const collisions = this.tool!.addFolder("Collisions");
        collisions.open();
        
        collisions.add(this.selectedObject, "checkCollisions").name("Check Collisions");
        this.addVector(collisions, "Collisions Radius", this.selectedObject, "collisionRadius");
    }
}

Inspector.registerObjectInspector({
    ctor: ArcRotateCameraInspector,
    ctorNames: ["ArcRotateCamera"],
    title: "Arc Rotate Camera",
});
