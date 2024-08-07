import { extname } from "path/posix";

import { CubeTexture, Texture } from "babylonjs";

import { showDialog } from "../../../ui/dialog";
import { Button } from "../../../ui/shadcn/ui/button";

import { isScene } from "../../../tools/guards/scene";
import { isAbstractMesh } from "../../../tools/guards/nodes";
import { isCubeTexture } from "../../../tools/guards/texture";
import { registerSimpleUndoRedo } from "../../../tools/undoredo";
import { isPBRMaterial, isStandardMaterial } from "../../../tools/guards/material";

import { Editor } from "../../main";

import { configureImportedTexture } from "./import";

/**
 * Applies the texture asset located at the given absolute path to the given object.
 * @param editor defines the reference to the editor.
 * @param object defines the reference to the object where to apply the texture. The type of the object is tested.
 * @param absolutePath defines the absolute path to the texture asset file (.png, .env, .jpg, etc.).
 */
export function applyTextureAssetToObject(editor: Editor, object: any, absolutePath: string) {
    if (!isScene(object) && !isAbstractMesh(object)) {
        return;
    }

    if (isAbstractMesh(object) && !object.material) {
        return;
    }

    const extension = extname(absolutePath).toLowerCase();

    switch (extension) {
        case ".env":
            const newCubeTexture = configureImportedTexture(CubeTexture.CreateFromPrefilteredData(
                absolutePath,
                isScene(object) ? object : object.getScene(),
            ));
            applyTextureToObject(editor, object, newCubeTexture);
            break;

        case ".jpg":
        case ".png":
        case ".bmp":
        case ".jpeg":
            const newTexture = configureImportedTexture(new Texture(
                absolutePath,
                isScene(object) ? object : object.getScene(),
            ));
            applyTextureToObject(editor, object, newTexture);
            break;
    }
}

/**
 * Applies the given texture to the given object. Tries to determine the correct slot to apply the texture.
 * If fails, asks to choose the slot (albedo, bump, etc.).
 * @param editor defines the reference to the editor.
 * @param object defines the reference to the object where to apply the texture. The type of the object is tested.
 * @param texture defines the reference to the texture instance to apply on the object.
 */
export function applyTextureToObject(editor: Editor, object: any, texture: Texture | CubeTexture) {
    if (isCubeTexture(texture) && isScene(object)) {
        return registerSimpleUndoRedo({
            object,
            newValue: texture,
            executeRedo: true,
            property: "environmentTexture",
            oldValue: object.environmentTexture,
            onLost: () => texture.dispose(),
        });
    }

    if (!isAbstractMesh(object)) {
        return;
    }

    const material = object.material;
    if (!material) {
        return;
    }

    function TextureSlotComponent({ property }) {
        return (
            <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                    registerSimpleUndoRedo({
                        property,
                        object: material,
                        newValue: texture,
                        executeRedo: true,
                        oldValue: material![property],
                        onLost: () => texture.dispose(),
                    });

                    dialog.close();
                    editor.layout.inspector.forceUpdate();
                }}
            >
                {property}
            </Button>
        );
    }

    const title = (
        <div>
            Apply texture
            <br />
            <b className="text-muted-foreground font-semibold tracking-tighter">{material.name}</b>
        </div>
    );

    const dialog = showDialog(title, (
        <div className="flex flex-col gap-4 w-64 pt-4">
            {isPBRMaterial(material) &&
                <>
                    <TextureSlotComponent property="albedoTexture" />
                    <TextureSlotComponent property="bumpTexture" />
                    <TextureSlotComponent property="reflectivityTexture" />
                    <TextureSlotComponent property="ambientTexture" />
                    <TextureSlotComponent property="metallicTexture" />
                    <TextureSlotComponent property="reflectionTexture" />
                </>
            }

            {
                isStandardMaterial(material) &&
                <>
                    <TextureSlotComponent property="diffuseTexture" />
                    <TextureSlotComponent property="bumpTexture" />
                    <TextureSlotComponent property="specularTexture" />
                    <TextureSlotComponent property="ambientTexture" />
                    <TextureSlotComponent property="reflectionTexture" />
                </>
            }
        </div>
    ));
}
