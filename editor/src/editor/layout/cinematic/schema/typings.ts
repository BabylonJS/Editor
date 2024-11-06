import { IAnimationKey } from "babylonjs";

export interface ICinematic {
    name: string;
    framesPerSecond: number;
    tracks: ICinematicTrack[];
}

export interface ICinematicTrack {
    animationGroup?: any;
    animationGroups?: ICinematicAnimationGroup[];

    node?: any;
    defaultRenderingPipeline?: boolean;

    propertyPath?: string;
    keyFrameAnimations?: (ICinematicKey | ICinematicKeyCut)[];
}

export interface ICinematicAnimationGroup {
    type: "group";
    frame: number;

    startFrame: number;
    endFrame: number;
}

export interface ICinematicKey extends IAnimationKey {
    type: "key" | "cut";
}

export interface ICinematicKeyCut {
    type: "cut";
    key1: IAnimationKey;
    key2: IAnimationKey;
}
