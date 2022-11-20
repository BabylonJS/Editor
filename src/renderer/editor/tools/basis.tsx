import { shell } from "electron";
import { basename, dirname, extname, join } from "path";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Icon, Spinner } from "@blueprintjs/core";

import { Editor } from "../editor";

import { WorkSpace } from "../project/workspace";

import { EditorProcess, IEditorProcess } from "./process";
import { FitAddon } from "xterm-addon-fit";

export class BasisTools {
    private static _SupportedExtensions: string[] = [".png", ".jpg", ".jpeg", ".bmp"];

    /**
     * Returns the of the given texture path by applying the ktx extension to it.
     * @param texturePath defines the path to the texture to gets its Ktx name.
     * @param type defines the type of ktx file to use.
     */
    public static GetBasisFileName(texturePath: string): string {
        const name = basename(texturePath);
        const dir = dirname(texturePath);

        return join(dir, `${name.substr(0, name.lastIndexOf("."))}.basis`);
    }

    /**
     * Compresses the given texture using the given texture compression type.
     * @param editor defines the reference to the editor.
     * @param texturePath defines the absolute path to the texture to compress.
     * @param destinationFolder defines the destination folder where the compressed texutre file will be written.
     * @param type defines compression type to apply on the texture.
     */
    public static async CompressTexture(editor: Editor, texturePath: string, destinationFolder: string): Promise<void> {
        if (!WorkSpace.Workspace?.basisCompressedTextures?.enabled) {
            return;
        }

        const name = basename(texturePath);
        const extension = extname(name).toLocaleLowerCase();

        if (this._SupportedExtensions.indexOf(extension) === -1) {
            return;
        }

        let editorProcess: Nullable<IEditorProcess> = null;

        const destination = `${destinationFolder}/${this.GetBasisFileName(name)}`;
        const command = `toktx --genmipmap --uastc 4 --zcmp 18 --verbose ${destination} ${texturePath}`;

        const log = await editor.console.createLog();

        try {
            editorProcess = EditorProcess.ExecuteCommand(command);

            await log.setBody(
                <div style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
                    <div style={{ float: "left" }}>
                        <Spinner size={16} />
                    </div>
                    <Icon icon="stop" intent="danger" onClick={() => editorProcess?.kill()} />
                    <span>Compressing texture </span>
                    <a style={{ color: "grey" }}>{name}</a>

                    <div
                        style={{ width: "100%", height: "80px", margin: "15px" }}
                        ref={(r) => {
                            if (r) {
                                const f = new FitAddon();

                                editorProcess?.terminal.open(r);
                                editorProcess?.terminal.loadAddon(f);
                                editorProcess?.terminal.setOption("theme", {
                                    background: "#00000000",
                                });

                                try {
                                    f.fit();
                                } catch (e) {
                                    // Catch silently.
                                }
                            }
                        }}
                    >
                    </div>
                </div>
            );

            await editorProcess?.wait();

            log.setBody(
                <div style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
                    <Icon icon="endorsed" intent="success" />
                    <span>Basis texture available at </span>
                    <a style={{ color: "grey" }}>{destination}</a>
                </div>
            );
        } catch (e) {
            log.setBody(
                <div style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
                    <Icon icon="endorsed" intent="warning" />
                    <span style={{ color: "yellow" }}>Failed to compress Basis texture at </span>
                    <a style={{ color: "grey" }} onClick={() => shell.showItemInFolder(dirname(texturePath))}>{texturePath}</a>
                </div>
            );
        }
    }
}
