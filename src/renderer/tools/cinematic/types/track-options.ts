import { ICinematicTrack } from "../../../editor/cinematic/base";

export interface ITrackOptions {
	/**
	 * Defines the reference to the cinematic track.
	 */
	track: ICinematicTrack;
	/**
	 * Defines wether or not the track is removable.
	 */
	removable: boolean;
}
