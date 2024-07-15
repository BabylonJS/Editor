import { join, basename } from "path/posix";
import { readJSON, remove, stat, writeJSON } from "fs-extra";

import { RenderTargetTexture, SceneSerializer } from "babylonjs";

import { Editor } from "../../editor/main";

import { isEditorCamera, isMesh } from "../../tools/guards/nodes";
import { createDirectoryIfNotExist, normalizedGlob } from "../../tools/fs";

import { serializeSSRRenderingPipeline } from "../../editor/rendering/ssr";
import { serializeSSAO2RenderingPipeline } from "../../editor/rendering/ssao";
import { serializeMotionBlurPostProcess } from "../../editor/rendering/motion-blur";
import { serializeDefaultRenderingPipeline } from "../../editor/rendering/default-pipeline";

import { writeBinaryGeometry } from "../geometry";

export async function saveScene(editor: Editor, projectPath: string, scenePath: string): Promise<void> {
    const fStat = await stat(scenePath);
    if (!fStat.isDirectory()) {
        return editor.layout.console.error("The scene path is not a directory.");
    }

    const relativeScenePath = scenePath.replace(join(projectPath, "/"), "");

    await Promise.all([
        createDirectoryIfNotExist(join(scenePath, "lods")),
        createDirectoryIfNotExist(join(scenePath, "nodes")),
        createDirectoryIfNotExist(join(scenePath, "meshes")),
        createDirectoryIfNotExist(join(scenePath, "lights")),
        createDirectoryIfNotExist(join(scenePath, "cameras")),
        createDirectoryIfNotExist(join(scenePath, "geometries")),
        createDirectoryIfNotExist(join(scenePath, "skeletons")),
        createDirectoryIfNotExist(join(scenePath, "shadowGenerators")),
    ]);

    const scene = editor.layout.preview.scene;

    // Write geometries and meshes
    const savedFiles: string[] = [];

    await Promise.all(scene.meshes.map(async (mesh) => {
        if (!isMesh(mesh) || mesh._masterMesh) {
            return;
        }

        const meshes = [mesh, ...mesh.getLODLevels().map((lodLevel) => lodLevel.mesh)];

        const results = await Promise.all(meshes.map(async (meshToSerialize) => {
            if (!meshToSerialize) {
                return null;
            }

            const data = await SceneSerializer.SerializeMesh(meshToSerialize, false, false);
            delete data.skeletons;

            if (meshToSerialize._masterMesh) {
                delete data.materials;
            }

            data.metadata = meshToSerialize.metadata;
            data.basePoseMatrix = meshToSerialize.getPoseMatrix().asArray();

            if (meshToSerialize.morphTargetManager) {
                data.morphTargetManager = meshToSerialize.morphTargetManager.serialize();
            }

            data.meshes?.[0]?.instances?.forEach((instanceData: any) => {
                const instance = meshToSerialize.instances.find((instance) => instance.id === instanceData.id);
                if (instance) {
                    instanceData.uniqueId = instance.uniqueId;
                }
            });

            const lodLevel = mesh.getLODLevels().find((lodLevel) => lodLevel.mesh === meshToSerialize);
            if (lodLevel) {
                data.masterMeshId = mesh.id;
                data.distanceOrScreenCoverage = lodLevel.distanceOrScreenCoverage;
            }

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
                        editor.layout.console.error(`Failed to write geometry for mesh ${mesh.name}`);
                    } finally {
                        savedFiles.push(geometryPath);
                    }
                }
            }));

            return data;
        }));

        await Promise.all(results.slice(0).reverse().map(async (result, index) => {
            if (!result) {
                return;
            }

            let meshPath: string;
            if (result === results[0]) {
                meshPath = join(scenePath, "meshes", `${mesh.id}.json`);
            } else {
                meshPath = join(scenePath, "lods", `${mesh.id}-lod${index}.json`);
                results[0].lods ??= [];
                results[0].lods.push(basename(meshPath));
            }

            try {
                await writeJSON(meshPath, result, {
                    spaces: 4,
                });
            } catch (e) {
                editor.layout.console.error(`Failed to write mesh ${mesh.name}`);
            } finally {
                savedFiles.push(meshPath);
            }
        }));
    }));

    // Write skeletons
    await Promise.all(scene.skeletons.map(async (skeleton) => {
        const skeletonPath = join(scenePath, "skeletons", `${skeleton.id}.json`);

        try {
            await writeJSON(skeletonPath, skeleton.serialize(), {
                spaces: 4,
            });
        } catch (e) {
            editor.layout.console.error(`Failed to write skeleton ${skeleton.name}`);
        } finally {
            savedFiles.push(skeletonPath);
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
            editor.layout.console.error(`Failed to write transform node ${transformNode.name}`);
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
            editor.layout.console.error(`Failed to write light ${light.name}`);
        } finally {
            savedFiles.push(lightPath);
        }

        const shadowGenerator = light.getShadowGenerator();
        if (shadowGenerator) {
            const shadowGeneratorPath = join(scenePath, "shadowGenerators", `${shadowGenerator.id}.json`);

            try {
                const shadowGeneratorData = shadowGenerator.serialize();
                shadowGeneratorData.refreshRate = shadowGenerator.getShadowMap()?.refreshRate ?? RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;

                await writeJSON(shadowGeneratorPath, shadowGeneratorData, {
                    spaces: 4,
                });
            } catch (e) {
                editor.layout.console.error(`Failed to write shadow generator for light ${light.name}`);
            } finally {
                savedFiles.push(shadowGeneratorPath);
            }
        }
    }));

    // Write cameras
    await Promise.all(scene.cameras.map(async (camera) => {
        if (isEditorCamera(camera)) {
            return;
        }

        const cameraPath = join(scenePath, "cameras", `${camera.id}.json`);

        try {
            await writeJSON(cameraPath, camera.serialize(), {
                spaces: 4,
            });
        } catch (e) {
            editor.layout.console.error(`Failed to write camera ${camera.name}`);
        } finally {
            savedFiles.push(cameraPath);
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
            fog: {
                fogEnabled: scene.fogEnabled,
                fogMode: scene.fogMode,
                fogStart: scene.fogStart,
                fogEnd: scene.fogEnd,
                fogDensity: scene.fogDensity,
                fogColor: scene.fogColor.asArray(),
            },
            rendering: {
                ssrRenderingPipeline: serializeSSRRenderingPipeline(),
                motionBlurPostProcess: serializeMotionBlurPostProcess(),
                ssao2RenderingPipeline: serializeSSAO2RenderingPipeline(),
                defaultRenderingPipeline: serializeDefaultRenderingPipeline(),
            },
            metadata: scene.metadata,
            editorCamera: editor.layout.preview.camera.serialize(),
            animationGroups: scene.animationGroups?.map((animationGroup) => animationGroup.serialize()),
        }, {
            spaces: 4,
        });
    } catch (e) {
        editor.layout.console.error(`Failed to write configuration.`);
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

    // Update material files
    const materialFiles = await normalizedGlob(join(projectPath, "/**/*.material"), {
        nodir: true,
    });

    await Promise.all(materialFiles.map(async (file) => {
        const data = await readJSON(file);
        const uniqueId = data.uniqueId;

        if (!uniqueId) {
            return;
        }

        const material = scene.materials.find((material) => material.uniqueId === uniqueId);
        if (!material) {
            return;
        }

        await writeJSON(file, material.serialize(), {
            spaces: "\t",
            encoding: "utf-8",
        });
    }));
};
