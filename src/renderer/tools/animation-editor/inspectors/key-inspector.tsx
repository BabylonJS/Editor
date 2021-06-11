import { Animation } from "babylonjs";
import { Inspector } from "../../../editor/components/inspector";
import { AbstractInspectorLegacy } from "../../../editor/inspectors/abstract-inspector-legacy";

import { AnimationKeyObject } from "../tools/animation-key-object";

export class AnimationKeyInspector extends AbstractInspectorLegacy<AnimationKeyObject> {
    /**
     * Called on a controller finished changes.
     * @override
     */
    public onControllerChange(): void {
        this.selectedObject.onChange(this.selectedObject.key);
    }

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.tool!.add(this.selectedObject.key, "frame").name("Frame").step(0.01);
        
        switch (this.selectedObject.animation.dataType) {
            case Animation.ANIMATIONTYPE_FLOAT:
                this.tool!.add(this.selectedObject.key, "value").name("Value").step(0.01);
                break;

            case Animation.ANIMATIONTYPE_VECTOR2:
            case Animation.ANIMATIONTYPE_VECTOR3:
                this.tool!.addVector("Value", this.selectedObject.key.value);
                break;

            case Animation.ANIMATIONTYPE_COLOR3:
            case Animation.ANIMATIONTYPE_COLOR4:
                this.addColor(this.tool!, "Value", this.selectedObject.key, "value");
                break;

            case Animation.ANIMATIONTYPE_QUATERNION:
                this.tool!.addVector("XYZ", this.selectedObject.key.value);
                this.tool!.add(this.selectedObject.key.value, "w").step(0.01);
                break;
        }
    }
}

Inspector.RegisterObjectInspector({
    ctor: AnimationKeyInspector,
    ctorNames: ["AnimationKeyObject"],
    title: "Animation Key",
});
