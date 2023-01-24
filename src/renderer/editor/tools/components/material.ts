import filenamify from "filenamify";
import { dirname, join } from "path";
import { pathExists, writeFile } from "fs-extra";

import { Texture, NodeMaterial, TextureBlock } from "babylonjs";

import { Tools } from "../tools";
import { TextureTools } from "./texture";

import { Editor } from "../../editor";

export class MaterialTools {
    /**
     * Exports the given serialized node materials textures to real files.
     * @param editor defines the reference to the editor.
     * @param materials defines the array containing the serialized materials.
     * @param assetsPath defines the path where the scene has been saved.
     */
    public static async ExportSerializedNodeMaterialsTextures(editor: Editor, materials: any[], assetsPath: string, outputPath: string): Promise<string[]> {
        const files: string[] = [];
        const promises: Promise<void>[] = [];

        let textureIndex = 0;

        for (const m of materials ?? []) {
            if (m?.customType !== "BABYLON.NodeMaterial") { continue; }

            const material = editor.scene!.getMaterialById(m.id) as NodeMaterial;
            if (!material || !(material instanceof NodeMaterial)) { continue; }
            if (!material.metadata?.editorPath) { continue; }

            const forceExportTextures = (material.metadata?.shouldExportTextures ?? true) === true;

            material.metadata ??= {};
            material.metadata.shouldExportTextures = false;

            for (const b of m.blocks ?? []) {
                if ((b?.customType !== "BABYLON.TextureBlock" && b?.customType !== "BABYLON.ReflectionBlock" && b?.customType !== "BABYLON.ReflectionTextureBlock") || !b.texture?.name) { continue; }
                if (b.texture.name.indexOf("data:") !== 0) { continue; }

                if (b.customType === "BABYLON.TextureBlock") {
                    const block = material.getTextureBlocks().find((tb) => tb.uniqueId === b.id);
                    if (!block || !(block instanceof TextureBlock) || !block.texture) { continue; }

                    b.texture.url = b.texture.name;
                    b.texture.name = b.texture.metadata?.editorName ?? Tools.RandomId();

                    const materialPath = dirname(material.metadata.editorPath);
                    const path = join(outputPath, materialPath);
                    promises.push(this._ExportSerializedTexture(editor, m, materialPath, block.texture, textureIndex++, path, files, forceExportTextures).then((n) => {
                        b.texture.url = b.texture.name = join(dirname(material.metadata.editorPath), n);
                    }));
                    continue;
                }

                if (!b.texture.forcedExtension) {
                    b.texture.url = `data:${Tools.RandomId()}`;
                    continue;
                }

                promises.push(this._ExportSerializedCubeTexture(editor, m, b, textureIndex++, assetsPath, files, forceExportTextures));
            }
        }

        await Promise.all(promises);

        return files;
    }

    /**
     * Exports the given serialized texture.
     */
    private static async _ExportSerializedTexture(editor: Editor, m: any, materialPath: string, texture: Texture, index: number, path: string, files: string[], forceExportTexture: boolean): Promise<string> {
        const extractedTextureName = filenamify(`${m.name}-${m.id}-${index++}.png`);
        const destination = join(path, extractedTextureName);

        if (!forceExportTexture && await pathExists(destination)) {
            editor.console.logInfo(`NodeMaterial texture named "${extractedTextureName}" already generated.`);
            files.push(extractedTextureName);
            return extractedTextureName;
        }

        const buffer = await TextureTools.ConvertTextureToBuffer(texture);
        if (!buffer) {
            return extractedTextureName;
        }

        files.push(extractedTextureName);
        await Promise.all([
            writeFile(destination, Buffer.from(buffer)),
            writeFile(join(editor.assetsBrowser.assetsDirectory, materialPath, extractedTextureName), Buffer.from(buffer)),
        ]);

        editor.console.logInfo(`Generated NodeMaterial texture for "${m.name}" at ${extractedTextureName}`);

        return extractedTextureName;
    }

    /**
     * Exports the given serialized cube texture.
     */
    private static async _ExportSerializedCubeTexture(editor: Editor, material: any, block: any, index: number, path: string, files: string[], forceExportTexture: boolean): Promise<void> {
        const extractedTextureName = filenamify(`${material.name}-${material.id}-${index++}${block.texture.forcedExtension}`);
        const destination = join(path, "files", extractedTextureName);

        if (!forceExportTexture && await pathExists(destination)) {
            editor.console.logInfo(`NodeMaterial cube texture named "${extractedTextureName}" already generated.`);
            files.push(extractedTextureName);
            return;
        }

        const buffer = TextureTools.ConvertOctetStreamToBuffer(block.texture.name);

        await writeFile(destination, buffer);
        files.push(extractedTextureName);

        block.texture.url = block.texture.name = join("files", extractedTextureName);
        editor.console.logInfo(`Generated NodeMaterial cube texture for "${material.name}" at ${extractedTextureName}`);
    }
}
