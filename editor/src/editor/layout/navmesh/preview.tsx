import { useEffect, useRef, useState } from "react";

import { RecastNavigationJSPluginV2 } from "babylonjs-addons";
import { Engine, Scene, Mesh, StandardMaterial, Color3, Vector3, ArcRotateCamera } from "babylonjs";

export interface INavMeshEditorPreviewProps {
	mesh: Mesh | null;
	plugin: RecastNavigationJSPluginV2;
}

export function NavMeshEditorPreview(props: INavMeshEditorPreviewProps) {
	const [scene, setScene] = useState<Scene | null>(null);
	const [mesh, setMesh] = useState<Mesh | null>(null);
	const [camera, setCamera] = useState<ArcRotateCamera | null>(null);

	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const engine = new Engine(canvasRef.current!, true, {
			adaptToDeviceRatio: true,
		});

		const scene = new Scene(engine);
		scene.clearColor.set(0, 0, 0, 1);

		setScene(scene);

		const observer = new ResizeObserver(() => {
			engine.resize();
		});
		observer.observe(canvasRef.current!);

		engine.runRenderLoop(() => {
			if (scene.activeCamera) {
				scene.render();
			}
		});

		return () => {
			observer.disconnect();
			scene.dispose();
			engine.dispose();
		};
	}, []);

	useEffect(() => {
		if (mesh && scene && !camera) {
			const bb = mesh.getBoundingInfo().boundingBox;
			const distance = Vector3.Distance(bb.minimumWorld, bb.maximumWorld);

			const camera = new ArcRotateCamera("camera", Math.PI * 0.25, Math.PI * 0.25, distance, bb.center, scene, true);
			camera.wheelPrecision = 1;
			camera.attachControl();

			setCamera(camera);
		}
	}, [mesh, scene, camera]);

	useEffect(() => {
		return () => {
			mesh?.dispose();
		};
	}, [mesh]);

	useEffect(() => {
		if (scene && props.mesh) {
			const mesh = props.plugin.createDebugNavMesh(scene);

			const debugMaterial = new StandardMaterial("navmesh-debug-material", scene);
			debugMaterial.emissiveColor = Color3.Magenta();
			debugMaterial.disableLighting = true;
			debugMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
			debugMaterial.alpha = 0.35;
			mesh.material = debugMaterial;

			setMesh(mesh);
		}
	}, [props.mesh, props.plugin, scene]);

	return (
		<div className="flex-1 h-full p-2">
			<canvas ref={canvasRef} className="w-full h-full bg-black rounded-lg" />
		</div>
	);
}
