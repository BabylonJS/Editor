import { join, dirname, extname } from "path/posix";
import { pathExists, readJSON, readdir, writeFile } from "fs-extra";

import { normalizedGlob } from "../../tools/fs";

import { Editor } from "../../editor/main";

const scriptsTemplate = `
/**
 * Generated by Babylon.js Editor
 */
export const scriptsMap = {
    {{exports}}
};
`;

export async function handleExportScripts(editor: Editor): Promise<void> {
    if (!editor.state.projectPath) {
        return;
    }

    const projectPath = dirname(editor.state.projectPath);

    const sceneFolders = await normalizedGlob(join(projectPath, "assets/**/*.scene"), {
        nodir: false,
    });

    const scriptsMap: Record<string, string> = {};

    await Promise.all(sceneFolders.map(async (file) => {
        const availableMetadata: any[] = [];

        try {
            const config = await readJSON(join(file, "config.json"));
            if (config.metadata) {
                availableMetadata.push(config.metadata);
            }
        } catch (e) {
            // Catch silently.
        }

        const [nodesFiles, meshesFiles, lightsFiles, cameraFiles] = await Promise.all([
            readdir(join(file, "nodes")),
            readdir(join(file, "meshes")),
            readdir(join(file, "lights")),
            readdir(join(file, "cameras")),
        ]);

        await Promise.all([
            ...nodesFiles.map((file) => join("nodes", file)),
            ...meshesFiles.map((file) => join("meshes", file)),
            ...lightsFiles.map((file) => join("lights", file)),
            ...cameraFiles.map((file) => join("cameras", file)),
        ].map(async (f) => {
            const data = await readJSON(join(file, f), "utf-8");
            if (data.metadata) {
                availableMetadata.push(data.metadata);
            }
        }));

        const promises: Promise<void>[] = [];
        for (const metadata of availableMetadata) {
            if (!metadata.scripts) {
                continue;
            }

            for (const script of metadata.scripts) {
                promises.push(new Promise<void>(async (resolve) => {
                    const path = join(projectPath, "src", script.key);
                    if (!await pathExists(path)) {
                        return resolve();
                    }

                    const extension = extname(script.key).toLowerCase();
                    scriptsMap[script.key] = `@/${script.key.replace(extension, "")}`;

                    resolve();
                }));
            }
        }

        await Promise.all(promises);
    }));

    await writeFile(
        join(projectPath, "src/scripts.ts"),
        scriptsTemplate.replace("{{exports}}", Object.keys(scriptsMap).map((key) => `"${key}": require("${scriptsMap[key]}")`).join(",\n\t")),
        {
            encoding: "utf-8",
        });
}