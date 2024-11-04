import { Animation, IAnimationKey } from "babylonjs";

export function cloneKey(dataType: number, key: IAnimationKey): IAnimationKey {
    let value: any;
    switch (dataType) {
        case Animation.ANIMATIONTYPE_FLOAT: value = key.value; break;
        default: value = key.value.clone(); break;
    }

    return {
        value,
        frame: key.frame,
        interpolation: key.interpolation,
        inTangent: dataType === Animation.ANIMATIONTYPE_FLOAT ? key.inTangent : key.inTangent?.clone(),
        outTangent: dataType === Animation.ANIMATIONTYPE_FLOAT ? key.outTangent : key.outTangent?.clone(),
    };
}
