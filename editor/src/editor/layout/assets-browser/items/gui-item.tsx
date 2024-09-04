import { readJSON } from "fs-extra";
import { ipcRenderer } from "electron";

import { ReactNode } from "react";

import { GiGuitar } from "react-icons/gi";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserGUIItem extends AssetsBrowserItem {
    private _base64Value: string | null;

    public async componentDidMount(): Promise<void> {
        super.componentDidMount();

        const data = await readJSON(this.props.absolutePath);
        if (data.base64String) {
            this._base64Value = data.base64String;
            this.forceUpdate();
        }
    }

    /**
     * @override
     */
    protected getIcon(): ReactNode {
        return this._base64Value
            ? <img src={this._base64Value} className="w-[64px] h-[64px] object-contain" />
            : <GiGuitar size="64px" />;
    }

    /**
     * @override
     */
    protected async onDoubleClick(): Promise<void> {
        ipcRenderer.send("window:open", "build/src/editor/windows/ge", {
            filePath: this.props.absolutePath,
        });
    }
}
