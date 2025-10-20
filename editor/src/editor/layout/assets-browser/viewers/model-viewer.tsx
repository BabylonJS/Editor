import { basename, join, dirname } from "path/posix";

import { useEffect, useRef, useState } from "react";

import { Engine, Scene, ArcRotateCamera, CubeTexture, AppendSceneAsync } from "babylonjs";

import { showAlert } from "../../../../ui/dialog";
import { Progress } from "../../../../ui/shadcn/ui/progress";

import { projectConfiguration } from "../../../../project/configuration";

import { Editor } from "../../../main";

export function openModelViewer(editor: Editor, absolutePath: string) {
	showAlert(basename(absolutePath), <AssetBrowserModelViewer editor={editor} absolutePath={absolutePath} />, true);
}

export interface IAssetBrowserModelViewerProps {
	editor: Editor;
	absolutePath: string;
}

function AssetBrowserModelViewer(props: IAssetBrowserModelViewerProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const [loading, setLoading] = useState(true);
	const [progress, setProgress] = useState(0);

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

		const sceneRootUrl = dirname(props.absolutePath);

		handleLoad(basename(props.absolutePath), scene, join(sceneRootUrl, "/"));

		return () => {
			scene.dispose();
			engine.dispose();
		};
	}, []);

	async function handleLoad(source: string, scene: Scene, rootUrl: string) {
		await AppendSceneAsync(source, scene, {
			rootUrl,
			onProgress: (ev) => setProgress((ev.loaded / ev.total) * 100),
		});

		scene.createDefaultCameraOrLight(true, true, true);
		scene.createDefaultEnvironment({
			createSkybox: true,
			enableGroundShadow: true,
			enableGroundMirror: true,
		});

		const camera = scene.activeCamera as ArcRotateCamera;
		camera.alpha = Math.PI * 0.5;
		camera.beta = Math.PI * 0.35;
		camera.angularSensibilityX = 500;
		camera.angularSensibilityY = 500;

		setLoading(false);

		scene.getEngine().runRenderLoop(() => {
			scene.render();
		});
	}

	return (
		<div className="relative w-[50vw] h-[50vh]">
			<canvas ref={canvasRef} className="w-full h-full rounded-md" />

			{loading && <Progress value={progress} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35vw]" />}
		</div>
	);
}
