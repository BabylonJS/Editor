import { IAnimationKey } from "babylonjs";

export interface ICinematicKeyFrameConfiguration2 {
    node: string | unknown;
    defaultRenderingPipeline?: boolean;

    propertyPath: string;

    keys: (ICinematicKeyFrame2 | ICinematicKeyCutFrame2)[];
}

export interface ICinematicKeyFrame2 {
    type: "key";
    key?: IAnimationKey;
}

export interface ICinematicKeyCutFrame2 {
    type: "cut";
    key1?: IAnimationKey;
    key2?: IAnimationKey;
}
