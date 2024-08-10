import { pathExists, writeFile } from "fs-extra";
import { join, dirname, basename, extname } from "path/posix";

import sharp from "sharp";

import { getPowerOfTwoUntil } from "../../tools/maths/scalar";

import { Editor } from "../../editor/main";

import { compressFileToKtx } from "./ktx";

export async function handleComputeExportedTexture(editor: Editor, absolutePath: string, force: boolean): Promise<void> {
    const extension = extname(absolutePath).toLocaleLowerCase();

    const metadata = await sharp(absolutePath).metadata();
    if (!metadata.width || !metadata.height) {
        return editor.layout.console.error(`Failed to compute exported image "${absolutePath}". Image metadata is invalid.`);
    }

    const width = metadata.width;
    const height = metadata.height;

    const isPowerOfTwo = width === getPowerOfTwoUntil(width) || height === getPowerOfTwoUntil(height);

    type _DownscaledTextureSize = {
        width: number;
        height: number;
    };

    const availableSizes: _DownscaledTextureSize[] = [];

    let midWidth = (width * 0.66) >> 0;
    let midHeight = (height * 0.66) >> 0;

    if (isPowerOfTwo) {
        midWidth = getPowerOfTwoUntil(midWidth);
        midHeight = getPowerOfTwoUntil(midHeight);
    }

    availableSizes.push({
        width: midWidth,
        height: midHeight,
    });

    let lowWidth = (width * 0.33) >> 0;
    let lowHeight = (height * 0.33) >> 0;

    if (isPowerOfTwo) {
        lowWidth = getPowerOfTwoUntil(lowWidth);
        lowHeight = getPowerOfTwoUntil(lowHeight);
    }

    availableSizes.push({
        width: lowWidth,
        height: lowHeight,
    });

    for (const size of availableSizes) {
        const nameWithoutExtension = basename(absolutePath).replace(extension, "");
        const finalName = `${nameWithoutExtension}_${size.width}_${size.height}${extension}`;
        const finalPath = join(dirname(absolutePath), finalName);

        if (force || !await pathExists(finalPath)) {
            const log = await editor.layout.console.progress(`Exporting scaled image "${finalName}"`);

            try {
                const buffer = await sharp(absolutePath).resize(size.width, size.height).toBuffer();

                await writeFile(finalPath, buffer);

                log.setState({
                    done: true,
                    message: `Exported image scaled image "${finalName}"`,
                });
            } catch (e) {
                log.setState({
                    done: true,
                    error: true,
                    message: `Failed to export image scaled image "${finalName}"`,
                });
            }
        }

        await compressFileToKtx(editor, finalPath, undefined, force);
    }
}
