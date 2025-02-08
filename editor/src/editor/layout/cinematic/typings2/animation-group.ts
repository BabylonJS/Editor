import { AnimationGroup } from "babylonjs";

export interface ICinematicAnimationGroupConfiguration2 {
    animationGroup: string | AnimationGroup;
    keys: ICinematicAnimationGroup2[];
}

export interface ICinematicAnimationGroup2 {
    frame: number;

    speed: number;

    start: number;
    end: number;
}
