/** Minimum snap step (two-decimal increments cannot be smaller than 0.01). */
export const gizmoSnapMinStep = 0.01;

const snapDecimalRoundFactor = 100;

export interface IGizmoSnapPreferences {
	translationEnabled: boolean;
	translationStep: number;
	rotationEnabled: boolean;
	rotationStepDegrees: number;
	scaleEnabled: boolean;
	scaleStep: number;
}

/**
 * Snap steps are stored and applied with at most two decimal places.
 */
export function roundGizmoSnapSteps(prefs: IGizmoSnapPreferences): IGizmoSnapPreferences {
	const roundStep = (value: number): number => {
		const clampedLow = Math.max(gizmoSnapMinStep, value);
		const rounded = Math.round(clampedLow * snapDecimalRoundFactor) / snapDecimalRoundFactor;
		return Math.max(gizmoSnapMinStep, rounded);
	};

	return {
		...prefs,
		translationStep: roundStep(prefs.translationStep),
		rotationStepDegrees: roundStep(prefs.rotationStepDegrees),
		scaleStep: roundStep(prefs.scaleStep),
	};
}

export const defaultGizmoSnapPreferences: IGizmoSnapPreferences = {
	translationEnabled: false,
	translationStep: 1,
	rotationEnabled: false,
	rotationStepDegrees: 15,
	scaleEnabled: false,
	scaleStep: 0.25,
};
