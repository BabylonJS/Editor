import { basename, join, dirname } from "path/posix";

import { useEffect, useRef } from "react";

import { Engine, Scene, ArcRotateCamera, Vector3, CubeTexture, SceneLoader } from "babylonjs";

import { showAlert } from "../../../../ui/dialog";

import { projectConfiguration } from "../../../../project/configuration";

import { Editor } from "../../../main";

export function openModelViewer(editor: Editor, absolutePath: string) {
	showAlert(
		basename(absolutePath),
		<AssetBrowserModelViewer editor={editor} absolutePath={absolutePath} />,
		true,
	);
}

export interface IAssetBrowserModelViewerProps {
	editor: Editor;
	absolutePath: string;
}

function AssetBrowserModelViewer(props: IAssetBrowserModelViewerProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!projectConfiguration.path) {
			return;
		}

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

		const rootUrl = join(dirname(projectConfiguration.path), "/");

		const serializedEnvironmentTexture = props.editor.layout.preview.scene.environmentTexture?.serialize();
		if (serializedEnvironmentTexture) {
			const texture = CubeTexture.Parse(serializedEnvironmentTexture, scene, rootUrl);
			scene.environmentTexture = texture;
		}

		const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 2, 150, Vector3.Zero(), scene, true);
		camera.lowerRadiusLimit = 75;
		camera.upperRadiusLimit = 200;
		camera.attachControl();

		const sceneRootUrl = dirname(props.absolutePath);
		SceneLoader.Append(join(sceneRootUrl, "/"), basename(props.absolutePath), scene, () => {
			scene.createDefaultCameraOrLight(true, true, true);
			scene.createDefaultEnvironment({
				createSkybox: false,
				enableGroundShadow: true,
				enableGroundMirror: true,
				environmentTexture: scene.environmentTexture!,
			});

			engine.runRenderLoop(() => {
				scene.render();
			});
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
