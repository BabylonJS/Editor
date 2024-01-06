import { writeJSON } from "fs-extra";

import { ReactNode } from "react";
import { MenuItem } from "@blueprintjs/core";

import { SiConvertio } from "react-icons/si";
import { BiSolidCube } from "react-icons/bi";

import { Scene, SceneSerializer } from "babylonjs";

import { SpinnerUIComponent } from "../../../ui/spinner";

import { loadImportedSceneFile } from "../preview/import";

import { AssetsBrowserItem } from "./item";

const convertingFiles: string[] = [];

export class AssetBrowserMeshItem extends AssetsBrowserItem {
    /**
     * @override
     */
    protected getContextMenuContent(): ReactNode {
        return (
            <>
                <MenuItem icon={<SiConvertio className="w-4 h-4" color="white" />} text="Convert to .babylon" onClick={() => this._handleConvertSceneFileToBabylon()} />
            </>
        );
    }

    protected getIcon(): ReactNode {
        const index = convertingFiles.indexOf(this.props.absolutePath);
        if (index !== -1) {
            return <SpinnerUIComponent width="80px" />;
        }

        return <BiSolidCube size="80px" />;
    }

    private async _handleConvertSceneFileToBabylon(): Promise<void> {
        convertingFiles.push(this.props.absolutePath);
        this.props.onRefresh();

        const scene = new Scene(this.props.editor.layout.preview.engine);
        await loadImportedSceneFile(scene, this.props.absolutePath);

        const data = await SceneSerializer.SerializeAsync(scene);
        await writeJSON(`${this.props.absolutePath}.babylon`, data, "utf-8");

        const index = convertingFiles.indexOf(this.props.absolutePath);
        if (index !== -1) {
            convertingFiles.splice(index, 1);
        }

        this.props.onRefresh();
    }
}
