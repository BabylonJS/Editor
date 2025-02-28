import { Camera } from "babylonjs";

import { serializeVLSPostProcess, vlsPostProcessCameraConfigurations } from "./vls";
import { serializeSSRRenderingPipeline, ssrRenderingPipelineCameraConfigurations } from "./ssr";
import { serializeSSAO2RenderingPipeline, ssaoRenderingPipelineCameraConfigurations } from "./ssao";
import { defaultPipelineCameraConfigurations, serializeDefaultRenderingPipeline } from "./default-pipeline";
import { motionBlurPostProcessCameraConfigurations, serializeMotionBlurPostProcess } from "./motion-blur";

/**
 * Saves the rendering configurations for the given camera. This is useful to restore the rendering configurations
 * when the camera is re-activated (typically using the preview panel toolbar).
 * @param camera defines the reference to the camera to save its rendering configurations.
 */
export function saveRenderingConfigurationForCamera(camera: Camera) {
    ssaoRenderingPipelineCameraConfigurations.set(camera, serializeSSAO2RenderingPipeline());
    vlsPostProcessCameraConfigurations.set(camera, serializeVLSPostProcess());
    ssrRenderingPipelineCameraConfigurations.set(camera, serializeSSRRenderingPipeline());
    motionBlurPostProcessCameraConfigurations.set(camera, serializeMotionBlurPostProcess());
    defaultPipelineCameraConfigurations.set(camera, serializeDefaultRenderingPipeline());
}
