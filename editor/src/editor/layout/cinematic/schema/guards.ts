import { ICinematicKeyAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicKeyEvent, ICinematicKeySound } from "./typings";

export function isCinematicKey(key: any): key is ICinematicKey {
    return key.type === "key";
}

export function isCinematicKeyCut(key: any): key is ICinematicKeyCut {
    return key.type === "cut";
}

export function isCinematicKeyEvent(key: any): key is ICinematicKeyEvent {
    return key.type === "event";
}

export function isCinematicGroup(key: any): key is ICinematicKeyAnimationGroup {
    return key.type === "group";
}

export function isCinematicSound(key: any): key is ICinematicKeySound {
    return key.type === "sound";
}
