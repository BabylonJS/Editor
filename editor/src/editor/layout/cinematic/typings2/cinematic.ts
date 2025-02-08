import { ICinematicTrack2 } from "./track";

export interface ICinematic2 {
    name: string;
    tracks: ICinematicTrack2[];

    fps: number;
    outputFps: number;
}
