import { basename, dirname, join } from "path/posix";

import { Divider } from "@blueprintjs/core";

import { useEffect, useRef } from "react";
import { BiSolidCube } from "react-icons/bi";

import { Engine, Scene, SceneLoader } from "babylonjs";

import { FileInspectorObject } from "../file";

export interface IEditorInspectorSceneComponentProps {
    object: FileInspectorObject;
}

export function EditorInspectorSceneComponent(props: IEditorInspectorSceneComponentProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const engine = new Engine(canvasRef.current!, true, {
            antialias: true,
            adaptToDeviceRatio: true,
            useHighPrecisionFloats: true,
            useHighPrecisionMatrix: true,
        });

        const scene = new Scene(engine);

        const rootUrl = dirname(props.object.absolutePath);
        SceneLoader.Append(join(rootUrl, "/"), basename(props.object.absolutePath), scene, () => {
            scene.createDefaultCameraOrLight(true, true, true);
            scene.createDefaultEnvironment();

            engine.runRenderLoop(() => scene.render());
        });

        return () => {
            scene.dispose();
            engine.dispose();
        };
    }, []);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2 justify-center items-center text-xl font-bold">
                <BiSolidCube size="24px" />
                {basename(props.object.absolutePath)}
            </div>

            <Divider />

            <div className="w-full aspect-square p-5 rounded-lg bg-black/50">
                <canvas ref={canvasRef} className="w-full aspect-square object-contain" />
            </div>
        </div>
    );
}
