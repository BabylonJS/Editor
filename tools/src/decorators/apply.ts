import { Node } from "@babylonjs/core/node";
import { Scene } from "@babylonjs/core/scene";

import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

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

    // @guiFromAsset
    _GuiFromAsset: {
        pathInAssets: string;
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

    // @guiFromAsset
    ctor._GuiFromAsset?.forEach(async (params) => {
        const response = await fetch(`${rootUrl}assets/${params.pathInAssets}`);
        const data = await response.json();

        const gui = AdvancedDynamicTexture.CreateFullscreenUI(data.name, true, scene);
        gui.parseSerializedObject(data.content, false);
    });
}
