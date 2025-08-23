import { useEffect, useRef, useState } from "react";
import { Engine, Scene, Vector3, DirectionalLight, HemisphericLight, ArcRotateCamera, CubeTexture, Color3, SceneLoader } from "babylonjs";
import { basename, dirname, join } from "path/posix";

import { BiSolidCube } from "react-icons/bi";

import { projectConfiguration } from "../../../../project/configuration";

export interface IModelThumbnailRendererProps {
	/**
	 * The absolute path to the model file.
	 */
	absolutePath: string;
	/**
	 * The width of the thumbnail.
	 */
	width?: number;
	/**
	 * The height of the thumbnail.
	 */
	height?: number;
	/**
	 * Optional environment texture to use.
	 */
	environmentTexture?: CubeTexture;
}

export function ModelThumbnailRenderer(props: IModelThumbnailRendererProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { width = 120, height = 120 } = props;
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		if (!projectConfiguration.path || !canvasRef.current) {
			return;
		}

		// Create engine with appropriate settings for thumbnails
		const engine = new Engine(canvasRef.current, true, {
			antialias: true,
			audioEngine: false,
			adaptToDeviceRatio: true,
			preserveDrawingBuffer: true,
			premultipliedAlpha: false,
		});

		const scene = new Scene(engine);
		scene.clearColor.set(0, 0, 0, 0);

		const camera = new ArcRotateCamera("camera", Math.PI / 4, Math.PI / 3, 20, Vector3.Zero(), scene);
		camera.minZ = 0.1;
		camera.fov = 0.8;

		const dirLight = new DirectionalLight("dirLight", new Vector3(4, -4, -4), scene);
		dirLight.intensity = 1;
		dirLight.position = new Vector3(100, 100, 100);
		dirLight.diffuse = new Color3(1, 1, 1);
		dirLight.specular = new Color3(1, 1, 1);

		const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
		hemiLight.intensity = 0.2;
		hemiLight.diffuse = new Color3(1, 1, 1);
		hemiLight.groundColor = new Color3(1, 1, 1);

		if (props.environmentTexture) {
			scene.environmentTexture = props.environmentTexture;
		}

		try {
			const sceneRootUrl = dirname(props.absolutePath);
			const fileName = basename(props.absolutePath);
			
			SceneLoader.AppendAsync(join(sceneRootUrl, "/"), fileName, scene).then(() => {
				// Auto-adjust camera to focus on the model
				scene.createDefaultCameraOrLight(false, true, true);
				
				// Center and scale the model to fit in the view
				if (scene.meshes.length > 0) {
					const boundingInfo = scene.meshes[0].getHierarchyBoundingVectors();
					const center = Vector3.Center(boundingInfo.min, boundingInfo.max);
					const radius = Vector3.Distance(boundingInfo.min, boundingInfo.max) / 2;
					
					camera.setTarget(center);
					camera.radius = radius * 2;
				}
				
				engine.runRenderLoop(() => {
					scene.render();
				});
			}).catch((e) => {
				console.error("Failed to load model:", e);
				setLoadError(true);
			});
		} catch (e) {
			console.error("Failed to load model:", e);
			setLoadError(true);
		}

		// Cleanup
		return () => {
			engine.stopRenderLoop();
			scene.dispose();
			engine.dispose();
		};
	}, [props.absolutePath]);

	if (loadError) {
		return <BiSolidCube size="64px" />;
	}

	return <canvas ref={canvasRef} width={width} height={height} className="w-full h-full object-contain rounded-md" />;
}
