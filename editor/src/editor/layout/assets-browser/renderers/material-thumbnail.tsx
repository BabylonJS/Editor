import { useEffect, useRef, useState } from "react";
import { Engine, Scene, CreateSphere, Vector3, DirectionalLight, HemisphericLight, UniversalCamera, Material, CubeTexture, Color3 } from "babylonjs";

import { GiMaterialsScience } from "react-icons/gi";

import { projectConfiguration } from "../../../../project/configuration";

export interface IMaterialThumbnailRendererProps {
	/**
	 * The absolute path to the material file.
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

export function MaterialThumbnailRenderer(props: IMaterialThumbnailRendererProps) {
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

		const camera = new UniversalCamera("UniversalCamera", new Vector3(0, 10, 30), scene);
		camera.fov = 0.4;
		camera.minZ = 0.1;

		const dirLight = new DirectionalLight("dirLight", new Vector3(4, -4, -4), scene);
		dirLight.intensity = 1;
		dirLight.position = new Vector3(100, 100, 100);
		dirLight.diffuse = new Color3(1, 1, 1);
		dirLight.specular = new Color3(1, 1, 1);

		const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
		hemiLight.intensity = 0.2;
		hemiLight.diffuse = new Color3(1, 1, 1);
		hemiLight.groundColor = new Color3(1, 1, 1);

		const sphere = CreateSphere("sphere", { diameter: 10, segments: 32 }, scene);
		sphere.position.y = 5;

		camera.setTarget(sphere.position);

		if (props.environmentTexture) {
			scene.environmentTexture = props.environmentTexture;
		}

		import("fs-extra").then(({ readJSON }) => {
			readJSON(props.absolutePath)
				.then((data) => {
					try {
						const rootUrl = projectConfiguration.path ? projectConfiguration.path.substring(0, projectConfiguration.path.lastIndexOf("/") + 1) : "";

						const materialData = Material.Parse(data, scene, rootUrl);
						sphere.material = materialData;
					} catch (e) {
						console.error("Failed to parse material:", e);
						setLoadError(true);
					}
				})
				.catch((e) => {
					console.error("Failed to read material file:", e);
					setLoadError(true);
				});
		});

		engine.runRenderLoop(() => {
			scene.render();
		});

		// Cleanup
		return () => {
			engine.stopRenderLoop();
			scene.dispose();
			engine.dispose();
		};
	}, [props.absolutePath]);

	if (loadError) {
		return <GiMaterialsScience size="64px" />;
	}

	return <canvas ref={canvasRef} width={width} height={height} className="w-full h-full object-contain rounded-md" />;
}
