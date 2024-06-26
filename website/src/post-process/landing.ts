"use client";

import { Camera } from "@babylonjs/core/Cameras/camera";
import { Effect } from "@babylonjs/core/Materials/effect";
import { Vector2 } from "@babylonjs/core/Maths/math.vector";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";

import fragmentShader1 from "./landingLights.fragment.fx";
import fragmentShader2 from "./landingCircle.fragment.fx";

Effect.ShadersStore["landingLightsFragmentShader"] = fragmentShader1;
Effect.ShadersStore["landingCircleFragmentShader"] = fragmentShader2;

export class LandingPostProcess extends PostProcess {
    public alpha: number = 1;

    public constructor(camera: Camera, type: "landingLights" | "landingCircle") {
        super("landing", type, {
            camera,
            size: 0.5,
            uniforms: ["time", "alpha", "resolution"],
        });

        let time = 0;

        const engine = this.getEngine();
        const resolution = Vector2.Zero();

        this.onApplyObservable.add((effect) => {
            if (type === "landingLights") {
                time += engine.getDeltaTime() * 0.0004;
            } else {
                time += engine.getDeltaTime() * 0.0003;
            }

            resolution.set(engine.getRenderWidth(), engine.getRenderHeight());

            effect.setFloat("time", time);
            effect.setFloat("alpha", this.alpha);
            effect.setVector2("resolution", resolution);
        });
    }
}
