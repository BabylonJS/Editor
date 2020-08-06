import { Nullable } from "../../../../shared/types";

import { ArcRotateCamera } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { CameraInspector } from "./camera-inspector";

export class ArcRotateCameraInspector extends CameraInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: ArcRotateCamera;

    private _limitsFolder: Nullable<GUI> = null;
    private _radiusFolder: Nullable<GUI> = null;

    private _hasAlphaLimit: boolean = false;
    private _hasRadiusLimit: boolean = false;

    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();
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
        transforms.addVector("Target", this.selectedObject.target);
        transforms.addVector("Panning Axis", this.selectedObject.panningAxis);

        this.addMovements();
        this.addRadius();
        this.addLimits();
        this.addCollisions();

        return transforms;
    }

    /**
     * Adds the movements editable properties.
     */
    protected addMovements(): void {
        const movements = this.tool!.addFolder("Movements");
        movements.open();

        movements.add(this.selectedObject, "wheelPrecision").min(0).step(0.01).name("Wheel Precision");
        movements.add(this.selectedObject, "pinchPrecision").min(0).step(0.01).name("Pinch Precision");

        movements.add(this.selectedObject, "panningSensibility").name("Panning Sensibility");
        movements.add(this.selectedObject, "angularSensibilityX").name("Angular Sensibility X");
        movements.add(this.selectedObject, "angularSensibilityY").name("Angular Sensibility Y");
    }

    /**
     * Adds the limits editable properties.
     */
    protected addLimits(): void {
        this._limitsFolder = this._limitsFolder ?? this.tool!.addFolder("Limits");
        this._limitsFolder.open();

        // Beta
        this._limitsFolder.add(this.selectedObject, "lowerBetaLimit").min(0).step(0.01).name("Lower Beta Limit");
        this._limitsFolder.add(this.selectedObject, "upperBetaLimit").min(0).step(0.01).name("Upper Beta Limit");

        // Alpha
        this._hasAlphaLimit = this.selectedObject.lowerAlphaLimit !== null && this.selectedObject.upperAlphaLimit !== null;
        this._limitsFolder.add(this, "_hasAlphaLimit").name("Has Alpha Limits").onFinishChange(() => {
            this.selectedObject.lowerAlphaLimit = this._hasAlphaLimit ? 0 : null;
            this.selectedObject.upperAlphaLimit = this._hasAlphaLimit ? 0 : null;

            this.clearFolder(this._limitsFolder!);
            this.addLimits();
        });

        if (this._hasAlphaLimit) {
            this._limitsFolder.add(this.selectedObject, "lowerAlphaLimit").min(0).step(0.01).name("Lower Alpha Limit");
            this._limitsFolder.add(this.selectedObject, "upperAlphaLimit").min(0).step(0.01).name("Upper Alpha Limit");
        }
    }

    /**
     * Adds the radius editable properties.
     */
    protected addRadius(): void {
        this._radiusFolder = this._radiusFolder ?? this.tool!.addFolder("Radius");
        this._radiusFolder.open();

        this._radiusFolder.add(this.selectedObject, "radius").min(0).step(0.01).name("Radius");

        this._hasRadiusLimit = this.selectedObject.lowerRadiusLimit !== null && this.selectedObject.lowerRadiusLimit !== null;
        this._radiusFolder.add(this, "_hasRadiusLimit").name("Has Radius Limits").onFinishChange(() => {
            this.selectedObject.lowerRadiusLimit = this._hasRadiusLimit ? 0 : null;
            this.selectedObject.upperRadiusLimit = this._hasRadiusLimit ? 0 : null;

            this.clearFolder(this._radiusFolder!);
            this.addRadius();
        });

        if (this._hasRadiusLimit) {
            this._radiusFolder.add(this.selectedObject, "lowerRadiusLimit").min(0).step(0.01).name("Lower Radius Limit");
            this._radiusFolder.add(this.selectedObject, "upperRadiusLimit").min(0).step(0.01).name("Upper Radius Limit");
        }
    }

    /**
     * Adds the collisions editable properties.
     */
    protected addCollisions(): void {
        const collisions = this.tool!.addFolder("Collisions");
        collisions.open();
        
        collisions.add(this.selectedObject, "checkCollisions").name("Check Collisions");
        collisions.addVector("Collisions Radius", this.selectedObject.collisionRadius);
    }
}

Inspector.RegisterObjectInspector({
    ctor: ArcRotateCameraInspector,
    ctorNames: ["ArcRotateCamera"],
    title: "Arc Rotate Camera",
});
