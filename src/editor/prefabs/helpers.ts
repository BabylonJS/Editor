import {
    SceneSerializer, SceneLoader,
    Scene, Engine,
    FreeCamera, PointLight,
    Vector3,
    AbstractMesh
} from 'babylonjs';

import { AssetElement } from '../../shared/asset';
import Tools from '../tools/tools';
import { Prefab } from './prefab';

export default class PrefabsHelpers {
    /**
     * Creates a preview of the prefab (base64 image)
     * @param d the asset element
     * @param engine the babylonjs engine
     */
    public static async CreatePreview (d: AssetElement<Prefab>, engine: Engine): Promise<void> {
        const serialization = SceneSerializer.SerializeMesh(d.data.sourceMesh, false, true);
        const file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serialization)), d.name + '.babylon');
        const canvas = engine.getRenderingCanvas();

        const scene = new Scene(engine);
        scene.clearColor.set(0, 0, 0, 1);

        const camera = new FreeCamera('PrefabAssetCamera', Vector3.Zero(), scene);
        const light = new PointLight('PrefabAssetLight', Vector3.Zero(), scene);

        await SceneLoader.AppendAsync('file:', file, scene, () => engine.hideLoadingUI());
        await new Promise<void>((resolve) => {
            engine.runRenderLoop(() => {
                scene.render();
                
                if (scene.getWaitingItemsCount() === 0) {
                    // Find camera position
                    let boundingInfo = d.data.sourceMesh.getBoundingInfo();
                    const descendants = d.data.sourceMesh.getDescendants();

                    descendants.forEach(d => {
                        if (!(d instanceof AbstractMesh))
                            return;
                        
                        d.getBoundingInfo().update(d.getWorldMatrix());
                        const da = Vector3.Distance(d.getBoundingInfo().minimum, d.getBoundingInfo().maximum);
                        const db = Vector3.Distance(boundingInfo.minimum, boundingInfo.maximum);

                        if (da > db)
                            boundingInfo = d.getBoundingInfo();
                    });

                    camera.position = boundingInfo.maximum.clone();
                    camera.setTarget(d.data.sourceMesh.absolutePosition);
                    light.position = camera.position.clone();

                    // Render
                    scene.render();
                    d.img = canvas.toDataURL('image/png');
                    engine.stopRenderLoop();
                    resolve();
                }
            });
        });

        // Dispose
        scene.dispose();
    }
}