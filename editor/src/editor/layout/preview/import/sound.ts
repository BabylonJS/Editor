import { dirname, join } from "path/posix";

import { Sound } from "babylonjs";

import { showAlert } from "../../../../ui/dialog";

import { projectConfiguration } from "../../../../project/configuration";

import { Editor } from "../../../main";

export async function applySoundAsset(editor: Editor, absolutePath: string) {
    const relativePath = absolutePath.replace(join(dirname(projectConfiguration.path!), "/"), "");

    const existingSound = editor.layout.preview.scene.getSoundByName(relativePath);
    if (existingSound) {
        showAlert("Sound already exists", "A sound with the same file already exists in the scene.");
        return;
    }

    await new Promise<void>((resolve) => {
        const sound = new Sound(relativePath, absolutePath, editor.layout.preview.scene, () => {
            resolve();
        });

        sound["_url"] = relativePath;
    });
}
