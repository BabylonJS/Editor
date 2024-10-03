import { ICinematic } from "../schema/typings";

export function serializeCinematic(cinematic: ICinematic): ICinematic {
    return {
        name: cinematic.name,
        framesPerSecond: cinematic.framesPerSecond,
        tracks: [], // TODO: serialize tracks
    };
}
