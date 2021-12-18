import { shell } from "electron";
import { basename, dirname, extname, join } from "path";

import * as React from "react";
import { Icon, Spinner } from "@blueprintjs/core";

import { Nullable } from "../../../shared/types";

import { Engine } from "babylonjs";

import { Editor } from "../editor";

import { WorkSpace } from "../project/workspace";

import { Workers } from "../workers/workers";
import AssetsWorker from "../workers/workers/assets";

import { AssetsBrowserItemHandler } from "../components/assets-browser/files/item-handler";

import { EditorProcess, IEditorProcess } from "./process";

/**
 * Defines the possibile types of texture to be compressed.
 */
export type KTXToolsType = "-astc.ktx" | "-dxt.ktx" | "-pvrtc.ktx" | "-etc1.ktx" | "-etc2.ktx";

export class KTXTools {
	private static _SupportedExtensions: string[] = [".png", ".jpg", ".jpeg"];

	/**
	 * Returns the format of the currently supported Ktx format.
	 */
	public static GetSupportedKtxFormat(engine: Engine): Nullable<KTXToolsType> {
		return engine.texturesSupported[0] as KTXToolsType ?? null;
	}

	/**
	 * Returns the list of all support Ktx formats.
	 */
	public static GetAllKtxFormats(): KTXToolsType[] {
		return ["-astc.ktx", "-dxt.ktx", "-pvrtc.ktx", "-etc1.ktx", "-etc2.ktx"];
	}

	/**
	 * Returns the of the given texture path by applying the ktx extension to it.
	 * @param texturePath defines the path to the texture to gets its Ktx name.
	 * @param type defines the type of ktx file to use.
	 */
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

		switch (type) {
			case "-etc1.ktx":
				if (!ktx2CompressedTextures.ect1Options?.enabled) {
					return;
				}
				break;
			case "-etc2.ktx":
				if (!ktx2CompressedTextures.ect1Options?.enabled) {
					return;
				}
				break;
		}

		const name = basename(texturePath);
		const extension = extname(name).toLocaleLowerCase();

		if (KTXTools._SupportedExtensions.indexOf(extension) === -1) {
			return;
		}

		let editorProcess: Nullable<IEditorProcess> = null;

		const filename = `${name.substr(0, name.lastIndexOf("."))}${type}`;
		const destination = join(destinationFolder, filename);

		const log = await editor.console.logInfo("Compressing texture");
		log.setBody(
			<p style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
				<div style={{ float: "left" }}>
					<Spinner size={16} />
				</div>
				<Icon icon="stop" intent="danger" onClick={() => editorProcess?.kill()} />
				<span>Compressing texture </span>
				<a style={{ color: "grey" }}>{name} {type}</a>
			</p>
		);

		let hasAlpha = type !== "-etc1.ktx" && extension === ".png";
		if (hasAlpha) {
			hasAlpha = await Workers.ExecuteFunction<AssetsWorker, "textureHasAlpha">(AssetsBrowserItemHandler.AssetWorker, "textureHasAlpha", texturePath);
		}

		const exePath = ktx2CompressedTextures.pvrTexToolCliPath;

		let command: Nullable<string> = null;
		switch (type) {
			case "-astc.ktx":
				const qastc = ktx2CompressedTextures.astcOptions?.quality ?? "astcveryfast";
				command = `"${exePath}" -i "${texturePath}" -flip y -pot + -m -dither -ics lRGB -f ASTC_8x8,UBN,lRGB -q ${qastc} -o "${destination}"`;
				break;

			case "-dxt.ktx":
				command = `"${exePath}" -i "${texturePath}" -flip y -pot + -m -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "BC2" : "BC1"},UBN,lRGB -o "${destination}"`;
				break;

			case "-pvrtc.ktx":
				const qpvrtc = ktx2CompressedTextures.pvrtcOptions?.quality ?? "pvrtcfastest";
				command = `"${exePath}" -i "${texturePath}" -flip y -pot + -square + -m -dither -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "PVRTC1_2" : "PVRTC1_2_RGB"},UBN,lRGB -q ${qpvrtc} -o "${destination}"`;
				break;

			case "-etc1.ktx":
				const qect1 = ktx2CompressedTextures.ect1Options?.quality ?? "etcfast";
				command = `"${exePath}" -i "${texturePath}" -flip y -pot + -m -dither -ics lRGB -f ETC1,UBN,lRGB -q ${qect1} -o "${destination}"`;
				break;

			case "-etc2.ktx":
				const qetc2 = ktx2CompressedTextures.ect2Options?.quality ?? "etcfast";
				command = `"${exePath}" -i "${texturePath}" -flip y -pot + -m -dither -ics lRGB -f ${hasAlpha ? "ETC2_RGBA" : "ETC2_RGB"},UBN,lRGB -q ${qetc2} -o "${destination}"`;
				break;
		}

		if (!command) {
			return log.setBody(
				<p style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
					<Icon icon="endorsed" intent="none" />
					<span>KTX texture ignored (no command found): </span>
					<a style={{ color: "grey" }} onClick={() => shell.showItemInFolder(texturePath)}>{texturePath}</a>
				</p>
			);
		}

		try {
			editorProcess = EditorProcess.ExecuteCommand(command);
			await editorProcess?.wait();

			log.setBody(
				<p style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
					<Icon icon="endorsed" intent="success" />
					<span>KTX texture available at </span>
					<a style={{ color: "grey" }}>{destination}</a>
				</p>
			);
		} catch (e) {
			log.setBody(
				<p style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
					<Icon icon="endorsed" intent="warning" />
					<span style={{ color: "yellow" }}>Failed to compress texture at </span>
					<a style={{ color: "grey" }} onClick={() => shell.showItemInFolder(dirname(texturePath))}>{texturePath}</a>
				</p>
			);
		}
	}
}
