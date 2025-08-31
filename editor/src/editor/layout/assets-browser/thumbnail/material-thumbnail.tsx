import { useEffect, useRef, useState } from "react";
import { Engine, Scene, CreateSphere, Vector3, DirectionalLight, HemisphericLight, UniversalCamera, Material, CubeTexture, Color3 } from "babylonjs";

import { GiMaterialsScience } from "react-icons/gi";

import { projectConfiguration } from "../../../../project/configuration";
import { IBaseThumbnailRendererProps } from "./base-thumbnail";
import { ThumbnailCacheService } from "./thumbnail-cache";

export interface IMaterialThumbnailRendererProps extends IBaseThumbnailRendererProps {
	/**
	 * Optional environment texture to use.
	 */
	environmentTexture?: CubeTexture;
}

export function MaterialThumbnailRenderer(props: IMaterialThumbnailRendererProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { width = 256, height = 256 } = props;
	const [loadError, setLoadError] = useState(false);
	const [cachedThumbnail, setCachedThumbnail] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [sceneReady, setSceneReady] = useState(false);
	const [debugInfo, setDebugInfo] = useState<string>("");
	const rendererRef = useRef<any>(null);

	useEffect(() => {
		setLoadError(false);
		setCachedThumbnail(null);
		setIsLoading(true);
		setSceneReady(false);
		setDebugInfo("");

		if (!projectConfiguration.path) {
			setDebugInfo("No project loaded");
			setIsLoading(false);
			setLoadError(true);
			return;
		}

		if (!canvasRef.current) {
			setDebugInfo("Canvas not ready");
			return;
		}

		const loadThumbnail = async () => {
			try {
				const cacheService = ThumbnailCacheService.getInstance();
				const relativePath = cacheService.getRelativePath(props.absolutePath);
				const folderPath = relativePath.substring(0, relativePath.lastIndexOf("/"));

				await cacheService.loadFolderThumbnails(folderPath);

				// Check cache first
				const cached = await cacheService.getThumbnail(relativePath);
				if (cached) {
					setCachedThumbnail(cached);
					setIsLoading(false);
					return;
				}

				// Create new thumbnail
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

				// Load and apply material
				try {
					// Try to import fs-extra
					let readJSON;
					try {
						const fsExtra = await import("fs-extra");
						readJSON = fsExtra.readJSON;
					} catch (importError) {
						throw new Error(`Failed to import fs-extra: ${importError.message}`);
					}

					const data = await readJSON(props.absolutePath);

					const rootUrl = projectConfiguration.path ? projectConfiguration.path.substring(0, projectConfiguration.path.lastIndexOf("/") + 1) : "";

					const materialData = Material.Parse(data, scene, rootUrl);
					sphere.material = materialData;
				} catch (e) {
					setDebugInfo(`Material load error: ${e.message}`);
					setLoadError(true);
					setIsLoading(false);
					return;
				}

				engine.runRenderLoop(() => {
					scene.render();
				});

				// Mark scene as ready and stop loading
				setSceneReady(true);
				setIsLoading(false);
				rendererRef.current = { engine, scene };

				// Wait a bit for the scene to render, then capture thumbnail
				setTimeout(async () => {
					try {
						// Create a temporary canvas for capturing
						const tempCanvas = document.createElement("canvas");
						tempCanvas.width = 256;
						tempCanvas.height = 256;
						const tempCtx = tempCanvas.getContext("2d");

						if (tempCtx && canvasRef.current) {
							// Draw the current canvas content to the temp canvas
							tempCtx.drawImage(canvasRef.current, 0, 0, 256, 256);

							// Convert to base64
							const thumbnailData = tempCanvas.toDataURL("image/png");

							// Save to cache
							await cacheService.setThumbnail(relativePath, thumbnailData);

							// Update the cached thumbnail display
							setCachedThumbnail(thumbnailData);
						}
					} catch (e) {
						setDebugInfo(`Capture error: ${e.message}`);
					}
				}, 1000);
			} catch (e) {
				setDebugInfo(`General error: ${e.message}`);
				setLoadError(true);
				setIsLoading(false);
			}
		};

		loadThumbnail().catch((e) => {
			setDebugInfo(`Promise error: ${e.message}`);
			setLoadError(true);
			setIsLoading(false);
		});

		// Cleanup
		return () => {
			if (rendererRef.current) {
				rendererRef.current.engine.stopRenderLoop();
				rendererRef.current.scene.dispose();
				rendererRef.current.engine.dispose();
			}
		};
	}, [props.absolutePath, props.environmentTexture, projectConfiguration.path]);

	// Show error if no project loaded
	if (loadError) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center">
				<GiMaterialsScience size="64px" />
				{debugInfo && <div className="text-xs text-red-500 mt-2">{debugInfo}</div>}
			</div>
		);
	}

	// If we have a cached thumbnail, show it as an image
	if (cachedThumbnail) {
		return <img src={cachedThumbnail} width={width} height={height} className="w-full h-full object-contain rounded-md" alt="Material thumbnail" />;
	}

	return (
		<div className="w-full h-full relative">
			{/* Hidden canvas for scene creation */}
			<canvas ref={canvasRef} width={width} height={height} className={`w-full h-full object-contain rounded-md ${sceneReady ? "block" : "hidden"}`} />

			{/* Loading overlay */}
			{isLoading && <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">Loading...</div>}

			{/* Initializing overlay */}
			{!isLoading && !sceneReady && !cachedThumbnail && <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">Initializing...</div>}
		</div>
	);
}
