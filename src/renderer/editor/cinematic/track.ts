import { IAnimationKey } from "babylonjs";
import { ICinematicTrack } from "./base";

export enum CinematicTrackType {
	Group = "group",
	Property = "property",
	PropertyGroup = "propertyGroup",
	AnimationGroup = "animationGroup",
}

export interface ICinematicTrackGroup {
	/**
	 * Defines the name of the group.
	 */
	name: string;
	/**
	 * Defines the array of tracks.
	 */
	tracks: ICinematicTrack[];
}

export interface ICinematicAnimationGroupSlot {
	/**
	 * Defines the position of the slot in the timeline expressed in pixels.
	 */
	position: number;
	/**
	 * Defines the end frame of the track in the animation group.
	 */
	end: number;
	/**
	 * Defines the start frame of the track in the animation group.
	 */
	start: number;
}

export interface ICinematicAnimationGroupTrack {
	/**
	 * Defines the name of the animation group to play.
	 */
	name: string;
	/**
	 * Defines the list of all animation group slots.
	 */
	slots: ICinematicAnimationGroupSlot[];
}

export interface ICinematicPropertyTrackBase {
	/**
	 * Define the path of the animated property.
	 */
	propertyPath: string;
	/**
	 * Defines the list of all animation keys.
	 */
	keys: IAnimationKey[];
	/**
	 * Defines the type of the property being animated (float, vector3, etc.).
	 * @see BABYLON.Animation.XType
	 */
	animationType: number;
}

export interface ICinematicPropertyTrack extends ICinematicPropertyTrackBase {
	/**
	 * Defines the id of the node being animated.
	 */
	nodeId: string;
}

export interface ICinematicPropertyGroupTrack extends ICinematicPropertyTrackBase {
	/**
	 * Defines the list of all nodes being animated.
	 */
	nodeIds: string[];
}
