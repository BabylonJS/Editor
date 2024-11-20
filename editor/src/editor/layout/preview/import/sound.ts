import { dirname, join } from "path/posix";

import { Sound, Tools } from "babylonjs";

import { showAlert } from "../../../../ui/dialog";

import { UniqueNumber } from "../../../../tools/tools";
import { isScene } from "../../../../tools/guards/scene";
import { isInstancedMesh, isMesh, isTransformNode } from "../../../../tools/guards/nodes";

import { projectConfiguration } from "../../../../project/configuration";

import { Editor } from "../../../main";

declare module "babylonjs" {
    export interface Sound {
        id: string;
        uniqueId: number;
    }
}

export async function applySoundAsset(editor: Editor, object: any, absolutePath: string) {
    const relativePath = absolutePath.replace(join(dirname(projectConfiguration.path!), "/"), "");

    if (isScene(object)) {
        const existingSound = editor.layout.preview.scene.soundTracks?.find((st) => {
            return st.soundCollection.find((s) => !s.spatialSound && s.name === relativePath);
        });

        if (existingSound) {
            return showAlert("Sound already exists", "A sound with the same file already exists in the scene.");
        }
    }

    await new Promise<void>((resolve) => {
        const sound = new Sound(relativePath, absolutePath, editor.layout.preview.scene, () => {
            resolve();
        });

        sound.id = Tools.RandomId();
        sound.uniqueId = UniqueNumber.Get();

        sound["_url"] = relativePath;

        if (isTransformNode(object) || isMesh(object) || isInstancedMesh(object)) {
            sound.attachToMesh(object);
        }
    });
}
