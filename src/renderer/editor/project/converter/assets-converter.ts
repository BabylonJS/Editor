import { basename, dirname, extname, join } from "path";
import filenamify from "filenamify";
import { copyFile, pathExists, readdir, readJSON, stat, writeJSON } from "fs-extra";

import { Nullable } from "../../../../shared/types";

import { Scene, Material, Texture, CubeTexture } from "babylonjs";

import { FSTools } from "../../tools/fs";

import { Overlay } from "../../gui/overlay";

import { Editor } from "../../editor";

import { IProject, IWorkSpace } from "../typings";

/**
 * This class is used to convert workspaces made using the version 4.0.x of the editor.
 * The version 4.1.0 comes with a full workspace-based assets browser and need to convert the previously
 * project-based assets.
 */
export class WorkspaceAssetsConverter {
    /**
     * Returns wether or not the workspace needs to be converted to fit new workspace-based assets.
     * @param workspacePath defines the path to the workspace file being opened.
     * @returns wether or not the workspace should be converted.
     */
    public static async NeedsConversion(workspacePath: string): Promise<boolean> {
        const workspace = await readJSON(workspacePath, { encoding: "utf-8" }) as IWorkSpace;
        if (!workspace.editorVersion) {
            return true;
        }

        return false;
    }

    /**
     * Converts the given workspace to the new workspace-based format.
     * @param workspacePath defines the path to the workspace file to convert.
     */
    public static async Convert(editor: Editor, workspacePath: string): Promise<void> {
        Overlay.Show("Converting...", true);

        const directory = dirname(workspacePath);
        const assetsDirectory = join(directory, "assets");
        const projectsDirectory = join(directory, "projects");

        const scene = new Scene(editor.engine!);

        // Create assets directory
        await FSTools.CreateDirectory(assetsDirectory);

        // For each project, convert
        const projects = await readdir(projectsDirectory);

        for (let i = 0; i < projects.length; i++) {
            Overlay.SetSpinnervalue((i + 1) / projects.length);

            const p = projects[i];

            const projectDirectory = join(projectsDirectory, p);
            const pStat = await stat(projectDirectory);

            if (!pStat.isDirectory()) {
                continue;
            }

            const projectPath = join(projectDirectory, "scene.editorproject");
            if (!(await pathExists(projectPath))) {
                continue;
            }

            const projectAssetsDirectory = join(assetsDirectory, p);
            await FSTools.CreateDirectory(projectAssetsDirectory);

            const projectRootUrl = join(projectDirectory, "files", "/");
            const project = await readJSON(projectPath, { encoding: "utf-8" }) as IProject;

            // Copy files
            project.filesList ??= [];
            await Promise.all(project.filesList.map((f) => {
                return copyFile(join(projectRootUrl, f), join(projectAssetsDirectory, f));
            }));

            await Promise.all(project.assets.meshes.map((f) => {
                return copyFile(join(projectDirectory, "assets/meshes", f), join(projectAssetsDirectory, f));
            }));

            // Graphs
            if (project.assets.graphs) {
                // Copy graph jsons
                await Promise.all(project.assets.graphs.map((g) => {
                    const extension = extname(g);
                    return copyFile(join(projectDirectory, "graphs", g), join(projectAssetsDirectory, `${g.replace(extension, ".graph")}`));
                }));

                // Remove previously generated graph ts files
                const srcSceneDirectories = await readdir(join(directory, "src/scenes"));
                await Promise.all(srcSceneDirectories.map(async (d) => {
                    const srcGraphsPath = join(directory, "src/scenes", d, "graphs");
                    if (!(await pathExists(srcGraphsPath))) {
                        return;
                    }

                    await FSTools.RemoveDirectory(srcGraphsPath);
                }));
            }

            // Materials
            project.materials ??= [];
            await Promise.all(project.materials.map(async (m) => {
                const materialPath = await this._ConvertMaterial(m, scene, p, projectDirectory, projectRootUrl, projectAssetsDirectory);
                if (materialPath) {
                    m.json = materialPath;
                }
            }));

            // Textures
            await Promise.all((project.textures ?? []).map((t) => this._ConvertTexture(t, p, projectDirectory)));

            // Particle systems
            project.particleSystems ??= [];
            await Promise.all(project.particleSystems.map(async (ps, index) => {
                project.particleSystems![index] = await this._ConvertParticlesSystem(p, ps as any, projectDirectory, projectAssetsDirectory);
            }));

            // Sounds
            project.sounds ??= [];
            await Promise.all(project.sounds.map((s) => this._ConvertSound(s, p, projectDirectory)));

            // Scene
            if (project.scene.environmentTexture) {
                project.scene.environmentTexture.name = project.scene.environmentTexture.url = join(p, basename(project.scene.environmentTexture.name));
            }

            await writeJSON(projectPath, project, {
                spaces: "\t",
                encoding: "utf-8",
            });
        }

        // Update workspace file
        const workspaceJson = await readJSON(workspacePath, { encoding: "utf-8" }) as IWorkSpace;
        workspaceJson.editorVersion = editor._packageJson.version;

        await writeJSON(workspacePath, workspaceJson, {
            spaces: "\t",
            encoding: "utf-8",
        });

        Overlay.Hide();
    }

    /**
     * Converts the given sound.
     */
    private static async _ConvertSound(s: string, p: string, projectDirectory: string): Promise<void> {
        const json = await readJSON(join(projectDirectory, "sounds", s), { encoding: "utf-8" });
        json.name = join(p, basename(json.name));

        await writeJSON(join(projectDirectory, "sounds", s), json, {
            spaces: "\t",
            encoding: "utf-8",
        });
    }

    /**
     * Converts the given particles system.
     */
    private static async _ConvertParticlesSystem(p: string, ps: string, projectDirectory: string, projectAssetsDirectory: string): Promise<any> {
        const json = await readJSON(join(projectDirectory, "particleSystems", ps as any), { encoding: "utf-8" });

        const editorPath = join(p, filenamify(`${json.name}-${json.id}.ps`));

        json.metadata = { editorPath };

        if (json.texture) {
            json.texture.name = json.texture.url = join(p, basename(json.texture.name));
        }

        await writeJSON(join(projectAssetsDirectory, basename(editorPath)), json, {
            spaces: "\t",
            encoding: "utf-8",
        });

        return {
            id: json.id,
            name: json.name,
            emitterId: json.emitterId,
            json: editorPath,
        };
    }

    /**
     * Converts the given texture.
     */
    private static async _ConvertTexture(t: string, p: string, projectDirectory: string): Promise<void> {
        const textureJson = await readJSON(join(projectDirectory, "textures", t), { encoding: "utf-8" });
        if (textureJson.name.indexOf("data:") === 0) {
            return;
        }

        textureJson.name = textureJson.url = join(p, basename(textureJson.name));

        await writeJSON(join(projectDirectory, "textures", t), textureJson, {
            spaces: "\t",
            encoding: "utf-8",
        });
    }

    /**
     * Converts the given material and its textures.
     */
    private static async _ConvertMaterial(m: any, scene: Scene, p: string, projectDirectory: string, projectRootUrl: string, projectAssetsDirectory: string): Promise<Nullable<string>> {
        const materialPath = join(projectDirectory, "materials", m.json);
        const materialJson = await readJSON(materialPath, { encoding: "utf-8" });

        const material = Material.Parse(materialJson, scene, materialJson.customType === "BABYLON.NodeMaterial" ? undefined! : projectRootUrl);
        if (!material) {
            return null;
        }

        const textures = material.getActiveTextures();

        for (const texture of textures) {
            if ((!(texture instanceof Texture) && !(texture instanceof CubeTexture)) || !texture.name || !texture.url || texture.name.indexOf("data:") === 0) {
                continue;
            }

            texture.name = join(p, basename(texture.name));
            texture.url = texture.name;
        }

        const materialName = filenamify(`${material.name}-${material.id}.material`);

        material.metadata = materialJson.metadata ?? {};
        material.metadata.editorPath = join(p, materialName);

        await writeJSON(join(projectAssetsDirectory, materialName), {
            ...material.serialize(),
            metadata: material.metadata,
        }, {
            spaces: "\t",
            encoding: "utf-8",
        });

        material.dispose(true, true);

        return join(p, materialName);
    }
}
