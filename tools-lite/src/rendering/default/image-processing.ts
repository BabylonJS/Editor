import { SceneContext } from "@babylonjs/lite";

import { Observable } from "../../tools/observable";

import { ColorGradingTexture } from "../color-grading";

import "../post-process/includes";
import { IPostProcessContext } from "../post-process/context";
import { IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";

import { imageProcessingFragmentWGSL } from "./shaders";

/**
 * Defines the color curves of the image processing, with the same properties as Babylon.js `ColorCurves`.
 */
export interface IColorCurves {
	globalHue: number;
	globalDensity: number;
	globalExposure: number;
	globalSaturation: number;

	highlightsHue: number;
	highlightsDensity: number;
	highlightsExposure: number;
	highlightsSaturation: number;

	midtonesHue: number;
	midtonesDensity: number;
	midtonesExposure: number;
	midtonesSaturation: number;

	shadowsHue: number;
	shadowsDensity: number;
	shadowsExposure: number;
	shadowsSaturation: number;
}

/**
 * Defines the color curves of the image processing, same as Babylon.js `ColorCurves`.
 */
export class ColorCurves implements IColorCurves {
	public globalHue: number = 30;
	public globalDensity: number = 0;
	public globalExposure: number = 0;
	public globalSaturation: number = 0;

	public highlightsHue: number = 30;
	public highlightsDensity: number = 0;
	public highlightsExposure: number = 0;
	public highlightsSaturation: number = 0;

	public midtonesHue: number = 30;
	public midtonesDensity: number = 0;
	public midtonesExposure: number = 0;
	public midtonesSaturation: number = 0;

	public shadowsHue: number = 30;
	public shadowsDensity: number = 0;
	public shadowsExposure: number = 0;
	public shadowsSaturation: number = 0;

	/**
	 * Returns the class name of the curves.
	 */
	public getClassName(): string {
		return "ColorCurves";
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function applyColorGradingSliderNonlinear(value: number): number {
	value /= 100;

	let x = Math.abs(value);
	x = Math.pow(x, 2);

	if (value < 0) {
		x *= -1;
	}

	return x * 100;
}

function fromHSBToRef(hue: number, saturation: number, brightness: number, result: number[]): void {
	let h = clamp(hue, 0, 360);
	const s = clamp(saturation / 100, 0, 1);
	const v = clamp(brightness / 100, 0, 1);

	if (s === 0) {
		result[0] = v;
		result[1] = v;
		result[2] = v;
	} else {
		h /= 60;

		const i = Math.floor(h);
		const f = h - i;
		const p = v * (1 - s);
		const q = v * (1 - s * f);
		const t = v * (1 - s * (1 - f));

		switch (i) {
			case 0:
				result[0] = v;
				result[1] = t;
				result[2] = p;
				break;
			case 1:
				result[0] = q;
				result[1] = v;
				result[2] = p;
				break;
			case 2:
				result[0] = p;
				result[1] = v;
				result[2] = t;
				break;
			case 3:
				result[0] = p;
				result[1] = q;
				result[2] = v;
				break;
			case 4:
				result[0] = t;
				result[1] = p;
				result[2] = v;
				break;
			default:
				result[0] = v;
				result[1] = p;
				result[2] = q;
				break;
		}
	}

	result[3] = 1;
}

/**
 * Same as Babylon.js `ColorCurves._getColorGradingDataToRef`.
 */
function getColorGradingData(hue: number, density: number, saturation: number, exposure: number): number[] {
	const result = [0, 0, 0, 1];

	hue = clamp(hue, 0, 360);
	density = clamp(density, -100, 100);
	saturation = clamp(saturation, -100, 100);
	exposure = clamp(exposure, -100, 100);

	density = applyColorGradingSliderNonlinear(density);
	density *= 0.5;

	exposure = applyColorGradingSliderNonlinear(exposure);

	if (density < 0) {
		density *= -1;
		hue = (hue + 180) % 360;
	}

	fromHSBToRef(hue, density, 50 + 0.25 * exposure, result);

	result[0] *= 2;
	result[1] *= 2;
	result[2] *= 2;
	result[3] = 1 + 0.01 * saturation;

	return result;
}

/**
 * Computes the uniforms of the color curves the same way Babylon.js `ColorCurves._bind` does.
 * @returns the neutral, positive and negative curves.
 */
export function _computeColorCurves(curves: IColorCurves): { neutral: number[]; positive: number[]; negative: number[] } {
	const multiply = (a: number[], b: number[]) => a.map((value, index) => value * b[index]);
	const subtract = (a: number[], b: number[]) => a.map((value, index) => value - b[index]);

	const globalCurve = getColorGradingData(curves.globalHue, curves.globalDensity, curves.globalSaturation, curves.globalExposure);
	const highlightsCurve = multiply(getColorGradingData(curves.highlightsHue, curves.highlightsDensity, curves.highlightsSaturation, curves.highlightsExposure), globalCurve);
	const midtonesCurve = multiply(getColorGradingData(curves.midtonesHue, curves.midtonesDensity, curves.midtonesSaturation, curves.midtonesExposure), globalCurve);
	const shadowsCurve = multiply(getColorGradingData(curves.shadowsHue, curves.shadowsDensity, curves.shadowsSaturation, curves.shadowsExposure), globalCurve);

	return {
		neutral: midtonesCurve,
		positive: subtract(highlightsCurve, midtonesCurve),
		negative: subtract(midtonesCurve, shadowsCurve),
	};
}

/**
 * Planckian locus of Babylon.js (`colorTemperature.functions`): mired, u, v and slope of the isotherm.
 */
const planckianLocusTable = [
	[0, 0.18006, 0.26352, -0.24341],
	[10, 0.18066, 0.26589, -0.25479],
	[20, 0.18133, 0.26846, -0.26876],
	[30, 0.18208, 0.27119, -0.28539],
	[40, 0.18293, 0.27407, -0.3047],
	[50, 0.18388, 0.27709, -0.32675],
	[60, 0.18494, 0.28021, -0.35156],
	[70, 0.18611, 0.28342, -0.37915],
	[80, 0.1874, 0.28668, -0.40955],
	[90, 0.1888, 0.28997, -0.44278],
	[100, 0.19032, 0.29326, -0.47888],
	[125, 0.19462, 0.30141, -0.58204],
	[150, 0.19962, 0.30921, -0.70471],
	[175, 0.20525, 0.31647, -0.84901],
	[200, 0.21142, 0.32312, -1.0182],
	[225, 0.21807, 0.32909, -1.2168],
	[250, 0.22511, 0.33439, -1.4512],
	[275, 0.23247, 0.33904, -1.7298],
	[300, 0.2401, 0.34308, -2.0637],
	[325, 0.24792, 0.34655, -2.4681],
	[350, 0.25591, 0.34951, -2.9641],
	[375, 0.264, 0.352, -3.5814],
	[400, 0.27218, 0.35407, -4.3633],
	[425, 0.28039, 0.35577, -5.3762],
	[450, 0.28863, 0.35714, -6.7262],
	[475, 0.29685, 0.35823, -8.5955],
	[500, 0.30505, 0.35907, -11.324],
	[525, 0.3132, 0.35968, -15.628],
	[550, 0.32129, 0.36011, -23.325],
	[575, 0.32931, 0.36038, -40.77],
	[600, 0.33724, 0.36051, -116.45],
];

/**
 * Matrices of Babylon.js, stored as Babylon.js `Matrix` stores its 16 values (vectors multiplied on the left).
 */
type Matrix4 = number[];

function multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
	const result = new Array<number>(16).fill(0);
	for (let row = 0; row < 4; ++row) {
		for (let column = 0; column < 4; ++column) {
			let sum = 0;
			for (let k = 0; k < 4; ++k) {
				sum += a[row * 4 + k] * b[k * 4 + column];
			}
			result[row * 4 + column] = sum;
		}
	}

	return result;
}

function invertMatrix(m: Matrix4): Matrix4 {
	const inv = new Array<number>(16);

	inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
	inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
	inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
	inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
	inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
	inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
	inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
	inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
	inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
	inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
	inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
	inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
	inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
	inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
	inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
	inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

	const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
	return inv.map((value) => value / det);
}

/**
 * Same as Babylon.js `Vector3.TransformNormal`.
 */
function transformNormal(v: number[], m: Matrix4): number[] {
	return [v[0] * m[0] + v[1] * m[4] + v[2] * m[8], v[0] * m[1] + v[1] * m[5] + v[2] * m[9], v[0] * m[2] + v[1] * m[6] + v[2] * m[10]];
}

/**
 * Same as Babylon.js `TemperatureTintToXyz`.
 */
function temperatureTintToXyz(temperatureKelvin: number, tint: number): number[] {
	const minTemperatureKelvin = 1e6 / planckianLocusTable[planckianLocusTable.length - 1][0];
	const safeTemperatureKelvin = Number.isNaN(temperatureKelvin) ? minTemperatureKelvin : Math.max(temperatureKelvin, minTemperatureKelvin);
	const mired = clamp(1e6 / safeTemperatureKelvin, planckianLocusTable[0][0], planckianLocusTable[planckianLocusTable.length - 1][0]);

	let low = 0;
	let high = planckianLocusTable.length - 1;
	while (high - low > 1) {
		const mid = (low + high) >> 1;
		if (planckianLocusTable[mid][0] <= mired) {
			low = mid;
		} else {
			high = mid;
		}
	}

	const [lowMired, lowU, lowV, lowT] = planckianLocusTable[low];
	const [highMired, highU, highV, highT] = planckianLocusTable[low + 1];
	const f = (mired - lowMired) / (highMired - lowMired);

	const normalize = (x: number, y: number) => {
		const length = Math.sqrt(x * x + y * y);
		return length === 0 ? [x, y] : [x / length, y / length];
	};

	const uv = [lowU + (highU - lowU) * f, lowV + (highV - lowV) * f];
	const isothermLow = normalize(1, lowT);
	const isothermHigh = normalize(1, highT);
	const isotherm = normalize(isothermLow[0] + (isothermHigh[0] - isothermLow[0]) * f, isothermLow[1] + (isothermHigh[1] - isothermLow[1]) * f);

	const clampedTint = clamp(tint, -150, 150);
	uv[0] -= isotherm[0] * (clampedTint / 3000);
	uv[1] -= isotherm[1] * (clampedTint / 3000);

	const denom = 2 * uv[0] - 8 * uv[1] + 4;
	const x = (3 * uv[0]) / denom;
	const y = (2 * uv[1]) / denom;

	return [x / y, 1, (1 - x - y) / y];
}

const bradfordMatrix: Matrix4 = [0.8951, -0.7502, 0.0389, 0, 0.2664, 1.7135, -0.0685, 0, -0.1614, 0.0367, 1.0296, 0, 0, 0, 0, 1];
const inverseBradfordMatrix = invertMatrix(bradfordMatrix);

/**
 * Same as Babylon.js `BradfordAdapt`.
 */
function bradfordAdapt(sourceWhiteXYZ: number[], destWhiteXYZ: number[]): Matrix4 {
	const sourceLMS = transformNormal(sourceWhiteXYZ, bradfordMatrix);
	const destLMS = transformNormal(destWhiteXYZ, bradfordMatrix);

	const ratio = (dest: number, source: number) => clamp(source > 0 ? dest / source : 10, 0.1, 10);
	const scale: Matrix4 = [ratio(destLMS[0], sourceLMS[0]), 0, 0, 0, 0, ratio(destLMS[1], sourceLMS[1]), 0, 0, 0, 0, ratio(destLMS[2], sourceLMS[2]), 0, 0, 0, 0, 1];

	return multiplyMatrices(multiplyMatrices(bradfordMatrix, scale), inverseBradfordMatrix);
}

const standardRgbToXyzD65: Matrix4 = [0.4124564, 0.2126729, 0.0193339, 0, 0.3575761, 0.7151522, 0.119192, 0, 0.1804375, 0.072175, 0.9503041, 0, 0, 0, 0, 1];
const rgbToXyzD65 = multiplyMatrices(standardRgbToXyzD65, bradfordAdapt([0.95047, 1.0, 1.08883], temperatureTintToXyz(6500, 0)));
const xyzToRgbD65 = invertMatrix(rgbToXyzD65);
const referenceWhiteXyz = transformNormal([1, 1, 1], rgbToXyzD65);

/**
 * Same as Babylon.js `GetWhiteBalanceMatrix`: returns the 3x3 matrix, column major.
 * @param temperatureKelvin defines the temperature of the white balance, in Kelvin.
 * @param tint defines the tint of the white balance.
 */
export function _getWhiteBalanceMatrix(temperatureKelvin: number, tint: number): number[] {
	const adapt = bradfordAdapt(temperatureTintToXyz(temperatureKelvin, tint), referenceWhiteXyz);
	const m = multiplyMatrices(multiplyMatrices(rgbToXyzD65, adapt), xyzToRgbD65);

	return [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
}

/**
 * Defines the defines of the image processing, same as Babylon.js `IImageProcessingConfigurationDefines`.
 */
export interface IImageProcessingDefines {
	IMAGEPROCESSING: boolean;
	WHITEBALANCE: boolean;
	VIGNETTE: boolean;
	VIGNETTEBLENDMODEMULTIPLY: boolean;
	VIGNETTEBLENDMODEOPAQUE: boolean;
	TONEMAPPING: number;
	CONTRAST: boolean;
	EXPOSURE: boolean;
	COLORCURVES: boolean;
	COLORGRADING: boolean;
	COLORGRADING3D: boolean;
	SAMPLER3DGREENDEPTH: boolean;
	SAMPLER3DBGRMAP: boolean;
	DITHER: boolean;
	IMAGEPROCESSINGPOSTPROCESS: boolean;
	SKIPFINALCOLORCLAMP: boolean;
}

/**
 * Defines the image processing configuration of a scene, with the same properties as Babylon.js
 * `ImageProcessingConfiguration`. The default rendering pipeline applies it using a post-process
 * (`applyByPostProcess`), the materials apply it otherwise.
 */
export class ImageProcessingConfiguration {
	/**
	 * Default tone mapping applied in BabylonJS.
	 */
	public static readonly TONEMAPPING_STANDARD = 0;
	/**
	 * ACES Tone mapping (used by default in unreal and unity).
	 */
	public static readonly TONEMAPPING_ACES = 1;
	/**
	 * Neutral Tone mapping developed by the Khronos group.
	 */
	public static readonly TONEMAPPING_KHR_PBR_NEUTRAL = 2;

	/**
	 * Used to apply the vignette as a mix with the pixel color.
	 */
	public static readonly VIGNETTEMODE_MULTIPLY = 0;
	/**
	 * Used to apply the vignette as a replacement of the pixel color.
	 */
	public static readonly VIGNETTEMODE_OPAQUE = 1;

	/**
	 * Color curves setup used in the effect if colorCurvesEnabled is set to true.
	 */
	public colorCurves: ColorCurves | IColorCurves | null = new ColorCurves();

	/**
	 * Vignette stretch size.
	 */
	public vignetteStretch: number = 0;
	/**
	 * Vignette center X Offset.
	 */
	public vignetteCenterX: number = 0;
	/**
	 * Vignette center Y Offset.
	 */
	public vignetteCenterY: number = 0;
	/**
	 * Vignette weight or intensity of the vignette effect.
	 */
	public vignetteWeight: number = 1.5;
	/**
	 * Color of the vignette applied on the screen through the chosen blend mode (vignetteBlendMode).
	 */
	public vignetteColor: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 };
	/**
	 * Camera field of view used by the Vignette effect.
	 */
	public vignetteCameraFov: number = 0.5;

	/**
	 * Width of the output texture used in the post process. If not provided, uses the width of the screen.
	 */
	public outputTextureWidth: number = 0;
	/**
	 * Height of the output texture used in the post process. If not provided, uses the height of the screen.
	 */
	public outputTextureHeight: number = 0;

	/**
	 * An event triggered when the configuration changes and requires shaders to update some parameters.
	 */
	public readonly onUpdateParameters: Observable<ImageProcessingConfiguration> = new Observable<ImageProcessingConfiguration>();

	private _colorCurvesEnabled: boolean = false;
	private _colorGradingTexture: ColorGradingTexture | null = null;
	private _colorGradingEnabled: boolean = false;
	private _colorGradingWithGreenDepth: boolean = true;
	private _colorGradingBGR: boolean = true;
	private _exposure: number = 1;
	private _toneMappingEnabled: boolean = false;
	private _toneMappingType: number = ImageProcessingConfiguration.TONEMAPPING_STANDARD;
	private _contrast: number = 1;
	private _whiteBalanceEnabled: boolean = false;
	private _temperature: number = 6500;
	private _tint: number = 0;
	private _vignetteBlendMode: number = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
	private _vignetteEnabled: boolean = false;
	private _ditheringEnabled: boolean = false;
	private _ditheringIntensity: number = 1 / 255;
	private _skipFinalColorClamp: boolean = false;
	private _applyByPostProcess: boolean = false;
	private _isEnabled: boolean = true;

	private _whiteBalanceMatrix: number[] | null = null;
	private _whiteBalanceMatrixTemperature: number = 0;
	private _whiteBalanceMatrixTint: number = 0;

	public get colorCurvesEnabled(): boolean {
		return this._colorCurvesEnabled;
	}

	public set colorCurvesEnabled(value: boolean) {
		this._set("_colorCurvesEnabled", value);
	}

	public get colorGradingTexture(): ColorGradingTexture | null {
		return this._colorGradingTexture;
	}

	public set colorGradingTexture(value: ColorGradingTexture | null) {
		this._set("_colorGradingTexture", value);
	}

	public get colorGradingEnabled(): boolean {
		return this._colorGradingEnabled;
	}

	public set colorGradingEnabled(value: boolean) {
		this._set("_colorGradingEnabled", value);
	}

	public get colorGradingWithGreenDepth(): boolean {
		return this._colorGradingWithGreenDepth;
	}

	public set colorGradingWithGreenDepth(value: boolean) {
		this._set("_colorGradingWithGreenDepth", value);
	}

	public get colorGradingBGR(): boolean {
		return this._colorGradingBGR;
	}

	public set colorGradingBGR(value: boolean) {
		this._set("_colorGradingBGR", value);
	}

	public get exposure(): number {
		return this._exposure;
	}

	public set exposure(value: number) {
		this._set("_exposure", value);
	}

	public get toneMappingEnabled(): boolean {
		return this._toneMappingEnabled;
	}

	public set toneMappingEnabled(value: boolean) {
		this._set("_toneMappingEnabled", value);
	}

	public get toneMappingType(): number {
		return this._toneMappingType;
	}

	public set toneMappingType(value: number) {
		this._set("_toneMappingType", value);
	}

	public get contrast(): number {
		return this._contrast;
	}

	public set contrast(value: number) {
		this._set("_contrast", value);
	}

	public get whiteBalanceEnabled(): boolean {
		return this._whiteBalanceEnabled;
	}

	public set whiteBalanceEnabled(value: boolean) {
		this._set("_whiteBalanceEnabled", value);
	}

	public get temperature(): number {
		return this._temperature;
	}

	public set temperature(value: number) {
		this._set("_temperature", value);
	}

	public get tint(): number {
		return this._tint;
	}

	public set tint(value: number) {
		this._set("_tint", value);
	}

	public get vignetteBlendMode(): number {
		return this._vignetteBlendMode;
	}

	public set vignetteBlendMode(value: number) {
		this._set("_vignetteBlendMode", value);
	}

	public get vignetteEnabled(): boolean {
		return this._vignetteEnabled;
	}

	public set vignetteEnabled(value: boolean) {
		this._set("_vignetteEnabled", value);
	}

	public get ditheringEnabled(): boolean {
		return this._ditheringEnabled;
	}

	public set ditheringEnabled(value: boolean) {
		this._set("_ditheringEnabled", value);
	}

	public get ditheringIntensity(): number {
		return this._ditheringIntensity;
	}

	public set ditheringIntensity(value: number) {
		this._set("_ditheringIntensity", value);
	}

	public get skipFinalColorClamp(): boolean {
		return this._skipFinalColorClamp;
	}

	public set skipFinalColorClamp(value: boolean) {
		this._set("_skipFinalColorClamp", value);
	}

	public get applyByPostProcess(): boolean {
		return this._applyByPostProcess;
	}

	public set applyByPostProcess(value: boolean) {
		this._set("_applyByPostProcess", value);
	}

	public get isEnabled(): boolean {
		return this._isEnabled;
	}

	public set isEnabled(value: boolean) {
		this._set("_isEnabled", value);
	}

	/**
	 * Returns the class name of the configuration.
	 */
	public getClassName(): string {
		return "ImageProcessingConfiguration";
	}

	/**
	 * Returns the white balance matrix (3x3, column major) for the current temperature and tint.
	 */
	public getWhiteBalanceMatrix(): number[] {
		if (!this._whiteBalanceMatrix || this._whiteBalanceMatrixTemperature !== this._temperature || this._whiteBalanceMatrixTint !== this._tint) {
			this._whiteBalanceMatrixTemperature = this._temperature;
			this._whiteBalanceMatrixTint = this._tint;
			this._whiteBalanceMatrix = _getWhiteBalanceMatrix(this._temperature, this._tint);
		}

		return this._whiteBalanceMatrix;
	}

	/**
	 * Prepares the defines of the shaders, same as Babylon.js `ImageProcessingConfiguration.prepareDefines`.
	 * @param defines defines the defines to complete.
	 * @param forPostProcess defines wether or not the defines are for the image processing post-process.
	 * @param applyByPostProcess defines wether or not the image processing is applied by a post-process (the value of
	 * the configuration by default).
	 */
	public prepareDefines(defines: IImageProcessingDefines, forPostProcess: boolean = false, applyByPostProcess: boolean = this._applyByPostProcess): void {
		if (forPostProcess !== applyByPostProcess || !this._isEnabled) {
			defines.WHITEBALANCE = false;
			defines.VIGNETTE = false;
			defines.TONEMAPPING = 0;
			defines.CONTRAST = false;
			defines.EXPOSURE = false;
			defines.COLORCURVES = false;
			defines.COLORGRADING = false;
			defines.COLORGRADING3D = false;
			defines.DITHER = false;
			defines.IMAGEPROCESSING = false;
			defines.SKIPFINALCOLORCLAMP = this._skipFinalColorClamp;
			defines.IMAGEPROCESSINGPOSTPROCESS = applyByPostProcess && this._isEnabled;
			return;
		}

		defines.WHITEBALANCE = this._whiteBalanceEnabled;
		defines.VIGNETTE = this._vignetteEnabled;
		defines.VIGNETTEBLENDMODEMULTIPLY = this._vignetteBlendMode === ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
		defines.VIGNETTEBLENDMODEOPAQUE = !defines.VIGNETTEBLENDMODEMULTIPLY;

		if (!this._toneMappingEnabled) {
			defines.TONEMAPPING = 0;
		} else {
			switch (this._toneMappingType) {
				case ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL:
					defines.TONEMAPPING = 3;
					break;
				case ImageProcessingConfiguration.TONEMAPPING_ACES:
					defines.TONEMAPPING = 2;
					break;
				default:
					defines.TONEMAPPING = 1;
					break;
			}
		}

		defines.CONTRAST = this._contrast !== 1.0;
		defines.EXPOSURE = this._exposure !== 1.0;
		defines.COLORCURVES = this._colorCurvesEnabled && !!this.colorCurves;
		// The lookup tables are 3D textures (the 2D lookup textures are converted when loaded). Babylon.js waits for the
		// texture to be ready before rendering with it.
		defines.COLORGRADING = this._colorGradingEnabled && !!this._colorGradingTexture?.texture;
		defines.COLORGRADING3D = defines.COLORGRADING;
		defines.SAMPLER3DGREENDEPTH = this._colorGradingWithGreenDepth;
		defines.SAMPLER3DBGRMAP = this._colorGradingBGR;
		defines.DITHER = this._ditheringEnabled;
		defines.IMAGEPROCESSINGPOSTPROCESS = applyByPostProcess;
		defines.SKIPFINALCOLORCLAMP = this._skipFinalColorClamp;
		defines.IMAGEPROCESSING =
			defines.WHITEBALANCE ||
			defines.VIGNETTE ||
			!!defines.TONEMAPPING ||
			defines.CONTRAST ||
			defines.EXPOSURE ||
			defines.COLORCURVES ||
			defines.COLORGRADING ||
			defines.DITHER;
	}

	/**
	 * Writes the uniforms of the image processing in the given pass, same as Babylon.js `ImageProcessingConfiguration.bind`.
	 * @param pass defines the pass to write the uniforms of.
	 * @param renderWidth defines the width of the rendering in pixels.
	 * @param renderHeight defines the height of the rendering in pixels.
	 * @param overrideAspectRatio defines the aspect ratio to use for the vignette, if any.
	 */
	public bind(pass: PostProcessPass, renderWidth: number, renderHeight: number, overrideAspectRatio?: number): void {
		const uniforms = pass.uniforms;

		if (this._whiteBalanceEnabled) {
			const m = this.getWhiteBalanceMatrix();
			// The columns of the 3x3 matrices are aligned on 16 bytes.
			uniforms.setArray("whiteBalanceMatrix", [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0]);
		}

		if (this._colorCurvesEnabled && this.colorCurves) {
			const curves = _computeColorCurves(this.colorCurves);
			uniforms.setArray("vCameraColorCurveNeutral", curves.neutral);
			uniforms.setArray("vCameraColorCurvePositive", curves.positive);
			uniforms.setArray("vCameraColorCurveNegative", curves.negative);
		}

		if (this._vignetteEnabled || this._ditheringEnabled) {
			const inverseWidth = 1 / (this.outputTextureWidth || renderWidth);
			const inverseHeight = 1 / (this.outputTextureHeight || renderHeight);
			uniforms.set("vInverseScreenSize", inverseWidth, inverseHeight);

			if (this._ditheringEnabled) {
				uniforms.set("ditherIntensity", 0.5 * this._ditheringIntensity);
			}

			if (this._vignetteEnabled) {
				const aspectRatio = overrideAspectRatio ?? inverseHeight / inverseWidth;

				let vignetteScaleY = Math.tan(this.vignetteCameraFov * 0.5);
				let vignetteScaleX = vignetteScaleY * aspectRatio;

				const vignetteScaleGeometricMean = Math.sqrt(vignetteScaleX * vignetteScaleY);
				vignetteScaleX = vignetteScaleX + (vignetteScaleGeometricMean - vignetteScaleX) * this.vignetteStretch;
				vignetteScaleY = vignetteScaleY + (vignetteScaleGeometricMean - vignetteScaleY) * this.vignetteStretch;

				uniforms.set("vignetteSettings1", vignetteScaleX, vignetteScaleY, -vignetteScaleX * this.vignetteCenterX, -vignetteScaleY * this.vignetteCenterY);
				uniforms.set("vignetteSettings2", this.vignetteColor.r, this.vignetteColor.g, this.vignetteColor.b, -2.0 * this.vignetteWeight);
			}
		}

		uniforms.set("exposureLinear", this._exposure);
		uniforms.set("contrast", this._contrast);

		const colorGradingTexture = this._colorGradingTexture;
		if (colorGradingTexture?.texture && colorGradingTexture.size > 0) {
			const textureSize = colorGradingTexture.size;
			uniforms.set("colorTransformSettings", (textureSize - 1) / textureSize, 0.5 / textureSize, textureSize, colorGradingTexture.level);
		}
	}

	private _set(key: string, value: unknown): void {
		const fields = this as unknown as Record<string, unknown>;
		if (fields[key] === value) {
			return;
		}

		fields[key] = value;
		this.onUpdateParameters.notifyObservers(this);
	}
}

const scenesConfigurations = new WeakMap<SceneContext, ImageProcessingConfiguration>();

/**
 * Returns the image processing configuration of the given scene, same as Babylon.js `scene.imageProcessingConfiguration`.
 * @param scene defines the reference to the scene.
 */
export function getSceneImageProcessingConfiguration(scene: SceneContext): ImageProcessingConfiguration {
	let configuration = scenesConfigurations.get(scene);
	if (!configuration) {
		configuration = new ImageProcessingConfiguration();
		scenesConfigurations.set(scene, configuration);
	}

	return configuration;
}

/**
 * Returns the defines of the image processing with their default values.
 */
function createDefines(): IImageProcessingDefines & { FROMLINEARSPACE: boolean } {
	return {
		IMAGEPROCESSING: false,
		WHITEBALANCE: false,
		VIGNETTE: false,
		VIGNETTEBLENDMODEMULTIPLY: false,
		VIGNETTEBLENDMODEOPAQUE: false,
		TONEMAPPING: 0,
		CONTRAST: false,
		COLORCURVES: false,
		COLORGRADING: false,
		COLORGRADING3D: false,
		FROMLINEARSPACE: false,
		SAMPLER3DGREENDEPTH: false,
		SAMPLER3DBGRMAP: false,
		DITHER: false,
		IMAGEPROCESSINGPOSTPROCESS: false,
		EXPOSURE: false,
		SKIPFINALCOLORCLAMP: false,
	};
}

/**
 * Defines the image processing post-process of the default rendering pipeline, with the same properties as Babylon.js
 * `ImageProcessingPostProcess`: it applies the image processing configuration it is attached to (the configuration of
 * the scene for the default rendering pipeline).
 */
export class ImageProcessingPostProcess {
	/**
	 * Defines the name of the post-process.
	 */
	public readonly name: string;

	private _configuration: ImageProcessingConfiguration;
	private _fromLinearSpace: boolean = true;
	private _passes: Map<string, PostProcessPass> = new Map();
	private _defines = createDefines();

	/**
	 * Constructor.
	 * @param name defines the name of the post-process.
	 * @param configuration defines the image processing configuration the post-process applies.
	 */
	public constructor(name: string, configuration: ImageProcessingConfiguration) {
		this.name = name;

		this._configuration = configuration;
		this._configuration.applyByPostProcess = true;
	}

	/**
	 * Gets the image processing configuration used by the post-process.
	 */
	public get imageProcessingConfiguration(): ImageProcessingConfiguration {
		return this._configuration;
	}

	/**
	 * Gets wether or not the input of the post-process is in linear space (true by default).
	 */
	public get fromLinearSpace(): boolean {
		return this._fromLinearSpace;
	}

	/**
	 * Sets wether or not the input of the post-process is in linear space.
	 */
	public set fromLinearSpace(value: boolean) {
		this._fromLinearSpace = value;
	}

	public get colorCurves(): ColorCurves | IColorCurves | null {
		return this._configuration.colorCurves;
	}

	public set colorCurves(value: ColorCurves | IColorCurves | null) {
		this._configuration.colorCurves = value;
	}

	public get colorCurvesEnabled(): boolean {
		return this._configuration.colorCurvesEnabled;
	}

	public set colorCurvesEnabled(value: boolean) {
		this._configuration.colorCurvesEnabled = value;
	}

	public get colorGradingTexture(): ColorGradingTexture | null {
		return this._configuration.colorGradingTexture;
	}

	public set colorGradingTexture(value: ColorGradingTexture | null) {
		this._configuration.colorGradingTexture = value;
	}

	public get colorGradingEnabled(): boolean {
		return this._configuration.colorGradingEnabled;
	}

	public set colorGradingEnabled(value: boolean) {
		this._configuration.colorGradingEnabled = value;
	}

	public get exposure(): number {
		return this._configuration.exposure;
	}

	public set exposure(value: number) {
		this._configuration.exposure = value;
	}

	public get toneMappingEnabled(): boolean {
		return this._configuration.toneMappingEnabled;
	}

	public set toneMappingEnabled(value: boolean) {
		this._configuration.toneMappingEnabled = value;
	}

	public get toneMappingType(): number {
		return this._configuration.toneMappingType;
	}

	public set toneMappingType(value: number) {
		this._configuration.toneMappingType = value;
	}

	public get contrast(): number {
		return this._configuration.contrast;
	}

	public set contrast(value: number) {
		this._configuration.contrast = value;
	}

	public get vignetteStretch(): number {
		return this._configuration.vignetteStretch;
	}

	public set vignetteStretch(value: number) {
		this._configuration.vignetteStretch = value;
	}

	public get vignetteCenterX(): number {
		return this._configuration.vignetteCenterX;
	}

	public set vignetteCenterX(value: number) {
		this._configuration.vignetteCenterX = value;
	}

	public get vignetteCenterY(): number {
		return this._configuration.vignetteCenterY;
	}

	public set vignetteCenterY(value: number) {
		this._configuration.vignetteCenterY = value;
	}

	public get vignetteWeight(): number {
		return this._configuration.vignetteWeight;
	}

	public set vignetteWeight(value: number) {
		this._configuration.vignetteWeight = value;
	}

	public get vignetteColor(): { r: number; g: number; b: number; a: number } {
		return this._configuration.vignetteColor;
	}

	public set vignetteColor(value: { r: number; g: number; b: number; a: number }) {
		this._configuration.vignetteColor = value;
	}

	public get vignetteCameraFov(): number {
		return this._configuration.vignetteCameraFov;
	}

	public set vignetteCameraFov(value: number) {
		this._configuration.vignetteCameraFov = value;
	}

	public get vignetteBlendMode(): number {
		return this._configuration.vignetteBlendMode;
	}

	public set vignetteBlendMode(value: number) {
		this._configuration.vignetteBlendMode = value;
	}

	public get vignetteEnabled(): boolean {
		return this._configuration.vignetteEnabled;
	}

	public set vignetteEnabled(value: boolean) {
		this._configuration.vignetteEnabled = value;
	}

	public get ditheringEnabled(): boolean {
		return this._configuration.ditheringEnabled;
	}

	public set ditheringEnabled(value: boolean) {
		this._configuration.ditheringEnabled = value;
	}

	public get ditheringIntensity(): number {
		return this._configuration.ditheringIntensity;
	}

	public set ditheringIntensity(value: number) {
		this._configuration.ditheringIntensity = value;
	}

	public get whiteBalanceEnabled(): boolean {
		return this._configuration.whiteBalanceEnabled;
	}

	public set whiteBalanceEnabled(value: boolean) {
		this._configuration.whiteBalanceEnabled = value;
	}

	public get temperature(): number {
		return this._configuration.temperature;
	}

	public set temperature(value: number) {
		this._configuration.temperature = value;
	}

	public get tint(): number {
		return this._configuration.tint;
	}

	public set tint(value: number) {
		this._configuration.tint = value;
	}

	/**
	 * Returns the class name of the post-process.
	 */
	public getClassName(): string {
		return "ImageProcessingPostProcess";
	}

	/**
	 * Renders the post-process.
	 * @param context defines the context of the rendering of the frame.
	 * @param input defines the texture to process.
	 * @param target defines the target to draw into.
	 * @returns the number of draw calls.
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget): number {
		const defines = this._defines;
		defines.FROMLINEARSPACE = this._fromLinearSpace;
		this._configuration.prepareDefines(defines, true);

		const key = JSON.stringify(defines);

		let pass = this._passes.get(key);
		if (!pass) {
			pass = new PostProcessPass(context.engine, { name: this.name, fragment: imageProcessingFragmentWGSL }, { defines: { ...defines } });
			this._passes.set(key, pass);
		}

		// Same as Babylon.js: the aspect ratio of the vignette is the one of the post-process.
		this._configuration.bind(pass, context.width, context.height, input.width / input.height);

		pass.setTexture("textureSampler", input);

		const colorGradingTexture = this._configuration.colorGradingTexture;
		if (defines.COLORGRADING && colorGradingTexture?.texture) {
			const lut = colorGradingTexture.texture;
			pass.setTexture("txColorTransform", { view: lut.view, width: lut.width, height: lut.height, format: lut.texture.format });
		}

		return pass.draw(target);
	}

	/**
	 * Disposes the post-process: the configuration is not applied by a post-process anymore.
	 */
	public dispose(): void {
		this._passes.forEach((pass) => pass.dispose());
		this._passes.clear();

		this._configuration.applyByPostProcess = false;
	}
}
