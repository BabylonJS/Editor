import { ICinematicKeyFrameConfiguration2 } from "./keyframe";
import { ICinematicAnimationGroupConfiguration2 } from "./animation-group";

export interface ICinematicTrack2 {
    keyFrames?: ICinematicKeyFrameConfiguration2;
    animationGroup?: ICinematicAnimationGroupConfiguration2;

    actions?: any[];
}
