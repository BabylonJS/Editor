import { Engine, Scene, Vector3, FreeCamera, PointLight, SceneLoader, Mesh } from 'babylonjs';
import { AssetElement } from '../../extensions/typings/asset';

export default class LibrariesHelpers {
    public static async CreateFilePreview (asset: AssetElement<File>, engine: Engine): Promise<string> {
        if (asset.img)
            return asset.img;
        
        const canvas = engine.getRenderingCanvas();

        const scene = new Scene(engine);
        scene.clearColor.set(0, 0, 0, 1);

        const camera = new FreeCamera('PrefabAssetCamera', Vector3.Zero(), scene);
        const light = new PointLight('PrefabAssetLight', Vector3.Zero(), scene);

        const result = await SceneLoader.ImportMeshAsync('', 'file:', asset.data, scene);

        return new Promise<string>((resolve) => {
            let renderLoop: () => void = null;
            engine.runRenderLoop(renderLoop = () => {
                scene.render();
                if (scene.getWaitingItemsCount() === 0) {
                    // Find camera position
                    const minimum = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
                    const maximum = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
                    const rootNodes = result.meshes.filter((m) => !m.parent);
                    const descendants = rootNodes.concat.apply(rootNodes, rootNodes.map((r) => r.getDescendants()));

                    descendants.forEach((d) => {
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

                    camera.position = maximum.add(new Vector3(distance, distance, distance));
                    camera.setTarget(center);
                    light.position = camera.position.clone();

                    // Render and resolve
                    scene.render();
                    scene.dispose();
                    engine.stopRenderLoop(renderLoop);
                    resolve(canvas.toDataURL('image/png'));
                }
            });
        });
    }
}
