import { platform } from "os";
import { shell } from "electron";
import { remove } from "fs-extra";
import { basename, dirname, extname, join } from "path";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Icon, Spinner } from "@blueprintjs/core";

import { Engine } from "babylonjs";

import { Editor } from "../editor";

import { WorkSpace } from "../project/workspace";

import { Workers } from "../workers/workers";
import AssetsWorker from "../workers/workers/assets";

import { AssetsBrowserItemHandler } from "../components/assets-browser/files/item-handler";

import { FSTools } from "./fs";
import { Tools } from "./tools";
import { EditorProcess, IEditorProcess } from "./process";

/**
 * Defines the possibile types of texture to be compressed.
 */
export type KTXToolsType = "-astc.ktx" | "-dxt.ktx" | "-pvrtc.ktx" | "-etc1.ktx" | "-etc2.ktx";

const currentPlatform = platform();

export class KTXTools {
	/**
	 * Defines the list of all supported image types (extensions) for KTX compression using PVRTexTool.
	 */
	public static SupportedExtensions: string[] = [".png", ".jpg", ".jpeg", ".bmp"];

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
	 * Returns the path to the CLI according to the current platform.
	 */
	public static GetCliPath(): Nullable<string> {
		const configuration = WorkSpace.Workspace?.ktx2CompressedTextures;
		if (!configuration) {
			return null;
		}

		if (typeof (configuration.pvrTexToolCliPath) === "string") {
			configuration.pvrTexToolCliPath = { [currentPlatform]: configuration.pvrTexToolCliPath };
		}

		return configuration.pvrTexToolCliPath?.[currentPlatform] ?? null;
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
		const ktx2CliPath = this.GetCliPath();
		const ktx2CompressedTextures = WorkSpace.Workspace?.ktx2CompressedTextures;

		if (!ktx2CompressedTextures?.enabled || !ktx2CliPath) {
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

			case "-pvrtc.ktx":
				if (!ktx2CompressedTextures.pvrtcOptions?.enabled) {
					return;
				}
				break;
		}

		switch (type) {
			case "-dxt.ktx":
			case "-astc.ktx":
				return (ktx2CompressedTextures?.nvidiaTextureTools?.enabled && ktx2CompressedTextures?.nvidiaTextureTools?.cliPath)
					? this._CompressUsingNVidiaTextureTools(editor, texturePath, destinationFolder, type)
					: this._CompressUsingPVRTexTool(editor, texturePath, destinationFolder, type);

			default:
				return this._CompressUsingPVRTexTool(editor, texturePath, destinationFolder, type);
		}
	}

	/**
	 * Compressed the texture using NVidia Texture Tools.
	 */
	private static async _CompressUsingNVidiaTextureTools(editor: Editor, texturePath: string, destinationFolder: string, type: KTXToolsType): Promise<void> {
		const ktx2CliPath = this.GetCliPath();
		const nvttCliPath = WorkSpace.Workspace!.ktx2CompressedTextures!.nvidiaTextureTools!.cliPath;

		const name = basename(texturePath);
		const extension = extname(name).toLocaleLowerCase();

		if (KTXTools.SupportedExtensions.indexOf(extension) === -1) {
			return;
		}

		let editorProcess: Nullable<IEditorProcess> = null;

		const filename = `${name.substr(0, name.lastIndexOf("."))}${type}`;
		const destination = join(destinationFolder, filename);
		const ddsDestination = destination.replace(".ktx", ".dds");

		let hasAlpha = type !== "-etc1.ktx" && extension === ".png";
		if (hasAlpha) {
			hasAlpha = await Workers.ExecuteFunction<AssetsWorker, "textureHasAlpha">(AssetsBrowserItemHandler.AssetWorker, "textureHasAlpha", texturePath);
		}

		let command: Nullable<string> = null;
		switch (type) {
			case "-astc.ktx":
				command = `"${nvttCliPath}" -highest -dds10 -astc_ldr_8x8 "${texturePath}" "${ddsDestination}"`;
				break;

			case "-dxt.ktx":
				command = `"${nvttCliPath}" -highest ${hasAlpha ? "-bc2" : "-bc1"} "${texturePath}" "${ddsDestination}"`;
				break;
		}

		const log = await editor.console.createLog();
		log.setBody(
			<div style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
				<div style={{ float: "left" }}>
					<Spinner size={16} />
				</div>
				<Icon icon="stop" intent="danger" onClick={() => editorProcess?.kill()} />
				<span>Compressing texture </span>
				<a style={{ color: "grey" }}>{name} {type}</a>
			</div>
		);

		try {
			const setLogProgress = (progress: string) => {
				if (progress.indexOf("%") !== 2) {
					return;
				}

				log.setBody(
					<div style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
						<div style={{ float: "left" }}>
							<Spinner size={16} />
						</div>
						<Icon icon="stop" intent="danger" onClick={() => editorProcess?.kill()} />
						<span>Compressing texture </span>
						<a style={{ color: "grey" }}>{name} {type} {progress}</a>
					</div>
				);
			}

			editorProcess = EditorProcess.ExecuteCommand(command!);
			editorProcess?.program.onData((d) => setLogProgress(d));
			await editorProcess?.wait();

			await FSTools.WaitUntilFileExists(ddsDestination);

			setLogProgress("99%");
			await Tools.Wait(150);

			editorProcess = EditorProcess.ExecuteCommand(`"${ktx2CliPath}" -i "${ddsDestination}" -flip y -o "${destination}"`);
			await editorProcess?.wait();

			setLogProgress("100%");

			log.setBody(
				<div style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
					<Icon icon="endorsed" intent="success" />
					<span>KTX texture available at </span>
					<a style={{ color: "grey" }}>{destination}</a>
				</div>
			);
		} catch (e) {
			log.setBody(
				<div style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
					<Icon icon="endorsed" intent="warning" />
					<span style={{ color: "yellow" }}>Failed to compress KTX texture at </span>
					<a style={{ color: "grey" }} onClick={() => shell.showItemInFolder(dirname(texturePath))}>{texturePath}</a>
				</div>
			);
		}

		try {
			await remove(ddsDestination);
		} catch (e) {
			// Catch silently.
		}
	}

	/**
	 * Compressed the texture using PVRTexTool.
	 */
	private static async _CompressUsingPVRTexTool(editor: Editor, texturePath: string, destinationFolder: string, type: KTXToolsType): Promise<void> {
		const ktx2CliPath = this.GetCliPath();
		const ktx2CompressedTextures = WorkSpace.Workspace!.ktx2CompressedTextures!;

		const name = basename(texturePath);
		const extension = extname(name).toLocaleLowerCase();

		if (KTXTools.SupportedExtensions.indexOf(extension) === -1) {
			return;
		}

		let editorProcess: Nullable<IEditorProcess> = null;

		const relativePath = texturePath.replace(join(WorkSpace.DirPath!, "assets/"), "");
		const configuration = AssetsBrowserItemHandler.AssetsConfiguration[relativePath];

		const filename = `${name.substr(0, name.lastIndexOf("."))}${type}`;
		const destination = join(destinationFolder, filename);

		const log = await editor.console.createLog();
		log.setBody(
			<div style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
				<div style={{ float: "left" }}>
					<Spinner size={16} />
				</div>
				<Icon icon="stop" intent="danger" onClick={() => editorProcess?.kill()} />
				<span>Compressing texture </span>
				<a style={{ color: "grey" }}>{name} {type}</a>
			</div>
		);

		let hasAlpha = type !== "-etc1.ktx" && extension === ".png";
		if (hasAlpha) {
			hasAlpha = await Workers.ExecuteFunction<AssetsWorker, "textureHasAlpha">(AssetsBrowserItemHandler.AssetWorker, "textureHasAlpha", texturePath);
		}

		let command: Nullable<string> = null;
		switch (type) {
			case "-astc.ktx":
				let qastc = configuration?.ktxCompression?.astc?.quality ?? "automatic";
				if (qastc !== "none") {
					if (qastc === "automatic") {
						qastc = ktx2CompressedTextures.astcOptions?.quality ?? "astcveryfast";
					}

					command = `"${ktx2CliPath}" -i "${texturePath}" -flip y -pot + -m -dither -ics lRGB -f ASTC_8x8,UBN,lRGB -q ${qastc} -o "${destination}"`;
				}
				break;

			case "-dxt.ktx":
				let type = configuration?.ktxCompression?.dxt?.type ?? "automatic";
				if (type !== "none") {
					if (type === "automatic") {
						type = hasAlpha ? "BC2" : "BC1";
					}

					command = `"${ktx2CliPath}" -i "${texturePath}" -flip y -pot + -m -ics lRGB ${hasAlpha ? "-l" : ""} -f ${type},UBN,lRGB -o "${destination}"`;
				}
				break;

			case "-pvrtc.ktx":
				let qpvrtc = configuration?.ktxCompression?.pvrtc?.quality ?? "automatic";
				if (qpvrtc !== "none") {
					if (qpvrtc === "automatic") {
						qpvrtc = ktx2CompressedTextures.pvrtcOptions?.quality ?? "pvrtcfastest";
					}

					command = `"${ktx2CliPath}" -i "${texturePath}" -flip y -pot + -square + -m -dither -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "PVRTCI_2BPP_RGBA" : "PVRTCI_2BPP_RGB"},UBN,lRGB -q ${qpvrtc} -o "${destination}"`;
				}
				break;

			case "-etc1.ktx":
				let qect1 = configuration?.ktxCompression?.etc1?.quality ?? "automatic";
				if (qect1 !== "none") {
					if (qect1 === "automatic") {
						qect1 = ktx2CompressedTextures.ect1Options?.quality ?? "etcfast";
					}

					command = `"${ktx2CliPath}" -i "${texturePath}" -flip y -pot + -m -dither -ics lRGB -f ETC1,UBN,lRGB -q ${qect1} -o "${destination}"`;
				}
				break;

			case "-etc2.ktx":
				let qetc2 = configuration?.ktxCompression?.etc2?.quality ?? "automatic";
				if (qetc2 !== "none") {
					if (qetc2 === "automatic") {
						qetc2 = ktx2CompressedTextures.ect2Options?.quality ?? "etcfast";
					}

					command = `"${ktx2CliPath}" -i "${texturePath}" -flip y -pot + -m -dither -ics lRGB -f ${hasAlpha ? "ETC2_RGBA" : "ETC2_RGB"},UBN,lRGB -q ${qetc2} -o "${destination}"`;
				}
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
				<div style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
					<Icon icon="endorsed" intent="success" />
					<span>KTX texture available at </span>
					<a style={{ color: "grey" }}>{destination}</a>
				</div>
			);
		} catch (e) {
			log.setBody(
				<div style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
					<Icon icon="endorsed" intent="warning" />
					<span style={{ color: "yellow" }}>Failed to compress KTX texture at </span>
					<a style={{ color: "grey" }} onClick={() => shell.showItemInFolder(dirname(texturePath))}>{texturePath}</a>
				</div>
			);
		}
	}
}
