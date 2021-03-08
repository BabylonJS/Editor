import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { GUI } from "dat.gui";

import * as BABYLON from "babylonjs";
import { Animation, EasingFunction } from "babylonjs";

import { Tools } from "../../../editor/tools/tools";

import { AnimationObject } from "../tools/animation-object";

import { Inspector } from "../../../editor/components/inspector";
import { AbstractInspectorLegacy } from "../../../editor/inspectors/abstract-inspector-legacy";

import { AnimationRanges } from "./animation-ranges";

export class AnimationObjectInspector extends AbstractInspectorLegacy<AnimationObject> {
    private _loopMode: string = "";

    private _easingFolder: Nullable<GUI> = null;
    private _easingFunction: string = "";
    private _easingMode: string = "";

    /**
     * Called on a controller finished changes.
     * @override
     */
    public onControllerChange(): void {
        this.selectedObject.onChange(this.selectedObject.animation);
    }

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this._addCommon();
        this._addBlending();
        this._addEasing();
        this._addRanges();
    }

    /**
     * Adds the common editable properties.
     */
    private _addCommon(): void {
        const common = this.tool!.addFolder("Common");
        common.open();

        common.add(this.selectedObject.animation, "name").name("Name");
        common.add(this.selectedObject.animation, "framePerSecond").min(0).step(0.01).name("Frames Per Second");

        const loopModes: string[] = [
            "ANIMATIONLOOPMODE_CONSTANT",
            "ANIMATIONLOOPMODE_CYCLE",
            "ANIMATIONLOOPMODE_RELATIVE",
        ];
        this._loopMode = loopModes.find((lm) => this.selectedObject.animation.loopMode === Animation[lm]) ?? loopModes[0];
        common.addSuggest(this, "_loopMode", loopModes).name("Loop Mode").onChange(() => {
            this.selectedObject.animation.loopMode = Animation[this._loopMode];
        });
    }

    /**
     * Adds the blending editable properties.
     */
    private _addBlending(): void {
        const blending = this.tool!.addFolder("Blending");
        blending.open();

        this.selectedObject.animation.enableBlending = this.selectedObject.animation.enableBlending ?? false;

        blending.add(this.selectedObject.animation, "enableBlending").name("Enable Blending");
        blending.add(this.selectedObject.animation, "blendingSpeed").step(0.01).name("Blending Speed");
    }

    /**
     * Adds the easing editable properties.
     */
    private _addEasing(): void {
        if (this._easingFolder) {
            this.clearFolder(this._easingFolder);
        }

        this._easingFolder = this._easingFolder ?? this.tool!.addFolder("Easing");
        this._easingFolder.open();

        // Easing
        const easingFunction = this.selectedObject.animation.getEasingFunction() as Nullable<EasingFunction>;
        const easingFunctions: string[] = [
            "None",
            "CircleEase",
            "BackEase",
            "BounceEase",
            "CubicEase",
            "ElasticEase",
            "ExponentialEase",
            "PowerEase",
            "QuadraticEase",
            "QuarticEase",
            "QuinticEase",
            "SineEase",
            "BezierCurveEase",
        ];

        this._easingFunction = easingFunction ? Tools.GetConstructorName(easingFunction) : easingFunctions[0];
        this._easingFolder.addSuggest(this, "_easingFunction", easingFunctions).name("Function").onChange(() => {
            const easingFunction = this._easingFunction === easingFunctions[0] ? null : new BABYLON[this._easingFunction]();
            this.selectedObject.animation.setEasingFunction(easingFunction);

            this._addEasing();
        });

        if (!easingFunction) { return; }

        // Mode
        const easingModes: string[] = [
            "EASINGMODE_EASEIN",
            "EASINGMODE_EASEOUT",
            "EASINGMODE_EASEINOUT",
        ];

        this._easingMode = easingModes[easingFunction.getEasingMode()];
        this._easingFolder.addSuggest(this, "_easingMode", easingModes).name("Mode").onFinishChange(() => {
            easingFunction.setEasingMode(EasingFunction[this._easingMode]);
        });

        // Parameters
        // Set parameters
        switch (this._easingFunction) {
            case 'BackEase':
                this._easingFolder.add(easingFunction, "amplitude").name("Amplitude").step(0.01);
                break;
            case "BounceEase":
                this._easingFolder.add(easingFunction, "bounces").name("Bounces").step(0.01);
                this._easingFolder.add(easingFunction, "bounciness").name("Bounciness").step(0.01);
                break;
            case "ElasticEase":
                this._easingFolder.add(easingFunction, "oscillations").name("Oscillations").step(0.01);
                this._easingFolder.add(easingFunction, "springiness").name("Springiness").step(0.01);
                break;
            case "ExponentialEase":
                this._easingFolder.add(easingFunction, "exponent").name("Exponent").step(0.01);
                break;
            case "PowerEase":
                this._easingFolder.add(easingFunction, "power").name("Power").step(0.01);
                break;
            case "BezierCurveEase":
                this._easingFolder.add(easingFunction, "x1").name("x1").step(0.01);
                this._easingFolder.add(easingFunction, "y1").name("y1").step(0.01);
                this._easingFolder.add(easingFunction, "x2").name("x2").step(0.01);
                this._easingFolder.add(easingFunction, "y2").name("y2").step(0.01);
                break;
            default: break; // Should never happen
        }
    }

    /**
     * Adds all the ranges editable properties.
     */
    private _addRanges(): void {
        const ranges = this.tool!.addFolder("Ranges");
        ranges.open();

        ranges.addCustom("250px", (
            <AnimationRanges animation={this.selectedObject.animation} onRangeSelected={(r) => {
                while (ranges.__controllers.length > 1) {
                    ranges.remove(ranges.__controllers[1]);
                }

                if (r) {
                    ranges.add(r, "from").min(0).step(0.01);
                    ranges.add(r, "to").min(0).step(0.01);
                }
            }} />
        ), {
            marginLeft: "0px",
        });
    }
}

Inspector.RegisterObjectInspector({
    ctor: AnimationObjectInspector,
    ctorNames: ["AnimationObject"],
    title: "Animation",
});
