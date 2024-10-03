import { ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut } from "./typings";

export function isCinematicKey(key: any): key is ICinematicKey {
    return key.type === "key";
}

export function isCinematicKeyCut(key: any): key is ICinematicKeyCut {
    return key.type === "cut";
}

export function isCinematicGroup(key: any): key is ICinematicAnimationGroup {
    return key.type === "group";
}
