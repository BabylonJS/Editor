import { readJSON } from "fs-extra";
import { basename, join, dirname } from "path/posix";

import { useEffect, useRef } from "react";

import { Engine, Scene, CreateSphere, ArcRotateCamera, Vector3, CubeTexture, Material } from "babylonjs";

import { showAlert } from "../../../../ui/dialog";

import { projectConfiguration } from "../../../../project/configuration";

import { Editor } from "../../../main";

export function openMaterialViewer(editor: Editor, absolutePath: string) {
	showAlert(basename(absolutePath), <AssetBrowserMaterialViewer editor={editor} absolutePath={absolutePath} />, true);
}

export interface IAssetBrowserMaterialViewerProps {
	editor: Editor;
	absolutePath: string;
}

function AssetBrowserMaterialViewer(props: IAssetBrowserMaterialViewerProps) {
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

		const sphere = CreateSphere("sphere", { diameter: 100 }, scene);

		readJSON(props.absolutePath).then((data) => {
			const material = Material.Parse(data, scene, rootUrl);
			sphere.material = material;
		});

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
