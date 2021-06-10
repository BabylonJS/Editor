import { ISimplificationSettings } from "babylonjs";

export class CollisionsSettings {
	/**
	 * Defines the reference to the simplifiction settings applied when the collisions
	 * type is set to "LOD".
	 */
	public static SimplificationSettings: ISimplificationSettings = {
		distance: 1,
		quality: 0.5,
		optimizeMesh: true,
	};
}