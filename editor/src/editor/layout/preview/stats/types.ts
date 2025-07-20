export type StatsValuesType = {
	averageFPS?: number;
	instantaneousFPS?: number;

	averageFrameTime?: number;
	instantaneousFrameTime?: number;

	activeFaces?: number;
	activeIndices?: number;
	activeBones?: number;
	activeParticles?: number;

	activeMeshes?: number;
	drawCalls?: number;

	totalVertices?: number;

	totalMeshes?: number;
	totalMaterials?: number;
	totalTextures?: number;
	totalLights?: number;

	gpuFrameTime?: number;
	gpuFrameTimeAvarage?: number;

	absoluteFPS?: number;
	render?: number;
	frameTotal?: number;
	interFrame?: number;

	meshSelection?: number;
	renderTargets?: number;
	animations?: number;
	particles?: number;
	physics?: number;
};
