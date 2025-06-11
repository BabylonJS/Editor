import { Scene } from "@babylonjs/core/scene";

import { vlsPostProcessCameraConfigurations } from "../rendering/vls";
import { ssrRenderingPipelineCameraConfigurations } from "../rendering/ssr";
import { ssaoRenderingPipelineCameraConfigurations } from "../rendering/ssao";
import { motionBlurPostProcessCameraConfigurations } from "../rendering/motion-blur";
import { defaultPipelineCameraConfigurations } from "../rendering/default-pipeline";

export function applyRenderingConfigurations(scene: Scene, rendering: any): void {
    const postProcessConfigurations = Array.isArray(rendering) ? rendering : [];

    postProcessConfigurations.forEach((configuration) => {
        const camera = scene.getCameraById(configuration.cameraId);
        if (!camera) {
            return;
        }

        if (configuration.ssao2RenderingPipeline) {
            ssaoRenderingPipelineCameraConfigurations.set(camera, configuration.ssao2RenderingPipeline);
        }

        if (configuration.vlsPostProcess) {
            vlsPostProcessCameraConfigurations.set(camera, configuration.vlsPostProcess);
        }

        if (configuration.ssrRenderingPipeline) {
            ssrRenderingPipelineCameraConfigurations.set(camera, configuration.ssrRenderingPipeline);
        }

        if (configuration.motionBlurPostProcess) {
            motionBlurPostProcessCameraConfigurations.set(camera, configuration.motionBlurPostProcess);
        }

        if (configuration.defaultRenderingPipeline) {
            defaultPipelineCameraConfigurations.set(camera, configuration.defaultRenderingPipeline);
        }
    });
}
