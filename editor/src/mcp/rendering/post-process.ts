import { Scene, Camera } from "babylonjs";

import { isCamera } from "../../tools/guards/nodes";

import { Editor } from "../../editor/main";

import { saveRenderingConfigurationForCamera } from "../../editor/rendering/tools";
import {
	getVLSPostProcess,
	createVLSPostProcess,
	disposeVLSPostProcess,
	serializeVLSPostProcess,
	parseVLSPostProcess,
	vlsPostProcessCameraConfigurations,
} from "../../editor/rendering/vls";
import {
	getTAARenderingPipeline,
	createTAARenderingPipeline,
	disposeTAARenderingPipeline,
	serializeTAARenderingPipeline,
	parseTAARenderingPipeline,
	taaPipelineCameraConfigurations,
} from "../../editor/rendering/taa";
import {
	getSSRRenderingPipeline,
	createSSRRenderingPipeline,
	disposeSSRRenderingPipeline,
	serializeSSRRenderingPipeline,
	parseSSRRenderingPipeline,
	ssrRenderingPipelineCameraConfigurations,
} from "../../editor/rendering/ssr";
import {
	getSSAO2RenderingPipeline,
	createSSAO2RenderingPipeline,
	disposeSSAO2RenderingPipeline,
	serializeSSAO2RenderingPipeline,
	parseSSAO2RenderingPipeline,
	ssaoRenderingPipelineCameraConfigurations,
} from "../../editor/rendering/ssao";
import {
	getMotionBlurPostProcess,
	createMotionBlurPostProcess,
	disposeMotionBlurPostProcess,
	serializeMotionBlurPostProcess,
	parseMotionBlurPostProcess,
	motionBlurPostProcessCameraConfigurations,
} from "../../editor/rendering/motion-blur";
import {
	getDefaultRenderingPipeline,
	createDefaultRenderingPipeline,
	disposeDefaultRenderingPipeline,
	serializeDefaultRenderingPipeline,
	parseDefaultRenderingPipeline,
	defaultPipelineCameraConfigurations,
} from "../../editor/rendering/default-pipeline";

import { IMCPActionOptions } from "../action";
import { resolveNode } from "../tools/resolve";

/**
 * Defines the set of operations exposed by every supported per-camera post-process / rendering pipeline.
 */
interface IPostProcessHandler {
	get(): any;
	create(editor: Editor): any;
	dispose(editor: Editor): void;
	serialize(): any;
	parse(editor: Editor, data: any): any;
	configurations: Map<Camera, any>;
}

/**
 * Registry of all the per-camera post-processes the agent can read and customize.
 */
const handlers: Record<string, IPostProcessHandler> = {
	default: {
		get: getDefaultRenderingPipeline,
		create: createDefaultRenderingPipeline,
		dispose: (_editor: Editor) => disposeDefaultRenderingPipeline(),
		serialize: serializeDefaultRenderingPipeline,
		parse: parseDefaultRenderingPipeline,
		configurations: defaultPipelineCameraConfigurations,
	},
	ssao: {
		get: getSSAO2RenderingPipeline,
		create: createSSAO2RenderingPipeline,
		dispose: (_editor: Editor) => disposeSSAO2RenderingPipeline(),
		serialize: serializeSSAO2RenderingPipeline,
		parse: parseSSAO2RenderingPipeline,
		configurations: ssaoRenderingPipelineCameraConfigurations,
	},
	ssr: {
		get: getSSRRenderingPipeline,
		create: createSSRRenderingPipeline,
		dispose: (_editor: Editor) => disposeSSRRenderingPipeline(),
		serialize: serializeSSRRenderingPipeline,
		parse: parseSSRRenderingPipeline,
		configurations: ssrRenderingPipelineCameraConfigurations,
	},
	motionBlur: {
		get: getMotionBlurPostProcess,
		create: createMotionBlurPostProcess,
		dispose: (_editor: Editor) => disposeMotionBlurPostProcess(),
		serialize: serializeMotionBlurPostProcess,
		parse: parseMotionBlurPostProcess,
		configurations: motionBlurPostProcessCameraConfigurations,
	},
	vls: {
		get: getVLSPostProcess,
		create: (editor: Editor) => createVLSPostProcess(editor),
		dispose: (editor: Editor) => disposeVLSPostProcess(editor),
		serialize: serializeVLSPostProcess,
		parse: parseVLSPostProcess,
		configurations: vlsPostProcessCameraConfigurations,
	},
	taa: {
		get: getTAARenderingPipeline,
		create: createTAARenderingPipeline,
		dispose: (_editor: Editor) => disposeTAARenderingPipeline(),
		serialize: serializeTAARenderingPipeline,
		parse: parseTAARenderingPipeline,
		configurations: taaPipelineCameraConfigurations,
	},
};

/**
 * Resolves the target camera from the request data.
 */
function resolveCamera(scene: Scene, data: any): Camera {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!isCamera(node)) {
		throw new Error(`Node "${node.name}" is not a camera.`);
	}

	return node as Camera;
}

/**
 * Returns the post-process / rendering pipeline configurations associated to the given camera.
 * When the camera is the active one, the live configurations are serialized; otherwise the
 * configurations saved for that camera are returned (null when the post-process is disabled).
 */
export function getCameraPostProcesses(scene: Scene, data: any): any {
	const camera = resolveCamera(scene, data);
	const isActive = scene.activeCamera === camera;

	const postProcesses: Record<string, any> = {};
	for (const type of Object.keys(handlers)) {
		const handler = handlers[type];
		postProcesses[type] = isActive ? handler.serialize() : (handler.configurations.get(camera) ?? null);
	}

	return {
		camera: camera.name,
		cameraId: camera.id,
		isActive,
		postProcesses,
	};
}

/**
 * Enables/disables and customizes a per-camera post-process in realtime. The editor's active camera is
 * switched to the target camera first so the pipeline is attached to it and will be available at runtime.
 */
export function setCameraPostProcess(scene: Scene, data: any, options: IMCPActionOptions): any {
	const camera = resolveCamera(scene, data);
	const editor = options.editor;

	const type = data.type;
	const handler = handlers[type];
	if (!handler) {
		throw new Error(`Unknown post-process type "${type}". Supported: ${Object.keys(handlers).join(", ")}.`);
	}

	// Post-processes are configured on the active camera, so switch to the target camera first.
	// This also restores the camera's existing configurations before we modify them.
	if (scene.activeCamera !== camera) {
		editor.layout.preview.switchToCamera(camera);
	}

	const enabled = data.enabled ?? true;
	if (!enabled) {
		handler.dispose(editor);
	} else {
		let current = handler.serialize();
		if (!current) {
			handler.create(editor);
			current = handler.serialize();
		}

		const merged = { ...current, ...(data.properties ?? {}) };
		handler.parse(editor, merged);
	}

	// Persist the configurations for this camera so they are saved/exported and available at runtime.
	saveRenderingConfigurationForCamera(camera);

	editor.layout.inspector.forceUpdate();

	return {
		camera: camera.name,
		type,
		enabled,
		config: handler.serialize(),
	};
}
