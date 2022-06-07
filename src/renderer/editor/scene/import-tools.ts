import filenamify from "filenamify";
import { basename, dirname, extname, join } from "path";
import { pathExists, readJSON, writeJSON } from "fs-extra";

import { Nullable } from "../../../shared/types";

import {
    CubeTexture, IParticleSystem, ISceneLoaderAsyncResult, Material, Mesh, MultiMaterial, Node, Scene, Skeleton,
    Texture, TransformNode,
} from "babylonjs";

import { Tools } from "../tools/tools";
import { GLTFTools } from "../tools/gltf";

import { Overlay } from "../gui/overlay";

import { Editor } from "../editor";

export interface ISceneImporterToolsConfiguration {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
    /**
     * Defines wether or not the scene to configure its nodes are coming from a GLTF file.
     */
    isGltf: boolean;
    /**
     * Defines the relative path (from workspace) to the scene's file.
     */
    relativePath: string;
    /**
     * Defines the absolute path to the scene's file.
     */
    absolutePath: string;
    /**
     * Defines the result of the scene loader containing the meshes, skeletons etc.
     */
    result: ISceneLoaderAsyncResult;
}

export class SceneImporterTools {
    /**
     * Configures the given scene loader result contained in the given scene (id, material files etc.).
     * @param scene defines the reference to the scene containing the elements to configure.
     * @param configuration defines the configuration containing the information for the elements to configure.
     */
    public static async Configure(scene: Scene, configuration: ISceneImporterToolsConfiguration): Promise<Node> {
        const parentNode = new TransformNode(basename(configuration.relativePath));
        parentNode.id = Tools.RandomId();

        await Promise.all([
            this.ConfigureMeshes(configuration, parentNode),
            this.ConfigureTransformNodes(configuration.result.transformNodes, parentNode),
            this.ConfigureSkeletons(configuration.result.skeletons, scene),
            this.ConfigureParticleSystems(configuration.result.particleSystems),
        ]);

        const children = parentNode.getChildren();
        if (children.length <= 1) {
            const child = children[0];
            child.parent = null;

            parentNode.dispose(true, false);

            configuration.editor.graph.refresh();

            return child;
        } else {
            return parentNode;
        }
    }

    /**
     * Configures the given imported particle systems.
     */
    public static ConfigureParticleSystems(particleSystems: IParticleSystem[]): void {
        particleSystems.forEach((ps) => {
            ps.id = Tools.RandomId();
        });
    }

    /**
     * Configures the given imported skeletons.
     */
    public static ConfigureSkeletons(skeletons: Skeleton[], scene: Scene): void {
        skeletons.forEach((s) => {
            // Skeleton Ids are not strings but numbers
            let id = 0;
            while (scene.getSkeletonById(id as any)) {
                id++;
            }

            s.id = id as any;
            s.bones.forEach((b) => {
                b.id = Tools.RandomId();

                b.metadata ??= {};
                b.metadata.originalId = b.id;
            });
        });
    }

    /**
     * Configures the given imported transform nodes.
     */
    public static ConfigureTransformNodes(transformNodes: TransformNode[], parent: Nullable<TransformNode>): void {
        transformNodes.forEach((tn) => {
            tn.id = Tools.RandomId();

            if (!tn.parent) {
                tn.parent = parent;
            }
        });
    }

    /**
     * Configures the given imported transform nodes.
     */
    public static async ConfigureMeshes(configuration: ISceneImporterToolsConfiguration, parent: TransformNode): Promise<void> {
        for (const m of configuration.result.meshes) {
            m.metadata ??= {};
            m.metadata.basePoseMatrix = m.getPoseMatrix().asArray();

            if (!m.parent) {
                m.parent = parent;
            }

            if (m.material) {
                this.ConfigureMaterial(m.material, configuration).then((material) => {
                    if (m instanceof Mesh) {
                        m.material = material;
                    }
                });
            }

            if (m instanceof Mesh) {
                const meshMetadata = Tools.GetMeshMetadata(m);
                meshMetadata.originalSourceFile = {
                    id: m.id,
                    name: m.name,
                    sceneFileName: configuration.relativePath,
                };

                if (m.geometry) {
                    m.geometry.id = Tools.RandomId();
                }
            }

            m.id = Tools.RandomId();
        };
    }

    /**
     * Configures the given imported material.
     */
    public static async ConfigureMaterial(material: Material, configuration: ISceneImporterToolsConfiguration, force: boolean = false): Promise<Material> {
        if (!(material instanceof MultiMaterial)) {
            if (configuration.isGltf) {
                Overlay.Show("Configuring GLTF...");
            }

            const instantiatedMaterial = await this._GetEffectiveMaterial(material, configuration, force);
            if (instantiatedMaterial) {
                Overlay.Hide();
                return instantiatedMaterial;
            }

            this._ConfigureMaterialTextures(material, configuration).then(() => {
                Overlay.Hide();

                const materialMetadata = Tools.GetMaterialMetadata(material);
                materialMetadata.originalSourceFile = materialMetadata.originalSourceFile ?? {
                    id: material.id,
                    name: material.name,
                    sceneFileName: configuration.relativePath,
                };

                material.id = Tools.RandomId();

                this._WriteMaterialFile(material, configuration);
            });
        }

        if (material instanceof MultiMaterial) {
            for (let i = 0; i < material.subMaterials.length; i++) {
                const m = material.subMaterials[i];
                if (!m) {
                    continue;
                }

                if (configuration.isGltf) {
                    Overlay.Show("Configuring GLTF...");
                    m.sideOrientation = Material.ClockWiseSideOrientation;
                }

                const instantiatedMaterial = await this._GetEffectiveMaterial(m, configuration, force);
                if (instantiatedMaterial) {
                    Overlay.Hide();
                    material.subMaterials[i] = instantiatedMaterial;
                    continue;
                }

                this._ConfigureMaterialTextures(m, configuration).then(() => {
                    Overlay.Hide();
                    
                    const subMaterialMetadata = Tools.GetMaterialMetadata(m);
                    subMaterialMetadata.originalSourceFile = subMaterialMetadata.originalSourceFile ?? {
                        id: m.id,
                        name: m.name,
                        sceneFileName: configuration.relativePath,
                    };

                    m.id = Tools.RandomId();

                    this._WriteMaterialFile(m, configuration);
                });
            };
        }

        configuration.editor.assetsBrowser.refresh();

        return material;
    }

    /**
     * Writes the given material.
     */
    private static async _WriteMaterialFile(material: Material, configuration: ISceneImporterToolsConfiguration): Promise<void> {
        configuration.editor.console.logInfo(`Saved material configuration: ${material.metadata.editorPath}`);

        const serializationObject = material.serialize();
        try {
            serializationObject.metadata = Tools.CloneObject(material.metadata);
        } catch (e) {
            // Catch silently.
        }

        writeJSON(join(dirname(configuration.absolutePath), basename(material.metadata.editorPath)), serializationObject, {
            spaces: "\t",
            encoding: "utf-8",
        });
    }

    /**
     * Creates the given material file.
     */
    private static async _GetEffectiveMaterial(material: Material, configuration: ISceneImporterToolsConfiguration, force: boolean = false): Promise<Nullable<Material>> {
        const materialFilename = filenamify(`${material.name ?? basename(configuration.absolutePath)}-${material.id ?? Tools.RandomId()}.material`);
        const materialPath = join(dirname(configuration.absolutePath), materialFilename);

        material.metadata ??= {};
        material.metadata.editorPath = join(dirname(configuration.relativePath), materialFilename);

        const exists = force ? false : await pathExists(materialPath);

        if (exists) {
            const json = await readJSON(materialPath, { encoding: "utf-8" });

            material.dispose(true, true);

            let instantiatedMaterial = configuration.editor.scene!.materials.find((m) => {
                return m.id === json.id;
            }) ?? null;

            if (instantiatedMaterial) {
                return instantiatedMaterial;
            }

            instantiatedMaterial = Material.Parse(
                json,
                configuration.editor.scene!,
                join(configuration.editor.assetsBrowser.assetsDirectory, "/"),
            );

            if (instantiatedMaterial && json.metadata) {
                try {
                    instantiatedMaterial.metadata = Tools.CloneObject(json.metadata);
                } catch (e) { }
            }

            return instantiatedMaterial;
        }

        return null;
    }

    /**
     * In case of GLTF, texture, write all the files.
     */
    private static async _ConfigureMaterialTextures(material: Material, configuration: ISceneImporterToolsConfiguration): Promise<void> {
        const textures = material.getActiveTextures()
            .filter((t) => !t.isRenderTarget && (t instanceof Texture || t instanceof CubeTexture))
            .filter((t) => !t.metadata?.editorDone);

        if (configuration.isGltf) {
            for (const tex of textures) {
                if (!(tex instanceof Texture)) {
                    continue;
                }

                tex.metadata ??= {};
                tex.metadata.editorDone = true;

                if (tex.url?.startsWith("data:/")) {
                    tex.url = tex.name = filenamify(`${tex.name}.png`);
                }

                const mimeType = tex["_mimeType"];
                if (mimeType) {
                    const existingExtension = extname(tex.name);
                    const targetExtension = Tools.GetExtensionFromMimeType(mimeType);
                    const relativePath = join(dirname(configuration.relativePath), basename(tex.name));

                    if (existingExtension !== targetExtension) {
                        tex.name = `${relativePath}${targetExtension}`;
                    } else {
                        tex.name = relativePath;
                    }
                } else {
                    tex.name = join(dirname(configuration.relativePath), basename(tex.url ?? tex.name));
                }

                if (tex.url) {
                    tex.url = tex.name;
                }
            }

            await GLTFTools.TexturesToFiles(dirname(configuration.absolutePath), textures);
            await configuration.editor.assetsBrowser.refresh();
        } else {
            textures.forEach((tex: Texture) => {
                tex.name = join(dirname(configuration.relativePath), basename(tex.name));
                if (tex.url) {
                    tex.url = tex.name;
                }
            });
        }
    }
}
