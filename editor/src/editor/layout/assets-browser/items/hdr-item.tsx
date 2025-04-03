import { writeFile } from "fs-extra";

import { ReactNode } from "react";
import { SiConvertio } from "react-icons/si";
import { MdOutlineHdrOn } from "react-icons/md";

import { EnvironmentTextureTools, HDRCubeTexture } from "babylonjs";

import { SpinnerUIComponent } from "../../../../ui/spinner";
import { ContextMenuItem } from "../../../../ui/shadcn/ui/context-menu";

import { AssetsBrowserItem } from "./item";

const convertingFiles: string[] = [];

export class AssetBrowserHDRItem extends AssetsBrowserItem {
    /**
     * @override
     */
    protected getContextMenuContent(): ReactNode {
        return (
            <>
                <ContextMenuItem className="flex items-center gap-2" onClick={() => this._handleConvertToEnv()}>
                    <SiConvertio className="w-5 h-5" /> Convert to .env
                </ContextMenuItem>
            </>
        );
    }

    /**
     * @override
     */
    protected getIcon(): ReactNode {
        const index = convertingFiles.indexOf(this.props.absolutePath);
        if (index !== -1) {
            return <SpinnerUIComponent width="64px" />;
        }

        return (
            <MdOutlineHdrOn size="64px" />
        );
    }

    private async _handleConvertToEnv(): Promise<void> {
        const selectedFiles = this.props.editor.layout.assets.state.selectedKeys;
        await Promise.all(selectedFiles.map(async (file) => {
            if (convertingFiles.includes(file)) {
                return;
            }

            convertingFiles.push(file);
            this.props.onRefresh();

            const hdr = new HDRCubeTexture(file, this.props.editor.layout.preview.scene, 512, false, true, false, false);

            hdr.onLoadObservable.addOnce(async () => {
                try {
                    const envBuffer = await EnvironmentTextureTools.CreateEnvTextureAsync(hdr, {
                        imageQuality: 1,
                    });

                    await writeFile(`${file}.env`, Buffer.from(envBuffer));

                    const index = convertingFiles.indexOf(file);
                    if (index !== -1) {
                        convertingFiles.splice(index, 1);
                    }

                    this.props.onRefresh();
                } catch (e) {
                    // Catch silently.
                } finally {
                    hdr.dispose();
                }
            });
        }));
    }
}
