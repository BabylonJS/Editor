import { Animation } from "babylonjs";

import { Tools } from "../../../editor/tools/tools";

export class AnimationObject {
    /**
     * Defines the reference to the animation to edit.
     */
    public animation: Animation;
    /**
     * Defines the callback called on the animation changed.
     */
    onChange: (animation: Animation) => void;

    /**
     * @hidden
     */
    public _id: string = Tools.RandomId();

    /**
     * Constructor.
     * @param animation defines the reference to the animation to edit.
     */
    public constructor(animation: Animation, onChange: (animation: Animation) => void) {
        this.animation = animation;
        this.onChange = onChange;
    }
}
