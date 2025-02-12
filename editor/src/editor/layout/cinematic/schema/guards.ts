import { ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicSound } from "./typings";

export function isCinematicKey(key: any): key is ICinematicKey {
    return key.type === "key";
}

export function isCinematicKeyCut(key: any): key is ICinematicKeyCut {
    return key.type === "cut";
}

export function isCinematicGroup(key: any): key is ICinematicAnimationGroup {
    return key.type === "group";
}

export function isCinematicSound(key: any): key is ICinematicSound {
    return key.type === "sound";
}
