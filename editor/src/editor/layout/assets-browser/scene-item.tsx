import { copy, readdir } from "fs-extra";
import { join, basename, dirname } from "path/posix";
import { pathExists, readJSON, writeJson } from "fs-extra";

import { ReactNode } from "react";

import { SiBabylondotjs } from "react-icons/si";
import { HiOutlineDuplicate } from "react-icons/hi";

import { waitNextAnimationFrame } from "../../../tools/tools";

import { ContextMenuItem } from "../../../ui/shadcn/ui/context-menu";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserSceneItem extends AssetsBrowserItem {
    /**
     * @override
     */
    protected getContextMenuContent(): ReactNode {
        return (
            <>
                <ContextMenuItem className="flex items-center gap-2" onClick={() => this._handleDuplicate()}>
                    <HiOutlineDuplicate className="w-5 h-5" /> Duplicate
                </ContextMenuItem>
            </>
        );
    }

    /**
     * @override
     */
    protected getIcon(): ReactNode {
        return <SiBabylondotjs size="64px" />;
    }

    private async _handleDuplicate(): Promise<void> {
        const dir = dirname(this.props.absolutePath);
        const name = basename(this.props.absolutePath, ".scene");

        // Choose name
        let index: number | undefined = undefined;
        while (await pathExists(join(dir, `${name}${index !== undefined ? ` ${index}` : ""}.scene`))) {
            index ??= 0;
            ++index;
        }

        const newName = `${name}${index !== undefined ? ` ${index}` : ""}.scene`;
        const newAbsolutePath = join(dir, newName);

        // Copy scene folder
        await copy(this.props.absolutePath, newAbsolutePath);

        // Update relative paths related to scene (geometries, etc.).
        const [meshesFiles, lodsFiles] = await Promise.all([
            readdir(join(newAbsolutePath, "meshes")),
            readdir(join(newAbsolutePath, "lods")),
        ]);

        await Promise.all([
            Promise.all(meshesFiles.map(async (file) => {
                const data = await readJSON(join(newAbsolutePath, "meshes", file));

                try {
                    data.meshes.forEach((mesh) => {
                        mesh.delayLoadingFile = mesh.delayLoadingFile.replace(`assets/${name}.scene/`, `assets/${newName}/`);
                    });

                    await writeJson(join(newAbsolutePath, "meshes", file), data, {
                        spaces: 4
                    });
                } catch (e) {
                    // Catch silently.
                }
            })),
            Promise.all(lodsFiles.map(async (file) => {
                const data = await readJSON(join(newAbsolutePath, "lods", file));

                try {
                    data.meshes.forEach((mesh) => {
                        mesh.delayLoadingFile = mesh.delayLoadingFile.replace(`assets/${name}.scene/`, `assets/${newName}/`);
                    });

                    await writeJson(join(newAbsolutePath, "lods", file), data, {
                        spaces: 4
                    });
                } catch (e) {
                    // Catch silently.
                }
            })),
        ]);

        // Refresh
        this.props.onRefresh();
        waitNextAnimationFrame().then(() => {
            this.props.editor.layout.assets.setSelectedFile(newAbsolutePath);
        });
    }
}
