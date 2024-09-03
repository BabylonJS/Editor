import { readJSON } from "fs-extra";
import { ipcRenderer } from "electron";

import { ReactNode } from "react";

import { GiMaterialsScience } from "react-icons/gi";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserMaterialItem extends AssetsBrowserItem {
    /**
     * @override
     */
    protected getIcon(): ReactNode {
        return <GiMaterialsScience size="64px" />;
    }

    /**
     * @override
     */
    protected async onDoubleClick(): Promise<void> {
        const data = await readJSON(this.props.absolutePath);
        if (data.customType === "BABYLON.NodeMaterial") {
            ipcRenderer.send("window:open", "build/src/editor/windows/nme", {
                filePath: this.props.absolutePath,
            });
        }
    }
}
