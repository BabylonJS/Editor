import { ensureDir } from "fs-extra";
import { join, dirname } from "path/posix";

import { Tools, AnimationGroup } from "babylonjs";

import { waitNextAnimationFrame } from "../../../../tools/tools";
import { updateLightShadowMapRefreshRate } from "../../../../tools/light/shadows";

import { CinematicEditor } from "../editor";

import { restoreSceneState, saveSceneState } from "../tools/state";

import { createVideoEncoder, encodeVideoFrame, flushVideoEncoder, getVideoDimensions } from "./tools";

export type RenderType = "720p" | "1080p" | "4k";

export type RenderCinematicBaseOptionsType = {
	from: number;
	to: number;
	type: RenderType;
};

export type RenderCinematicOptionsType = RenderCinematicBaseOptionsType & {
	cancelled: boolean;
	destination: string;
	animationGroup: AnimationGroup;
	onProgress: (progress: number) => void;
};

export async function renderCinematic(cinematicEditor: CinematicEditor, options: RenderCinematicOptionsType) {
	// Create temporary folder
	const destinationFolder = join(dirname(options.destination), Tools.RandomId());
	await ensureDir(destinationFolder);

	// Configure preview
	const preview = cinematicEditor.editor.layout.preview;
	const scene = preview.scene;
	const engine = preview.engine;

	const { width, height } = getVideoDimensions(options.type);

	const scalingLevel = engine._hardwareScalingLevel;
	const fixedDimensionsType = preview.state.fixedDimensions;

	preview.setRenderScene(false);
	engine.renderEvenInBackground = true;
	scene.useConstantAnimationDeltaTime = true;

	engine.setHardwareScalingLevel(scalingLevel * 0.25);
	preview.setFixedDimensions(options.type);
	preview.scene.render();

	// Prepare
	let encoder = createVideoEncoder(width, height);

	saveSceneState(scene);

	let videoIndex = 1;
	options.animationGroup.play(false);

	// Render each frame into video
	const framesCount = options.animationGroup.to - options.animationGroup.from;

	for (let i = 0; i < framesCount; ++i) {
		preview.setRenderScene(true);

		preview.scene.lights.forEach((light) => {
			updateLightShadowMapRefreshRate(light);
		});

		engine.beginFrame();
		engine.activeRenderLoops.forEach((fn) => fn());
		engine.endFrame();
		preview.setRenderScene(false);

		encodeVideoFrame(engine.getRenderingCanvas()!, encoder.videoEncoder, i);

		await waitNextAnimationFrame();

		options.onProgress(((i / framesCount) * 100) >> 0);

		if (options.cancelled) {
			break;
		}

		if (i > 0 && i % 60 === 0) {
			encoder = await flushVideoEncoder({
				...encoder,
				width,
				height,
				videoIndex,
				destinationFolder,
			});

			++videoIndex;
		}
	}

	restoreSceneState();

	// Finalize video encoder and restore canvas
	await flushVideoEncoder({
		...encoder,
		width,
		height,
		videoIndex,
		destinationFolder,
	});

	preview.setRenderScene(true);
	engine.renderEvenInBackground = false;
	scene.useConstantAnimationDeltaTime = false;

	engine.setHardwareScalingLevel(scalingLevel);
	preview.setFixedDimensions(fixedDimensionsType);

	return {
		framesCount,
		destinationFolder,
	};
}
