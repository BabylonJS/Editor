import { basename } from "path/posix";

import { useEffect, useRef } from "react";

import { Engine, Scene, CreateSphere, ArcRotateCamera, Vector3, PBRMaterial, CubeTexture, Texture } from "babylonjs";

import { showAlert } from "../../../../ui/dialog";

export function openEnvViewer(absolutePath: string) {
    showAlert(
        basename(absolutePath),
        <AssetBrowserEnvViewer absolutePath={absolutePath} />,
    );
}

interface IAssetBrowserEnvViewerProps {
    absolutePath: string;
}

function AssetBrowserEnvViewer(props: IAssetBrowserEnvViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const engine = new Engine(canvasRef.current!, true, {
            antialias: true,
            audioEngine: false,
            adaptToDeviceRatio: true,
            useHighPrecisionFloats: true,
            useHighPrecisionMatrix: true,
            failIfMajorPerformanceCaveat: false,
        });

        const scene = new Scene(engine);
        scene.clearColor.set(0, 0, 0, 0);

        const texture = CubeTexture.CreateFromPrefilteredData(props.absolutePath, scene);
        texture.coordinatesMode = Texture.CUBIC_MODE;

        const material = new PBRMaterial("material", scene);
        material.metallic = 1;
        material.roughness = 0;
        material.reflectionTexture = texture;

        const sphere = CreateSphere("sphere", { diameter: 100 }, scene);
        sphere.material = material;

        const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 2, 150, Vector3.Zero(), scene, true);
        camera.lowerRadiusLimit = 75;
        camera.upperRadiusLimit = 200;
        camera.attachControl();

        engine.runRenderLoop(() => {
            scene.render();
        });

        return () => {
            scene.dispose();
            engine.dispose();
        };
    }, []);

    return (
        <div className="w-[50vw] h-[50vh]">
            <canvas ref={canvasRef} className="w-full h-full rounded-md" />
        </div>
    );
}
