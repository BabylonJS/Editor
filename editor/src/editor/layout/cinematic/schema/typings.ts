import { IAnimationKey } from "babylonjs";

export interface ICinematic {
    name: string;
    framesPerSecond: number;
    tracks: ICinematicTrack[];
}

export interface ICinematicTrack {
    animationGroups?: ICinematicAnimationGroup[];

    node?: any;
    propertyPath?: string;
    keyFrameAnimations?: (ICinematicKey | ICinematicKeyCut)[];
}

export interface ICinematicAnimationGroup {
    type: "group";
    name: string;
    frame: number;
}

export interface ICinematicKey extends IAnimationKey {
    type: "key" | "cut";
}

export interface ICinematicKeyCut {
    type: "cut";
    key1: IAnimationKey;
    key2: IAnimationKey;
}
