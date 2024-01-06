import { join } from "path/posix";
import { remove, stat, writeJSON } from "fs-extra";

import { SceneSerializer } from "babylonjs";

import { Editor } from "../../editor/main";

import { createDirectoryIfNotExist, normalizedGlob } from "../../tools/fs";

import { writeBinaryGeometry } from "./geometry";

export async function saveScene(editor: Editor, projectPath: string, scenePath: string): Promise<void> {
    const fStat = await stat(scenePath);
    if (!fStat.isDirectory()) {
        return editor.layout.console.log("The scene path is not a directory.");
    }

    const relativeScenePath = scenePath.replace(join(projectPath, "/"), "");

    await Promise.all([
        createDirectoryIfNotExist(join(scenePath, "nodes")),
        createDirectoryIfNotExist(join(scenePath, "meshes")),
        createDirectoryIfNotExist(join(scenePath, "lights")),
        createDirectoryIfNotExist(join(scenePath, "geometries")),
        createDirectoryIfNotExist(join(scenePath, "shadowGenerators")),
    ]);

    const scene = editor.layout.preview.scene;

    // Write geometries and meshes
    const savedFiles: string[] = [];

    await Promise.all(scene.meshes.map(async (mesh) => {
        const data = await SceneSerializer.SerializeMesh(mesh, false, false);

        await Promise.all(data.meshes?.map(async (mesh) => {
            const instantiatedMesh = scene.getMeshById(mesh.id);
            const geometry = data.geometries?.vertexData?.find((v) => v.id === mesh.geometryId);

            if (geometry) {
                const geometryFileName = `${geometry.id}.babylonbinarymeshdata`;

                mesh.delayLoadingFile = join(relativeScenePath, `geometries/${geometryFileName}`);
                mesh.boundingBoxMaximum = instantiatedMesh?.getBoundingInfo()?.maximum?.asArray() ?? [0, 0, 0];
                mesh.boundingBoxMinimum = instantiatedMesh?.getBoundingInfo()?.minimum?.asArray() ?? [0, 0, 0];
                mesh._binaryInfo = {};

                const geometryPath = join(scenePath, "geometries", geometryFileName);

                try {
                    await writeBinaryGeometry(geometryPath, geometry, mesh);

                    let geometryIndex = -1;
                    do {
                        geometryIndex = data.geometries!.vertexData!.findIndex((g) => g.id === mesh.geometryId);
                        if (geometryIndex !== -1) {
                            data.geometries!.vertexData!.splice(geometryIndex, 1);
                        }
                    } while (geometryIndex !== -1);
                } catch (e) {
                    editor.layout.console.log(`Failed to write geometry for mesh ${mesh.name}`);
                } finally {
                    savedFiles.push(geometryPath);
                }
            }

        }));

        const meshPath = join(scenePath, "meshes", `${mesh.id}.json`);

        try {
            await writeJSON(meshPath, data, {
                spaces: 4,
            });
        } catch (e) {
            editor.layout.console.log(`Failed to write mesh ${mesh.name}`);
        } finally {
            savedFiles.push(meshPath);
        }
    }));

    // Write transform nodes
    await Promise.all(scene.transformNodes.map(async (transformNode) => {
        const transformNodePath = join(scenePath, "nodes", `${transformNode.id}.json`);

        try {
            await writeJSON(transformNodePath, transformNode.serialize(), {
                spaces: 4,
            });
        } catch (e) {
            editor.layout.console.log(`Failed to write transform node ${transformNode.name}`);
        } finally {
            savedFiles.push(transformNodePath);
        }
    }));

    // Write lights
    await Promise.all(scene.lights.map(async (light) => {
        const lightPath = join(scenePath, "lights", `${light.id}.json`);

        try {
            await writeJSON(lightPath, light.serialize(), {
                spaces: 4,
            });
        } catch (e) {
            editor.layout.console.log(`Failed to write light ${light.name}`);
        } finally {
            savedFiles.push(lightPath);
        }

        const shadowGenerator = light.getShadowGenerator();
        if (shadowGenerator) {
            const shadowGeneratorPath = join(scenePath, "shadowGenerators", `${shadowGenerator.id}.json`);

            try {
                await writeJSON(shadowGeneratorPath, shadowGenerator.serialize(), {
                    spaces: 4,
                });
            } catch (e) {
                editor.layout.console.log(`Failed to write shadow generator for light ${light.name}`);
            } finally {
                savedFiles.push(shadowGeneratorPath);
            }
        }
    }));

    // Write configuration
    const configPath = join(scenePath, "config.json");

    try {
        await writeJSON(configPath, {
            environment: {
                environmentIntensity: scene.environmentIntensity,
                environmentTexture: scene.environmentTexture ? {
                    ...scene.environmentTexture.serialize(),
                    url: scene.environmentTexture.name,
                } : undefined,
            },
            editorCamera: editor.layout.preview.camera.serialize(),
        }, {
            spaces: 4,
        });
    } catch (e) {
        editor.layout.console.log(`Failed to write configuration.`);
    } finally {
        savedFiles.push(configPath);
    }

    // Remove old files
    const files = await normalizedGlob(join(scenePath, "/**"), {
        nodir: true,
    });

    await Promise.all(files.map(async (file) => {
        if (savedFiles.includes(file)) {
            return;
        }

        await remove(file);
    }));
}
