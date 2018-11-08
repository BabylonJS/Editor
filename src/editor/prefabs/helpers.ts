import {
    SceneSerializer, SceneLoader,
    Scene, Engine,
    FreeCamera, PointLight,
    Vector3,
    Mesh,
    ParticleSystem,
    FilesInput
} from 'babylonjs';

import { AssetElement } from '../../extensions/typings/asset';
import Tools from '../tools/tools';
import { Prefab } from './prefab';

export default class PrefabsHelpers {
    /**
     * Creates a preview of the prefab (base64 image)
     * @param d the asset element
     * @param engine the babylonjs engine
     */
    public static async CreatePreview (d: AssetElement<Prefab>, engine: Engine): Promise<void> {
        // Create preview
        const serialization = SceneSerializer.SerializeMesh(d.data.sourceNode, false, true);
        const file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serialization)), d.name.toLowerCase() + '.babylon');
        const canvas = engine.getRenderingCanvas();

        const scene = new Scene(engine);
        scene.clearColor.set(0, 0, 0, 1);

        const camera = new FreeCamera('PrefabAssetCamera', Vector3.Zero(), scene);
        const light = new PointLight('PrefabAssetLight', Vector3.Zero(), scene);

        // Add file
        FilesInput.FilesToLoad[file.name] = file;

        await new Promise<void>((resolve) => {
            SceneLoader.Append('file:', file.name, scene, () => {
                engine.runRenderLoop(() => {
                    scene.render();
                    
                    if (scene.getWaitingItemsCount() === 0) {
                        // Exclude particle systems for instance
                        if (d.data.sourceNode instanceof ParticleSystem)
                            return;

                        // Find camera position
                        const minimum = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
                        const maximum = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
                        const descendants = [d.data.sourceNode].concat(<Mesh[]> d.data.sourceNode.getDescendants(false, n => n instanceof Mesh));

                        descendants.forEach(d => {
                            if (!(d instanceof Mesh))
                                return;
                            
                            const b = d._boundingInfo;
                            maximum.x = Math.max(b.maximum.x, maximum.x);
                            maximum.y = Math.max(b.maximum.y, maximum.y);
                            maximum.z = Math.max(b.maximum.z, maximum.z);

                            minimum.x = Math.min(b.minimum.x, minimum.x);
                            minimum.y = Math.min(b.minimum.y, minimum.y);
                            minimum.z = Math.min(b.minimum.z, minimum.z);
                        });

                        const center = Vector3.Center(minimum, maximum);
                        const distance = Vector3.Distance(minimum, maximum) * 0.5;

                        camera.position = d.data.sourceNode.position.add(maximum).add(new Vector3(distance, distance, distance));
                        camera.setTarget(d.data.sourceNode.position.add(center));
                        light.position = camera.position.clone();

                        // Render
                        scene.render();
                        d.img = canvas.toDataURL('image/png');
                        engine.stopRenderLoop();
                        resolve();
                    }
                });
            });

            engine.hideLoadingUI();
        });

        // Remove file
        delete FilesInput.FilesToLoad[file.name];

        // Dispose
        scene.dispose();
    }
}