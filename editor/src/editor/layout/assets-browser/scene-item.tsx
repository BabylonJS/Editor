import { copy } from "fs-extra";
import { pathExists } from "fs-extra";
import { join, basename, dirname } from "path/posix";

import { ReactNode } from "react";

import { SiBabylondotjs } from "react-icons/si";
import { HiOutlineDuplicate } from "react-icons/hi";

import { renameScene } from "../../../tools/scene/rename";
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
        await renameScene(this.props.absolutePath, newAbsolutePath);

        // Refresh
        this.props.onRefresh();
        waitNextAnimationFrame().then(() => {
            this.props.editor.layout.assets.setSelectedFile(newAbsolutePath);
        });
    }
}
