import { writeJSON } from "fs-extra";
import { join, basename } from "path/posix";

import { Editor } from "babylonjs-editor";
import { PBRMaterial, Tools } from "babylonjs";

import { UniqueNumber } from "./tools/id";

import { QuixelJsonType } from "./typings";
import { copyTextures, setupTextures } from "./texture";

export async function importMaterial(editor: Editor, json: QuixelJsonType, assetsFolder: string): Promise<PBRMaterial | null> {
    const material = new PBRMaterial(json.path, editor.layout.preview.scene);
    material.id = Tools.RandomId();
    material.uniqueId = UniqueNumber.Get();

    material.invertNormalMapX = true;
    material.invertNormalMapY = true;

    importMaterialTextures(editor, json, assetsFolder, material);

    return material;
}

export async function importMaterialTextures(editor: Editor, json: QuixelJsonType, assetsFolder: string, material: PBRMaterial) {
    if (!editor.state.projectPath) {
        return null;
    }

    await copyTextures(editor, json, assetsFolder);
    await setupTextures(editor, json, material, assetsFolder);

    await writeJSON(join(assetsFolder, `${basename(assetsFolder)}.material`), material.serialize(), {
        spaces: "\t",
        encoding: "utf-8",
    });
}
