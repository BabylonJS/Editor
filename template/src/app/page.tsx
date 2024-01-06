"use client";

import { useEffect, useRef } from "react";

import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }

        const engine = new Engine(canvasRef.current, true, {
            stencil: true,
            antialias: true,
            audioEngine: true,
            adaptToDeviceRatio: true,
            premultipliedAlpha: false,
            disableWebGL2Support: false,
            preserveDrawingBuffer: true,
            useHighPrecisionFloats: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
        });

        const scene = new Scene(engine);

        new UniversalCamera("camera", Vector3.Zero(), scene);

        engine.runRenderLoop(() => {
            scene.render();
        });

        return () => {
            scene.dispose();
            engine.dispose();
        };
    }, [canvasRef]);

    return (
        <main className="flex w-screen h-screen flex-col items-center justify-between">
            <canvas
                ref={canvasRef}
                className="w-full h-full outline-none select-none"
            />
        </main>
    );
}
