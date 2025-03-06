import { IAnimationKey } from "babylonjs";
import { ICinematicKeyEventData } from "./event";

export interface ICinematic {
    name: string;
    framesPerSecond: number;
    tracks: ICinematicTrack[];

    outputFramesPerSecond: number;
}

export interface ICinematicTrack {
    animationGroup?: any;
    animationGroups?: ICinematicKeyAnimationGroup[];

    node?: any;
    defaultRenderingPipeline?: boolean;

    sound?: any;
    sounds?: ICinematicKeySound[];

    propertyPath?: string;
    keyFrameAnimations?: (ICinematicKey | ICinematicKeyCut)[];
    keyFrameEvents?: ICinematicKeyEvent[];
}

export interface ICinematicKeyAnimationGroup {
    type: "group";
    frame: number;

    speed: number;
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

export interface ICinematicKeyEvent {
    type: "event";
    frame: number;

    data?: ICinematicKeyEventData;
}

export interface ICinematicKeySound {
    type: "sound";

    frame: number;

    startFrame: number;
    endFrame: number;
}
