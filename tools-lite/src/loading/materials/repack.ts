import { createTexture2DFromExternalImage, EngineContext, linearToSrgbByte, SceneContext, srgbByteToLinear, Texture2D } from "@babylonjs/lite";

import { loadFile } from "../../tools/request";

import type { SceneLoaderQualitySelector } from "../loader";
import {
	_registerTextureSlot,
	applySerializedTextureTransform,
	getAddressMode,
	getFilterModes,
	getSerializedTextureUrl,
	isSerializedTextureInGammaSpace,
	isSerializedTextureInSrgbBuffer,
	loadTextureFromUrl,
} from "../texture";

/**
 * Defines the source of each channel of a repacked texture: the index of the channel to read in the source texture
 * (0 = red, 1 = green, 2 = blue, 3 = alpha) or a constant value in [0, 1].
 */
export type RepackChannelSource = { channel: 0 | 1 | 2 | 3; invert?: boolean } | { value: number };

/**
 * Defines the source of the red, green, blue and alpha channels of a repacked texture.
 */
export type RepackChannels = [RepackChannelSource, RepackChannelSource, RepackChannelSource, RepackChannelSource];

/**
 * Defines the context of a texture being repacked by a function (see `RepackPixelsFunction`).
 */
export interface IRepackPixelsContext {
	/**
	 * Defines the reference to the scene the texture belongs to.
	 */
	scene: SceneContext;
	/**
	 * Defines the root url of the scene.
	 */
	rootUrl: string;
	/**
	 * Defines the quality of the textures being loaded.
	 */
	quality: SceneLoaderQualitySelector;
	/**
	 * Defines the width of the image being repacked, in pixels.
	 */
	width: number;
	/**
	 * Defines the height of the image being repacked, in pixels.
	 */
	height: number;
}

/**
 * Defines a function computing the pixels of a repacked texture: it modifies in place the given RGBA pixels (4 bytes
 * per pixel, not premultiplied by their alpha) of the source image.
 */
export type RepackPixelsFunction = (pixels: Uint8ClampedArray, context: IRepackPixelsContext) => void | Promise<void>;

const warnedUrls = new Set<string>();

/**
 * Defines the reason why the color textures are repacked (see `getColorTextureRepack`).
 */
export const colorTextureRepackReason = "Babylon Lite can't decode the colors of the texture as Babylon.js does";

/**
 * Defines how a color texture is repacked so Babylon Lite decodes its colors as Babylon.js does (see `getColorTextureRepack`).
 */
export interface IColorTextureRepack {
	/**
	 * Defines the function repacking the colors of the texture, or null when the texture is used as it is.
	 */
	repack: RepackPixelsFunction | null;
	/**
	 * Defines wether or not the GPU decodes the colors of the (repacked) texture from sRGB to linear.
	 */
	srgb: boolean;
}

/**
 * Creates the function repacking the colors (RGB, not the alpha) of a texture so the given decoding of Babylon.js and
 * the decoding of Babylon Lite (the GPU for the sRGB textures, the approximated sRGB curve for the textures its shaders
 * decode) give the same linear values.
 */
function createColorRepack(decode: (value: number) => number, srgb: boolean): RepackPixelsFunction {
	let table: Uint8Array | null = null;

	return (pixels) => {
		if (!table) {
			table = new Uint8Array(256);
			for (let i = 0; i < 256; ++i) {
				const linear = decode(i);
				table[i] = srgb ? linearToSrgbByte(linear) : Math.round(Math.pow(Math.max(0, Math.min(1, linear)), 1 / 2.2) * 255);
			}
		}

		for (let i = 0, len = pixels.length; i < len; i += 4) {
			pixels[i] = table[pixels[i]];
			pixels[i + 1] = table[pixels[i + 1]];
			pixels[i + 2] = table[pixels[i + 2]];
		}
	};
}

const gammaSpaceToSrgb = createColorRepack((value) => Math.pow(value / 255, 2.2), true);
const srgbToGammaSpace = createColorRepack((value) => srgbByteToLinear(value), false);
const linearToGammaSpace = createColorRepack((value) => value / 255, false);

/**
 * Returns how to load the given serialized color texture (emissive, reflectance, etc.) so Babylon Lite decodes its colors
 * as the materials of Babylon.js decode them: with the GPU when loaded in a sRGB buffer (exact sRGB curve), in their
 * shaders when in gamma space (approximated sRGB curve) and not at all otherwise.
 * @param data defines the serialized data of the texture.
 * @param shaderDecodesGamma defines wether or not the shaders of Babylon Lite decode the colors of the texture with the
 * approximated sRGB curve (ie. the reflectance textures).
 */
export function getColorTextureRepack(data: any, shaderDecodesGamma: boolean): IColorTextureRepack {
	if (isSerializedTextureInSrgbBuffer(data)) {
		return shaderDecodesGamma ? { repack: srgbToGammaSpace, srgb: false } : { repack: null, srgb: true };
	}

	if (isSerializedTextureInGammaSpace(data)) {
		return shaderDecodesGamma ? { repack: null, srgb: false } : { repack: gammaSpaceToSrgb, srgb: true };
	}

	return shaderDecodesGamma ? { repack: linearToGammaSpace, srgb: false } : { repack: null, srgb: false };
}

/**
 * Returns wether or not the textures located at the given URL can be repacked on the CPU (compressed textures can't).
 * @param url defines the url of the texture.
 */
export function canRepackTexture(url: string): boolean {
	return !url.toLowerCase().endsWith(".ktx2");
}

/**
 * Logs once a warning saying the given texture can't be repacked to match the expectations of Babylon Lite.
 * @param url defines the url of the texture.
 * @param reason defines the reason why the texture should have been repacked.
 */
export function warnTextureNotRepacked(url: string, reason: string): void {
	if (warnedUrls.has(url)) {
		return;
	}

	warnedUrls.add(url);
	console.warn(`Babylon.js Editor Tools Lite: the texture "${url}" can't be repacked (${reason}). It is used as it is.`);
}

/**
 * Reads the pixels of the given image as they are stored in the image (not premultiplied by their alpha): the image is
 * uploaded to a GPU texture and read back. A 2D canvas can't be used as it stores premultiplied colors: the color of the
 * transparent pixels would be lost (ie. a specular color in a texture storing the glossiness in its alpha channel).
 */
async function readImagePixels(engine: EngineContext, bitmap: ImageBitmap): Promise<Uint8ClampedArray<ArrayBuffer>> {
	const device = (engine as { _device?: GPUDevice })._device;
	if (!device) {
		throw new Error("The GPU device of the engine is not available.");
	}

	const width = bitmap.width;
	const height = bitmap.height;

	const texture = device.createTexture({
		size: { width, height },
		format: "rgba8unorm",
		usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
	});

	// Rows of a texture copied to a buffer must be aligned on 256 bytes.
	const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
	const buffer = device.createBuffer({
		size: bytesPerRow * height,
		usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
	});

	try {
		device.queue.copyExternalImageToTexture({ source: bitmap }, { texture, premultipliedAlpha: false }, { width, height });

		const encoder = device.createCommandEncoder();
		encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow }, { width, height });
		device.queue.submit([encoder.finish()]);

		await buffer.mapAsync(GPUMapMode.READ);

		const rows = new Uint8Array(buffer.getMappedRange());
		const pixels = new Uint8ClampedArray(width * height * 4);
		for (let y = 0; y < height; ++y) {
			pixels.set(rows.subarray(y * bytesPerRow, y * bytesPerRow + width * 4), y * width * 4);
		}

		buffer.unmap();

		return pixels;
	} finally {
		buffer.destroy();
		texture.destroy();
	}
}

/**
 * Loads the image located at the given URL and returns its pixels (RGBA, not premultiplied by their alpha).
 * @param scene defines the reference to the scene used to read the pixels of the image.
 * @param url defines the url of the image to load.
 * @param width defines the optional width the image is resized to.
 * @param height defines the optional height the image is resized to.
 */
export async function loadImagePixels(
	scene: SceneContext,
	url: string,
	width?: number,
	height?: number
): Promise<{ pixels: Uint8ClampedArray<ArrayBuffer>; width: number; height: number }> {
	const blob = await loadFile(url, "blob");

	const options: ImageBitmapOptions = { premultiplyAlpha: "none", colorSpaceConversion: "none" };
	if (width && height) {
		Object.assign(options, { resizeWidth: width, resizeHeight: height, resizeQuality: "high" });
	}

	const bitmap = await createImageBitmap(blob, options);

	try {
		return {
			width: bitmap.width,
			height: bitmap.height,
			pixels: await readImagePixels(scene.surface.engine, bitmap),
		};
	} finally {
		bitmap.close();
	}
}

/**
 * Loads the original image (not the compressed version) of the given serialized texture and returns its pixels
 * resized to the given size, or null if the image can't be loaded.
 * @param context defines the context of the texture being repacked.
 * @param data defines the serialized data of the texture to load.
 * @param width defines the width the image is resized to.
 * @param height defines the height the image is resized to.
 */
export async function loadSerializedTexturePixels(context: IRepackPixelsContext, data: any, width: number, height: number): Promise<Uint8ClampedArray | null> {
	const url = getSerializedTextureUrl(data, context.rootUrl, context.quality, { allowCompressed: false });
	if (!url || !canRepackTexture(url)) {
		return null;
	}

	try {
		return (await loadImagePixels(context.scene, url, width, height)).pixels;
	} catch (e) {
		console.error(`Failed to load texture "${url}".`, e);
		return null;
	}
}

/**
 * Repacks the given pixels in place: each channel is read from the given source channel or set to a constant value.
 */
function repackChannels(pixels: Uint8ClampedArray, channels: RepackChannels): void {
	const constants = channels.map((source) => ("value" in source ? Math.round(Math.max(0, Math.min(1, source.value)) * 255) : -1));

	for (let i = 0, len = pixels.length; i < len; i += 4) {
		const r = pixels[i];
		const g = pixels[i + 1];
		const b = pixels[i + 2];
		const a = pixels[i + 3];

		for (let c = 0; c < 4; ++c) {
			const source = channels[c];
			if (constants[c] !== -1) {
				pixels[i + c] = constants[c];
				continue;
			}

			const channel = (source as { channel: number }).channel;
			const value = channel === 0 ? r : channel === 1 ? g : channel === 2 ? b : a;

			pixels[i + c] = (source as { invert?: boolean }).invert ? 255 - value : value;
		}
	}
}

/**
 * Loads the image located at the given URL and creates a new texture from its repacked pixels: each channel is read
 * from the given source channel of the image, or the pixels are computed by the given function. This is used to
 * convert the textures configured in the editor to the layout expected by Babylon Lite (ie. metallic textures that
 * store the metalness in the red channel while Babylon Lite reads it from the blue channel, as glTF does).
 * @param scene defines the reference to the scene the texture belongs to.
 * @param url defines the url of the image to load.
 * @param data defines the serialized data of the texture (sampling and wrap modes, invertY, etc.).
 * @param repack defines the source of the red, green, blue and alpha channels of the created texture, or the function computing its pixels.
 * @param srgb defines wether or not the created texture contains color data.
 */
export async function loadRepackedTexture(
	scene: SceneContext,
	url: string,
	data: any,
	repack: RepackChannels | RepackPixelsFunction,
	srgb: boolean,
	context?: Pick<IRepackPixelsContext, "rootUrl" | "quality">
): Promise<Texture2D> {
	const engine = scene.surface.engine;

	const { pixels, width, height } = await loadImagePixels(scene, url);

	if (typeof repack === "function") {
		await repack(pixels, {
			scene,
			width,
			height,
			rootUrl: context?.rootUrl ?? "",
			quality: context?.quality ?? scene.loadingTexturesQuality ?? "high",
		});
	} else {
		repackChannels(pixels, repack);
	}

	const { magFilter, minFilter } = getFilterModes(data?.samplingMode);

	return createTexture2DFromExternalImage(engine, new ImageData(pixels, width, height), {
		srgb,
		magFilter,
		minFilter,
		mipMaps: !data?.noMipmap,
		invertY: data?.invertY ?? true,
		addressModeU: getAddressMode(data?.wrapU),
		addressModeV: getAddressMode(data?.wrapV),
	});
}

/**
 * Defines the options of a serialized texture loaded repacked (see `loadRepackedSerializedTexture`).
 */
export interface IRepackedSerializedTextureOptions {
	/**
	 * Defines the source of the red, green, blue and alpha channels of the created texture, or the function computing its pixels.
	 */
	repack: RepackChannels | RepackPixelsFunction;
	/**
	 * Defines the reason why the texture is repacked, logged when the texture can't be repacked.
	 */
	reason: string;
	/**
	 * Defines wether or not the repacked texture contains color data.
	 * @default false
	 */
	srgb?: boolean;
	/**
	 * Defines the optional function called with the loaded texture, called again when the quality of the textures changes.
	 */
	assign?: (texture: Texture2D) => void;
}

/**
 * Loads the given serialized texture repacked for the given quality, or as it is when it can't be repacked.
 */
async function loadRepackedSerializedTextureForQuality(
	scene: SceneContext,
	rootUrl: string,
	data: any,
	quality: SceneLoaderQualitySelector,
	options: IRepackedSerializedTextureOptions
): Promise<Texture2D | null> {
	const srgb = options.srgb ?? false;

	// The compressed textures can't be repacked: the original image, exported with its compressed version, is repacked instead.
	const url = getSerializedTextureUrl(data, rootUrl, quality, { allowCompressed: false });
	if (!url) {
		return null;
	}

	if (canRepackTexture(url)) {
		try {
			return applySerializedTextureTransform(await loadRepackedTexture(scene, url, data, options.repack, srgb, { rootUrl, quality }), data);
		} catch (e) {
			console.error(`Failed to load and repack texture "${url}".`, e);
		}
	}

	const fallbackUrl = getSerializedTextureUrl(data, rootUrl, quality);
	if (!fallbackUrl) {
		return null;
	}

	warnTextureNotRepacked(fallbackUrl, options.reason);

	try {
		return applySerializedTextureTransform(await loadTextureFromUrl(scene, fallbackUrl, data, { srgb }), data);
	} catch (e) {
		console.error(`Failed to load texture "${fallbackUrl}".`, e);
		return null;
	}
}

/**
 * Loads the given serialized texture with its channels repacked as given (see `loadRepackedTexture`) and applies its
 * UV transform. When compressed textures are enabled, the original image of the texture is repacked as compressed
 * textures can't be: the texture is used as it is only when the original image can't be loaded.
 * @param scene defines the reference to the scene the texture belongs to.
 * @param rootUrl defines the root url of the scene.
 * @param data defines the serialized data of the texture.
 * @param options defines how the texture is repacked.
 * @returns the loaded texture or null if the texture can't be loaded.
 */
export async function loadRepackedSerializedTexture(scene: SceneContext, rootUrl: string, data: any, options: IRepackedSerializedTextureOptions): Promise<Texture2D | null> {
	const quality = scene.loadingTexturesQuality ?? "high";
	const texture = await loadRepackedSerializedTextureForQuality(scene, rootUrl, data, quality, options);

	const assign = options.assign;
	if (texture && assign) {
		assign(texture);

		_registerTextureSlot(scene, {
			data,
			rootUrl,
			assign,
			quality,
			options: { allowCompressed: false },
			load: (newQuality) => loadRepackedSerializedTextureForQuality(scene, rootUrl, data, newQuality, options),
		});
	}

	return texture;
}

/**
 * Returns the channels of a normal map with its red and/or green channels inverted.
 * @param invertRed defines wether or not the red channel (X axis) is inverted.
 * @param invertGreen defines wether or not the green channel (Y axis) is inverted.
 * @returns the channels of the repacked normal map, or null if the normal map can be used as it is.
 */
export function getNormalMapChannels(invertRed: boolean, invertGreen: boolean): RepackChannels | null {
	if (!invertRed && !invertGreen) {
		return null;
	}

	return [{ channel: 0, invert: invertRed }, { channel: 1, invert: invertGreen }, { channel: 2 }, { channel: 3 }];
}
