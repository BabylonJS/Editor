import { Animation, IAnimationKey } from "babylonjs";

import { Tools } from "../../../editor/tools/tools";

export class AnimationKeyObject {
    /**
     * Defines the reference to the animation.
     */
    public animation: Animation;
    /**
     * Defines the reference to the key.
     */
    public key: IAnimationKey;
    /**
     * Defines the index of the key in the animation's keys array.
     */
    public index: number;
    /**
     * Defines the callback called on the key has been modified.
     */
    public onChange: (key: IAnimationKey) => void;

    /**
     * @hidden
     */
    public _id: string = Tools.RandomId();

    /**
     * Constructor.
     * @param animation defines the reference to the animation.
     * @param key defines the reference to the key.
     * @param index defines the index of the key in the animation's keys array.
     * @param onChange defines the callback called on the key has been modified.
     */
    public constructor(animation: Animation, key: IAnimationKey, index: number, onChange: (key?: IAnimationKey) => void) {
        this.animation = animation;
        this.key = key;
        this.index = index;
        this.onChange = onChange;
    }
}
