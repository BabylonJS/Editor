import { Node } from "@babylonjs/core/node";
import { Scene } from "@babylonjs/core/scene";

import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

import type { AudioSceneComponent as _AudioSceneComponent } from "@babylonjs/core/Audio/audioSceneComponent";

export interface ISceneDecoratorData {
    // @nodeFromScene
    _NodesFromScene: {
        nodeName: string;
        propertyKey: string | Symbol;
    }[];

    // @nodeFromDescendants
    _NodesFromDescendants: {
        nodeName: string;
        propertyKey: string | Symbol;
        directDescendantsOnly: boolean;
    }[];

    // @soundFromScene
    _SoundsFromScene: {
        soundName: string;
        propertyKey: string | Symbol;
    }[];

    // @guiFromAsset
    _GuiFromAsset: {
        pathInAssets: string;
        onGuiCreated?: (instance: unknown, gui: AdvancedDynamicTexture) => unknown;
        propertyKey: string | Symbol;
    }[];

    // @fromParticleSystems
    _ParticleSystemsFromScene: {
        particleSystemName: string;
        propertyKey: string | Symbol;
    }[];
}

export function applyDecorators(scene: Scene, object: any, instance: any, rootUrl: string) {
    const ctor = instance.constructor as ISceneDecoratorData;
    if (!ctor) {
        return;
    }

    // @nodeFromScene
    ctor._NodesFromScene?.forEach((params) => {
        instance[params.propertyKey.toString()] = scene.getNodeByName(params.nodeName);
    });

    // @nodeFromDescendants
    ctor._NodesFromDescendants?.forEach((params) => {
        const descendant = (object as Partial<Node>).getDescendants?.(params.directDescendantsOnly, (node) => node.name === params.nodeName)[0];
        instance[params.propertyKey.toString()] = descendant ?? null;
    });

    // soundFromScene
    ctor._SoundsFromScene?.forEach((params) => {
        const sound = scene.getSoundByName?.(params.soundName);
        instance[params.propertyKey.toString()] = sound ?? null;
    });

    // @guiFromAsset
    ctor._GuiFromAsset?.forEach(async (params) => {
        const guiUrl = `${rootUrl}assets/${params.pathInAssets}`;

        try {
            const response = await fetch(guiUrl);
            const data = await response.json();

            const gui = AdvancedDynamicTexture.CreateFullscreenUI(data.name, true, scene);
            gui.parseSerializedObject(data.content, false);

            instance[params.propertyKey.toString()] = gui;
            params.onGuiCreated?.(instance, gui);
        } catch (e) {
            console.error(`Failed to load GUI from asset: ${guiUrl}`);
            throw e;
        }
    });

    // @fromParticleSystems
    ctor._ParticleSystemsFromScene?.forEach((params) => {
        const particleSystem = scene.particleSystems?.find((particleSystem) => {
            return particleSystem.name === params.particleSystemName;
        });

        instance[params.propertyKey.toString()] = particleSystem;
    });
}
