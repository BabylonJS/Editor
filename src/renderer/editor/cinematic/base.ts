import { CinematicTrackType, ICinematicAnimationGroupTrack, ICinematicPropertyGroupTrack, ICinematicPropertyTrack, ICinematicTrackGroup } from "./track";

export interface ICinematicCamera {
	/**
	 * Defines the id of the camera used for the cinematic.
	 */
	cameraId: string;

	/**
	 * Defines the list of animation keys for camera's fov.
	 */
	fov: ICinematicTrack;
	/**
	 * Defines the list of animation keys for camera's position.
	 */
	position: ICinematicTrack;
	/**
	 * Defines the list of animation keys for camera's target.
	 */
	target: ICinematicTrack;

	/**
	 * Defines the list of animation keys for camera's DOF focus distance.
	 */
	focusDistance: ICinematicTrack;
	/**
	 * Defines the list of animation keys for camera's DOF F-Stop.
	 */
	fStop: ICinematicTrack;
	/**
	 * Defines the list of animation keys for camera's DOF focal length.
	 */
	focalLength: ICinematicTrack;
}

export interface ICinematicTrack {
	/**
	 * Defines the type of the cinematic track.
	 */
	type: CinematicTrackType;
	/**
	 * In case of group, defines the configuration of the group.
	 */
	group?: ICinematicTrackGroup;
	/**
	 * In case of property track, defines the configuration of the animated property.
	 */
	property?: ICinematicPropertyTrack;
	/**
	 * In case of property group track, defines the configuration of the animated property for multiple nodes.
	 */
	propertyGroup?: ICinematicPropertyGroupTrack;
	/**
	 * In case of animation group track, defines the configuration of the animation group.
	 */
	animationGroup?: ICinematicAnimationGroupTrack;
}

export interface ICinematic {
	/**
	 * Defines the name of the cinematic.
	 */
	name: string;
	/**
	 * Defines the number of frames computed per second for the cinematic.
	 */
	framesPerSecond: number;
	/**
	 * Defines wether or not the cinematic is embedded in the file scene file output.
	 */
	embedInSceneFile?: boolean;
	/**
	 * Defines the reference to the camera's configuration for the cinematic.
	 */
	camera: ICinematicCamera;
	/**
	 * Defines the list of all cinematic tracks.
	 */
	tracks: ICinematicTrack[];
}
