import { Scene } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Effect } from "@babylonjs/core/Materials/effect";
import { RegisterClass } from "@babylonjs/core/Misc/typeStore";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { SerializationHelper } from "@babylonjs/core/Misc/decorators";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";

import pixelShaderContent from "./{__shader_name__}.fragment.fx";

Effect.ShadersStore["/*{__shader_class_name__id__}*/APostProcessFragmentShader"] = pixelShaderContent;

export default class /*{__shader_class_name__}*/APostProcess extends PostProcess {
    /**
     * Constructor.
     * @param scene defines the reference to the scene where to add the post-process.
    */
    public constructor(scene: Scene, camera: Nullable<Camera>) {
        super(
            "{__shader_name__}",
            "/*{__shader_class_name__id__}*/APostProcess",
            [], // Uniforms
            [], // Samplers
            1.0,
            camera ?? scene.activeCamera,
            Texture.TRILINEAR_SAMPLINGMODE,
            undefined,
            true,
        );

        this.onApplyObservable.add((e) => {
            /* Set uniforms here */
        });
    }

    /**
     * Gets a string identifying the name of the class.
     */
    public getClassName(): string {
        return "/*{__shader_class_name__id__}*/APostProcess";
    }

    /**
     * @internal
     */
    public static _Parse(parsedPostProcess: any, targetCamera: Camera, scene: Scene, rootUrl: string): Nullable</*{__shader_class_name__}*/APostProcess> {
        return SerializationHelper.Parse(
            () => {
                return new /*{__shader_class_name__}*/APostProcess(scene, targetCamera);
            },
            parsedPostProcess,
            scene,
            rootUrl,
        );
    }
}

/**
 * Register the material in the BabylonJS registered types in order to be parsed.
 */
RegisterClass("BABYLON./*{__shader_class_name__id__}*/APostProcess", /*{__shader_class_name__}*/APostProcess);

/**
 * Defines the configuration of the material.
 */
export const postProcessConfiguration = {
    pixelShaderContent: "./{__shader_name__}.fragment.fx",
}
