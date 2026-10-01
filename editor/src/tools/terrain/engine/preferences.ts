// Engine preferences driven by the Terrain tab settings (inspector/terrain/settings.ts). The engine may not read those settings (§2.1
// rule 2), so the settings module pushes the values here at load and after every change. That import is a documented exception to
// §2.1 rule 3: this module imports nothing, so the settings module doesn't load the engine.

let decalsAutoReprojectEnabled = true;

/**
 * Enables or disables the automatic decal re-projection after each relief change (Settings → Dependents "Re-project decals after each
 * stroke", terrainSettings.view.autoReprojectDecals; default true). It only runs on terrains of at most 256 subdivisions (§6.13).
 * @param enabled defines whether decals are re-projected automatically.
 */
export function setTerrainDecalsAutoReprojectEnabled(enabled: boolean): void {
	decalsAutoReprojectEnabled = enabled;
}

/**
 * Returns whether the automatic decal re-projection is enabled (see setTerrainDecalsAutoReprojectEnabled).
 */
export function isTerrainDecalsAutoReprojectEnabled(): boolean {
	return decalsAutoReprojectEnabled;
}
