import { pathExists } from "fs-extra";
import { basename, extname, join, dirname } from "path/posix";

import { PNG } from "pngjs";
import { createReadStream } from "fs";

import { Editor } from "../../editor/main";
import { executeAsync } from "../../tools/process";

export type KTXToolsType = "-astc.ktx" | "-dxt.ktx" | "-pvrtc.ktx" | "-etc1.ktx" | "-etc2.ktx";

export const allKtxFormats: KTXToolsType[] = [
    "-astc.ktx", "-dxt.ktx", "-pvrtc.ktx", "-etc1.ktx", "-etc2.ktx",
];

export const ktxSupportedextensions: string[] = [
    ".png", ".jpg", ".jpeg", ".bmp"
];

/**
 * Returns the absolute path to the compressed textures CLI path (PVRTexTool).
 * The value is retrieved from the local storage so it's per computer and not per project.
 */
export function getCompressedTexturesCliPath() {
    let value = "";

    try {
        value = localStorage.getItem("editor-compressed-textures-cli-path") ?? "";
    } catch (e) {
        // Catch silently.
    }

    return value || null;
}

/**
 * Sets the absolute path to the compressed textures CLI path (PVRTexTool).
 * The value is stored in the local storage so it's per computer and not per project.
 */
export function setCompressedTexturesCliPath(absolutePath: string) {
    try {
        localStorage.setItem("editor-compressed-textures-cli-path", absolutePath);
    } catch (e) {
        // Catch silently.
    }
}

export async function compressFileToKtx(editor: Editor, absolutePath: string, format?: KTXToolsType, force?: boolean): Promise<void> {
    if (format) {
        await compressFileToKtxFormat(editor, absolutePath, format, force);
    } else {
        await Promise.all(allKtxFormats.map((f) => compressFileToKtxFormat(editor, absolutePath, f, force)));
    }
}

export function t() {

}

export async function compressFileToKtxFormat(editor: Editor, absolutePath: string, format: KTXToolsType, force?: boolean): Promise<void> {
    if (!editor.state.compressedTexturesEnabled) {
        return;
    }

    const cliPath = getCompressedTexturesCliPath();
    if (!cliPath) {
        return;
    }

    const name = basename(absolutePath);
    const extension = extname(name).toLocaleLowerCase();

    if (!ktxSupportedextensions.includes(extension)) {
        return;
    }

    const filename = `${name.substring(0, name.lastIndexOf("."))}${format}`;
    const destination = join(dirname(absolutePath), filename);

    if (await pathExists(destination) && !force) {
        return;
    }

    const hasAlpha = await new Promise<boolean>((resolve) => {
        const stream = createReadStream(absolutePath);

        stream
            .pipe(new PNG())
            .on("metadata", (p) => {
                resolve(p.alpha);
                stream.close();
            })
            .on("error", () => {
                resolve(false);
                stream.close();
            });
    });

    let command: string | null = null;
    switch (format) {
        case "-astc.ktx":
            command = `"${cliPath}" -i "${absolutePath}" -flip y -pot + -m -dither -ics lRGB -f ASTC_8x8,UBN,lRGB -q astcveryfast -o "${destination}"`;
            break;

        case "-dxt.ktx":
            command = `"${cliPath}" -i "${absolutePath}" -flip y -pot + -m -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "BC2" : "BC1"},UBN,lRGB -o "${destination}"`;
            break;

        case "-pvrtc.ktx":
            command = `"${cliPath}" -i "${absolutePath}" -flip y -pot + -square + -m -dither -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "PVRTCI_2BPP_RGBA" : "PVRTCI_2BPP_RGB"},UBN,lRGB -q pvrtcfastest -o "${destination}"`;
            break;

        case "-etc1.ktx":
            command = `"${cliPath}" -i "${absolutePath}" -flip y -pot + -m -dither -ics lRGB -f ETC1,UBN,lRGB -q etcfast -o "${destination}"`;
            break;

        case "-etc2.ktx":
            command = `"${cliPath}" -i "${absolutePath}" -flip y -pot + -m -dither -ics lRGB -f ${hasAlpha ? "ETC2_RGBA" : "ETC2_RGB"},UBN,lRGB -q etcfast -o "${destination}"`;
            break;
    }

    if (!command) {
        return;
    }

    const log = await editor.layout.console.progress(`Compressing image "${filename}"`);

    try {
        await executeAsync(command);

        log.setState({
            done: true,
            message: `Compressed image "${filename}"`,
        });
    } catch (e) {
        log.setState({
            done: true,
            error: true,
            message: `Failed to compress image "${filename}"`,
        });
    }
}
