export const editorGizmoSnapStorageKey = "editor-gizmo-snap";

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

function clampPositive(value: number, fallback: number): number {
	if (!Number.isFinite(value) || value <= 0) {
		return fallback;
	}
	return value;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function loadGizmoSnapPreferences(): IGizmoSnapPreferences {
	try {
		const raw = localStorage.getItem(editorGizmoSnapStorageKey);
		if (!raw) {
			return roundGizmoSnapSteps({ ...defaultGizmoSnapPreferences });
		}
		const parsed = JSON.parse(raw) as Partial<IGizmoSnapPreferences>;
		const base = defaultGizmoSnapPreferences;
		return roundGizmoSnapSteps({
			translationEnabled: asBoolean(parsed.translationEnabled, base.translationEnabled),
			translationStep: clampPositive(asNumber(parsed.translationStep, base.translationStep), base.translationStep),
			rotationEnabled: asBoolean(parsed.rotationEnabled, base.rotationEnabled),
			rotationStepDegrees: clampPositive(asNumber(parsed.rotationStepDegrees, base.rotationStepDegrees), base.rotationStepDegrees),
			scaleEnabled: asBoolean(parsed.scaleEnabled, base.scaleEnabled),
			scaleStep: clampPositive(asNumber(parsed.scaleStep, base.scaleStep), base.scaleStep),
		});
	} catch {
		return roundGizmoSnapSteps({ ...defaultGizmoSnapPreferences });
	}
}

export function saveGizmoSnapPreferences(prefs: IGizmoSnapPreferences): void {
	localStorage.setItem(editorGizmoSnapStorageKey, JSON.stringify(roundGizmoSnapSteps(prefs)));
}
