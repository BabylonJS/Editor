import { createTexture3DFromPixels, releaseTexture, SceneContext, Texture3D } from "@babylonjs/lite";

import { loadFile } from "../tools/request";
import { Observable } from "../tools/observable";

import { loadImagePixels } from "../loading/materials/repack";

export interface IColorGradingTextureOptions {
	/**
	 * Defines the level (weight) of the color grading.
	 * @default 1
	 */
	level?: number;
	/**
	 * Defines the serialized data of the texture, returned by `serialize`.
	 */
	serializedData?: any;
	/**
	 * Defines, for the 2D lookup textures, wether or not the slice of the cube is selected by the green channel of
	 * the color (Babylon.js `ImageProcessingConfiguration.colorGradingWithGreenDepth`). Otherwise, the blue channel
	 * selects the slice.
	 * @default true
	 */
	greenDepth?: boolean;
	/**
	 * Defines, for the 2D lookup textures, wether or not the colors are stored in the red, green and blue channels
	 * (Babylon.js `ImageProcessingConfiguration.colorGradingBGR`). Otherwise, they are stored in the blue, green and
	 * red channels.
	 * @default true
	 */
	bgr?: boolean;
	/**
	 * Defines, for the 2D lookup textures, wether or not the image is flipped vertically (Babylon.js `Texture.invertY`).
	 * @default true
	 */
	invertY?: boolean;
}

/**
 * Defines a color grading lookup table used by the image processing of the default rendering pipeline: the equivalent
 * of the Babylon.js `ColorGradingTexture` (`.3dl` files) and of the 2D lookup textures (the slices of the color cube
 * side by side in an image). The lookup table is loaded as a 3D texture of Babylon Lite: the 2D lookup textures are
 * converted when loaded, the same way Babylon.js samples them.
 */
export class ColorGradingTexture {
	/**
	 * Defines the url of the lookup table.
	 */
	public readonly url: string;
	/**
	 * Defines wether or not the lookup table is a 2D lookup texture (otherwise a `.3dl` file).
	 */
	public readonly is2DLookupTexture: boolean;
	/**
	 * Defines, for the 2D lookup textures, wether or not the slice of the cube is selected by the green channel.
	 * @see IColorGradingTextureOptions.greenDepth
	 */
	public readonly greenDepth: boolean;
	/**
	 * Defines the level (weight) of the color grading.
	 */
	public level: number;
	/**
	 * Defines the 3D texture created for the lookup table, null until loaded.
	 */
	public texture: Texture3D | null = null;
	/**
	 * Defines the size of the lookup table (number of values along each axis of the color cube), 0 until loaded.
	 */
	public size: number = 0;
	/**
	 * Defines the observable notified when the lookup table has been loaded.
	 */
	public readonly onLoadObservable: Observable<ColorGradingTexture> = new Observable<ColorGradingTexture>();

	private _serializedData: any;
	private _isDisposed: boolean = false;

	/**
	 * Creates a new color grading texture and starts loading the given lookup table.
	 * @param url defines the url of the lookup table (`.3dl` file or 2D lookup texture).
	 * @param scene defines the reference to the scene the lookup table is used by.
	 * @param options defines the options of the lookup table.
	 */
	public constructor(url: string, scene: SceneContext, options?: IColorGradingTextureOptions) {
		this.url = url;
		this.level = options?.level ?? 1;
		this.greenDepth = options?.greenDepth ?? true;
		this.is2DLookupTexture = !url.toLowerCase().split("?")[0].endsWith(".3dl");

		this._serializedData = options?.serializedData ?? null;

		this._load(scene, options ?? {}).catch((e) => console.error(`Failed to load the color grading texture "${url}".`, e));
	}

	/**
	 * Returns wether or not the lookup table has been loaded.
	 */
	public get isReady(): boolean {
		return this.texture !== null;
	}

	/**
	 * Returns the class name of the texture.
	 */
	public getClassName(): string {
		return "ColorGradingTexture";
	}

	/**
	 * Returns the serialized data of the texture.
	 */
	public serialize(): any {
		return {
			...(this._serializedData ?? { name: this.url, customType: "BABYLON.ColorGradingTexture" }),
			level: this.level,
		};
	}

	/**
	 * Disposes the texture and its GPU resources.
	 */
	public dispose(): void {
		this._isDisposed = true;

		if (this.texture) {
			releaseTexture(this.texture);
			this.texture = null;
		}

		this.onLoadObservable.clear();
	}

	private async _load(scene: SceneContext, options: IColorGradingTextureOptions): Promise<void> {
		const lookupTable = this.is2DLookupTexture ? await this._load2DLookupTable(scene, options) : _parse3dlLookupTable(await loadFile(this.url, "text"));

		if (this._isDisposed || !lookupTable) {
			return;
		}

		this.size = lookupTable.size;
		this.texture = createTexture3DFromPixels(scene.surface.engine, lookupTable.data, lookupTable.size, lookupTable.size, lookupTable.size);

		this.onLoadObservable.notifyObservers(this);
	}

	private async _load2DLookupTable(scene: SceneContext, options: IColorGradingTextureOptions): Promise<_ILookupTable | null> {
		const { pixels, width, height } = await loadImagePixels(scene, this.url);
		if (width !== height * height) {
			console.warn(`Babylon.js Editor Tools Lite: the color grading texture "${this.url}" is not a 2D lookup texture (its width must be its height squared).`);
			return null;
		}

		return _convert2DLookupTable(pixels, height, this.greenDepth, options.bgr ?? true, options.invertY ?? true);
	}
}

/**
 * Defines a lookup table ready to be uploaded to a 3D texture.
 * @internal
 */
export interface _ILookupTable {
	/**
	 * Defines the number of values along each axis of the color cube.
	 */
	size: number;
	/**
	 * Defines the RGBA values of the table (x = red, y = green, z = blue).
	 */
	data: Uint8Array;
}

/**
 * Parses the given `.3dl` lookup table the same way the Babylon.js `ColorGradingTexture` does: the first line gives the
 * size of the table, then each line gives a color (blue changing first) whose values are normalized by the maximum value.
 * The data is laid out as a 3D texture (x = red, y = green, z = blue).
 * @internal
 */
export function _parse3dlLookupTable(text: string): _ILookupTable | null {
	let size = 0;
	let maxColor = 0;
	let values: number[] = [];

	let red = 0;
	let green = 0;
	let blue = 0;

	for (const line of text.split("\n")) {
		if (!/\S+/.test(line) || line.indexOf("#") === 0) {
			continue;
		}

		const words = line.trim().split(/\s+/);

		if (size === 0) {
			size = words.length;
			values = new Array(size * size * size * 3).fill(0);
			continue;
		}

		if (red >= size) {
			break;
		}

		const r = Math.max(parseInt(words[0]), 0);
		const g = Math.max(parseInt(words[1]), 0);
		const b = Math.max(parseInt(words[2]), 0);

		maxColor = Math.max(maxColor, r, g, b);

		const index = (red + green * size + blue * size * size) * 3;
		values[index] = r;
		values[index + 1] = g;
		values[index + 2] = b;

		if (++blue === size) {
			blue = 0;
			if (++green === size) {
				green = 0;
				++red;
			}
		}
	}

	if (!size) {
		return null;
	}

	const data = new Uint8Array(size * size * size * 4);
	for (let i = 0, j = 0; i < values.length; i += 3, j += 4) {
		data[j] = maxColor ? (values[i] / maxColor) * 255 : 0;
		data[j + 1] = maxColor ? (values[i + 1] / maxColor) * 255 : 0;
		data[j + 2] = maxColor ? (values[i + 2] / maxColor) * 255 : 0;
		data[j + 3] = 255;
	}

	return { size, data };
}

/**
 * Converts the given 2D lookup texture (the slices of the color cube side by side) to the data of a 3D texture
 * (x = red, y = green, z = blue), reading the slices the same way the Babylon.js image processing samples them
 * (`sampleTexture3D` of the "imageProcessingFunctions" shader).
 * @internal
 */
export function _convert2DLookupTable(pixels: Uint8ClampedArray, size: number, greenDepth: boolean, bgr: boolean, invertY: boolean): _ILookupTable {
	const width = size * size;
	const data = new Uint8Array(size * size * size * 4);

	for (let blue = 0; blue < size; ++blue) {
		for (let green = 0; green < size; ++green) {
			for (let red = 0; red < size; ++red) {
				// The slice is selected by the green (or blue) value, the red value gives the column in the slice and the
				// blue (or green) value gives the row, starting from the bottom of the image when it is inverted.
				const slice = greenDepth ? green : blue;
				const row = greenDepth ? blue : green;

				const x = slice * size + red;
				const y = invertY ? size - 1 - row : row;

				const source = (y * width + x) * 4;
				const target = (red + green * size + blue * size * size) * 4;

				data[target] = bgr ? pixels[source] : pixels[source + 2];
				data[target + 1] = pixels[source + 1];
				data[target + 2] = bgr ? pixels[source + 2] : pixels[source];
				data[target + 3] = 255;
			}
		}
	}

	return { size, data };
}
