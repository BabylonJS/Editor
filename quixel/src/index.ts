import { Server, Socket } from "net";
import { mkdir, pathExists } from "fs-extra";
import { dirname, join, basename } from "path/posix";

import { Editor } from "babylonjs-editor";

import { importMeshes } from "./mesh";
import { QuixelJsonType } from "./typings";
import { importMaterial } from "./material";

export const title = "Quixel Bridge";
export const description = "Quixel Bridge integration for Babylon.JS Editor";

export function main(editor: Editor): void {
    createRootFolder(editor);

    const server = new Server((s) => {
        handeServerEvents(editor, s);
    });

    server.listen(24981);
}

function handeServerEvents(editor: Editor, socket: Socket): void {
    let buffer: Buffer | null = null;

    socket.on("data", (d: Buffer) => {
        if (!buffer) {
            buffer = Buffer.from(d);
        } else {
            buffer = Buffer.concat([buffer, d]);
        }
    });

    socket.on("end", async () => {
        if (!buffer) {
            return;
        }

        try {
            const data = JSON.parse(buffer.toString("utf-8")) as QuixelJsonType[];

            data.forEach((json) => {
                handleParsedAsset(editor, json);
            });
        } catch (e) {
            editor.layout.console.error("Failed to parse quixel JSON.");
        }

        buffer = null;
    });
}

async function createRootFolder(editor: Editor): Promise<void> {
    if (!editor.state.projectPath) {
        return;
    }

    const assetsFolder = join(dirname(editor.state.projectPath), "assets");
    if (!await pathExists(assetsFolder)) {
        await mkdir(assetsFolder);
    }

    const quixelFolder = join(assetsFolder, "quixel");
    if (!await pathExists(quixelFolder)) {
        await mkdir(quixelFolder);
    }
}

async function handleParsedAsset(editor: Editor, json: QuixelJsonType) {
    if (!editor.state.projectPath) {
        return;
    }

    // Create folders
    const quixelFolder = join(dirname(editor.state.projectPath), "assets", "quixel");

    const assetFolder = join(quixelFolder, basename(json.path.replace(/\\/g, "/")));
    if (!await pathExists(assetFolder)) {
        await mkdir(assetFolder);
    }

    const material = await importMaterial(editor, json, assetFolder);

    if (json.type === "3d") {
        const meshes = await importMeshes(editor, json, assetFolder);
        meshes.forEach((mesh) => {
            mesh.material = material;

            mesh.getLODLevels().forEach((lodLevel) => {
                if (lodLevel.mesh) {
                    lodLevel.mesh.material = material;
                }
            });
        });
    }

    editor.layout.graph.refresh();
    editor.layout.assets.refresh();
}
