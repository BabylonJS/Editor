import type { TerrainEligibility } from "../../../../tools/terrain/engine/types";

export type TerrainTabState = "playing" | "no-selection" | "ineligible" | "terrain";

export interface ITerrainTabStateInput {
	playing: boolean;
	isAbstractMesh: boolean;
	eligibility: TerrainEligibility | null;
}

/**
 * Pure state of the Terrain tab (§1.3), evaluated in this order and returning exactly one state:
 * - `playing`: the game is playing (the rest of the tab is inert);
 * - `no-selection`: the edited object is null, not an AbstractMesh (or a disposed/removed one), or its eligibility is unknown;
 * - `ineligible`: `eligibility.eligible === false` (reason message + fix button);
 * - `terrain`: an eligible terrain (full tool UI; read-only terrains included, the UI shows their banner).
 * @param input defines the play state, whether the edited object is a live AbstractMesh and its eligibility (getTerrainEligibility).
 */
export function getTerrainTabState(input: ITerrainTabStateInput): TerrainTabState {
	if (input.playing) {
		return "playing";
	}

	if (!input.isAbstractMesh || !input.eligibility) {
		return "no-selection";
	}

	return input.eligibility.eligible ? "terrain" : "ineligible";
}
