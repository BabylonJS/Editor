import { basename, dirname, join } from "path";
import filenamify from "filenamify/filenamify";
import { copyFile, pathExists, readdir, readJSON, stat, writeJSON } from "fs-extra";

import { Nullable } from "../../../../shared/types";

import { Scene, Material, Texture } from "babylonjs";

import { FSTools } from "../../tools/fs";

import { Overlay } from "../../gui/overlay";

import { Editor } from "../../editor";

import { IProject, IWorkSpace } from "../typings";

/**
 * This class is used to convert workspaces made using the version 4.0.x of the editor.
 * The version 4.1.0 comes with a full workspace-based assets browser and need to convert the previously
 * project-based assets.
 */
export class WorkspaceConverter {
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
            await Promise.all((project.filesList ?? []).map((f) => {
                return copyFile(join(projectRootUrl, f), join(projectAssetsDirectory, f));
            }));

            await Promise.all(project.assets.meshes.map((f) => {
                return copyFile(join(projectDirectory, "assets/meshes", f), join(projectAssetsDirectory, f));
            }));

            // Materials
            await Promise.all((project.materials ?? []).map(async (m) => {
                const materialPath = await this._ConvertMaterial(m, scene, p, projectDirectory, projectRootUrl, projectAssetsDirectory);
                if (materialPath) {
                    m.json = materialPath;
                }
            }));

            // Textures
            await Promise.all((project.textures ?? []).map((t) => this._ConvertTexture(t, p, projectDirectory)));

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
            if (!(texture instanceof Texture) || !texture.name || !texture.url || texture.name.indexOf("data:") === 0) {
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
