import { open, read } from "fs-extra";
import { basename, dirname, extname, join } from "path";

import { Nullable } from "../../../shared/types";

import { Editor } from "../editor";

import { WorkSpace } from "../project/workspace";
import { ExecTools } from "./exec";

/**
 * Defines the possibile types of texture to be compressed.
 */
export type KTXToolsType = "-astc.ktx" | "-dxt.ktx" | "-pvrtc.ktx" | "-etc1.ktx" | "-etc2.ktx";

export class KTXTools {
	private static _SupportedExtensions: string[] = [".png", ".jpg", ".jpeg"];

	public static GetKtxFileName(texturePath: string, type: KTXToolsType): string {
		const name = basename(texturePath);
		const dir = dirname(texturePath);

		return join(dir, `${name.substr(0, name.lastIndexOf("."))}${type}`);
	}

	/**
	 * Compresses the given texture using the given texture compression type.
	 * @param editor defines the reference to the editor.
	 * @param texturePath defines the absolute path to the texture to compress.
	 * @param destinationFolder defines the destination folder where the compressed texutre file will be written.
	 * @param type defines compression type to apply on the texture.
	 */
	public static async CompressTexture(editor: Editor, texturePath: string, destinationFolder: string, type: KTXToolsType): Promise<void> {
		const ktx2CompressedTextures = WorkSpace.Workspace?.ktx2CompressedTextures;
		if (!ktx2CompressedTextures?.enabled || !ktx2CompressedTextures.pvrTexToolCliPath) {
			return;
		}

		const name = basename(texturePath);
		const extension = extname(name).toLocaleLowerCase();

		if (KTXTools._SupportedExtensions.indexOf(extension) === -1) {
			return;
		}

		const filename = `${name.substr(0, name.lastIndexOf("."))}${type}`;
		const destination = join(destinationFolder, filename);

		let hasAlpha = extension === ".png";
		if (hasAlpha) {
			const buffer = new Buffer(1);
			const fd = await open(texturePath, "r");
			const readResult = await read(fd, buffer, 0, 1, 25);

			if (readResult.buffer[0] !== 6) {
				hasAlpha = false;
			}
		}

		const exePath = ktx2CompressedTextures.pvrTexToolCliPath;

		let command: Nullable<string> = null;
		switch (type) {
			case "-astc.ktx": command = `${exePath} -i "${texturePath}" -flip y -pot + -m -dither -ics lRGB -f ASTC_8x8,UBN,lRGB -q astcveryfast -o "${destination}"`; break;
			case "-dxt.ktx": command = `${exePath} -i "${texturePath}" -flip y -pot + -m -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "BC2" : "BC1"},UBN,lRGB -o "${destination}"`; break;
			case "-pvrtc.ktx": command = `${exePath} -i "${texturePath}" -flip y -pot + -square + -m -dither -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "PVRTC1_2" : "PVRTC1_2_RGB"},UBN,lRGB -q pvrtcfastest -o "${destination}"`; break;
			case "-etc1.ktx": command = `${exePath} -i "${texturePath}" -flip y -pot + -m -dither -ics lRGB -f ETC1,UBN,lRGB -q etcfast -o "${destination}"`; break;
			case "-etc2.ktx": command = `${exePath} -i "${texturePath}" -flip y -pot + -m -dither -ics lRGB -f ${hasAlpha ? "ETC2_RGBA" : "ETC2_RGB"},UBN,lRGB -q etcfast -o "${destination}"`; break;
		}

		if (!command) {
			return;
		}

		try {
			await ExecTools.Exec(editor, command).then(() => {
				editor.console.logInfo(`Converted texture ${name} to ${destination}`);
			}).catch(() => {
				editor.console.logError(`Failed to convert texture ${name}`);
			});
		} catch (e) {
			// Catch silently.	
		}
	}
}
