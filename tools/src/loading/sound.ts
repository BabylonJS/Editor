import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { SceneComponentConstants } from "@babylonjs/core/sceneComponent";
import { GetParser, AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";

const audioParser = GetParser(SceneComponentConstants.NAME_AUDIO);

AddParser(SceneComponentConstants.NAME_AUDIO, (parsedData: any, scene: Scene, container: AssetContainer, rootUrl: string) => {
    audioParser?.(parsedData, scene, container, rootUrl);

    parsedData.sounds?.forEach((sound) => {
        const instance = container.sounds?.find((s) => s.name === sound.name);
        if (instance) {
            instance.id = sound.id;
            instance.uniqueId = sound.uniqueId;
        }
    });
});
