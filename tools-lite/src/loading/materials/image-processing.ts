import { enableMaterialPlugins, markMaterialUboDirty, Material, MaterialPlugin, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../../tools/warn";
import { getSceneData } from "../../tools/scene";

import { _getMaterialsToneMapping, isEditorSceneContext } from "../../rendering/pipeline";
import { imageProcessingFunctionsWGSL } from "../../rendering/shaders";
import {
	_computeColorCurves,
	getSceneImageProcessingConfiguration,
	IColorCurves,
	IImageProcessingDefines,
	ImageProcessingConfiguration,
} from "../../rendering/default/image-processing";

/**
 * Defines the parameters of the image processing a material applies, as Babylon.js does with the defines and the
 * uniforms of the image processing configuration of the material (or of the scene).
 */
interface IMaterialImageProcessing {
	/**
	 * 0: linear output (the image processing is applied by a post-process), 1: image processing applied by the material,
	 * 2: image processing disabled.
	 */
	mode: number;
	/**
	 * Value of the "IMAGEPROCESSING" define: wether or not an effect of the image processing is enabled.
	 */
	imageProcessing: boolean;
	exposure: number;
	contrast: number;
	/**
	 * Value of the "TONEMAPPING" define: 0 none, 1 standard, 2 ACES and 3 Khronos PBR neutral.
	 */
	toneMapping: number;
	/**
	 * 0: disabled, 1: multiply, 2: opaque.
	 */
	vignette: number;
	vignetteCameraFov: number;
	vignetteStretch: number;
	vignetteCenterX: number;
	vignetteCenterY: number;
	vignetteWeight: number;
	vignetteColor: number[];
	curves: { neutral: number[]; positive: number[]; negative: number[] } | null;
	ditherIntensity: number;
}

/**
 * Defines the state of the image processing of a scene, read by the image processing plugins of its materials.
 */
interface ISceneImageProcessingState {
	parameters: IMaterialImageProcessing;
	key: string;
	width: number;
	height: number;
	materials: Set<Material>;
}

const scenesStates = new WeakMap<SceneContext, ISceneImageProcessingState>();

function createDefines(): IImageProcessingDefines {
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
		SAMPLER3DGREENDEPTH: false,
		SAMPLER3DBGRMAP: false,
		DITHER: false,
		IMAGEPROCESSINGPOSTPROCESS: false,
		EXPOSURE: false,
		SKIPFINALCOLORCLAMP: false,
	};
}

/**
 * Returns the image processing materials apply with the given configuration, same as the defines and the uniforms
 * Babylon.js computes for the materials (`prepareDefines` and `bind` of `ImageProcessingConfiguration`).
 * @param configuration defines the image processing configuration.
 * @param postProcessAvailable defines wether or not a post-process can apply the image processing: the scenes rendered
 * without the frame graph tasks of the tools have no post-process, the materials apply it instead.
 */
function getMaterialImageProcessing(configuration: ImageProcessingConfiguration, postProcessAvailable: boolean): IMaterialImageProcessing {
	const defines = createDefines();
	configuration.prepareDefines(defines, false, configuration.applyByPostProcess && postProcessAvailable);

	const mode = defines.IMAGEPROCESSINGPOSTPROCESS ? 0 : configuration.isEnabled ? 1 : 2;

	if (mode === 1 && (defines.COLORGRADING || defines.WHITEBALANCE)) {
		warnOnce(
			"material-image-processing-unsupported",
			"the color grading and the white balance of the image processing applied by the materials are not supported (only the exposure, contrast, tone mapping, vignette, color curves and dithering are)."
		);
	}

	return {
		mode,
		imageProcessing: defines.IMAGEPROCESSING,
		exposure: configuration.exposure,
		contrast: configuration.contrast,
		toneMapping: defines.TONEMAPPING,
		vignette: defines.VIGNETTE ? (defines.VIGNETTEBLENDMODEMULTIPLY ? 1 : 2) : 0,
		vignetteCameraFov: configuration.vignetteCameraFov,
		vignetteStretch: configuration.vignetteStretch,
		vignetteCenterX: configuration.vignetteCenterX,
		vignetteCenterY: configuration.vignetteCenterY,
		vignetteWeight: configuration.vignetteWeight,
		vignetteColor: [configuration.vignetteColor.r, configuration.vignetteColor.g, configuration.vignetteColor.b, configuration.vignetteColor.a],
		curves: defines.COLORCURVES && configuration.colorCurves ? _computeColorCurves(configuration.colorCurves) : null,
		ditherIntensity: defines.DITHER ? 0.5 * configuration.ditheringIntensity : 0,
	};
}

function getSceneState(scene: SceneContext): ISceneImageProcessingState {
	let state = scenesStates.get(scene);
	if (!state) {
		state = {
			parameters: getMaterialImageProcessing(getSceneImageProcessingConfiguration(scene), isEditorSceneContext(scene)),
			key: "",
			width: 0,
			height: 0,
			materials: new Set(),
		};
		scenesStates.set(scene, state);

		// Same state for every material: the uniforms of the materials are updated only when it changes.
		getSceneData(scene).onBeforeRenderObservable.add(() => updateSceneState(scene, state!));
		updateSceneState(scene, state);

		enableMaterialPlugins(scene);
	}

	return state;
}

function updateSceneState(scene: SceneContext, state: ISceneImageProcessingState): void {
	const parameters = getMaterialImageProcessing(getSceneImageProcessingConfiguration(scene), isEditorSceneContext(scene));
	const width = scene.surface.canvas?.width ?? 1;
	const height = scene.surface.canvas?.height ?? 1;

	const key = JSON.stringify(parameters);
	if (state.key === key && state.width === width && state.height === height) {
		return;
	}

	state.parameters = parameters;
	state.key = key;
	state.width = width;
	state.height = height;

	state.materials.forEach((material) => markMaterialUboDirty(material));
}

/**
 * Returns the color curves of the given serialized color curves of Babylon.js (`ColorCurves` serialized with the image
 * processing configuration of a material).
 */
function getColorCurves(data: any): IColorCurves {
	const value = (key: string, defaultValue: number) => data?.[`_${key}`] ?? data?.[key] ?? defaultValue;

	return {
		globalHue: value("globalHue", 30),
		globalDensity: value("globalDensity", 0),
		globalExposure: value("globalExposure", 0),
		globalSaturation: value("globalSaturation", 0),
		highlightsHue: value("highlightsHue", 30),
		highlightsDensity: value("highlightsDensity", 0),
		highlightsExposure: value("highlightsExposure", 0),
		highlightsSaturation: value("highlightsSaturation", 0),
		midtonesHue: value("midtonesHue", 30),
		midtonesDensity: value("midtonesDensity", 0),
		midtonesExposure: value("midtonesExposure", 0),
		midtonesSaturation: value("midtonesSaturation", 0),
		shadowsHue: value("shadowsHue", 30),
		shadowsDensity: value("shadowsDensity", 0),
		shadowsExposure: value("shadowsExposure", 0),
		shadowsSaturation: value("shadowsSaturation", 0),
	};
}

/**
 * Creates the image processing configuration saved with a material (`_imageProcessingConfiguration`, saved by some
 * versions of the editor).
 */
function parseMaterialConfiguration(material: Material, data: any): ImageProcessingConfiguration {
	const configuration = new ImageProcessingConfiguration();

	configuration.isEnabled = data._isEnabled ?? data.isEnabled ?? true;
	configuration.applyByPostProcess = data._applyByPostProcess ?? data.applyByPostProcess ?? false;
	configuration.exposure = data._exposure ?? data.exposure ?? 1;
	configuration.contrast = data._contrast ?? data.contrast ?? 1;
	configuration.toneMappingEnabled = data._toneMappingEnabled ?? data.toneMappingEnabled ?? false;
	configuration.toneMappingType = data._toneMappingType ?? data.toneMappingType ?? 0;

	configuration.vignetteEnabled = data._vignetteEnabled ?? data.vignetteEnabled ?? false;
	configuration.vignetteBlendMode = data._vignetteBlendMode ?? data.vignetteBlendMode ?? 0;
	configuration.vignetteCameraFov = data.vignetteCameraFov ?? 0.5;
	configuration.vignetteStretch = data.vignetteStretch ?? 0;
	configuration.vignetteCenterX = data.vignetteCenterX ?? 0;
	configuration.vignetteCenterY = data.vignetteCenterY ?? 0;
	configuration.vignetteWeight = data.vignetteWeight ?? 1.5;

	const vignetteColor = data.vignetteColor ?? [0, 0, 0, 0];
	configuration.vignetteColor = { r: vignetteColor[0] ?? 0, g: vignetteColor[1] ?? 0, b: vignetteColor[2] ?? 0, a: vignetteColor[3] ?? 0 };

	configuration.colorCurvesEnabled = (data._colorCurvesEnabled ?? data.colorCurvesEnabled ?? false) && !!data.colorCurves;
	configuration.colorCurves = data.colorCurves ? getColorCurves(data.colorCurves) : null;

	configuration.ditheringEnabled = data._ditheringEnabled ?? data.ditheringEnabled ?? false;
	configuration.ditheringIntensity = data._ditheringIntensity ?? data.ditheringIntensity ?? 1 / 255;

	if (data._colorGradingEnabled ?? data.colorGradingEnabled ?? false) {
		warnOnce(`material-image-processing-${material.name}`, `the color grading of the image processing configuration of the material "${material.name}" is not supported.`);
	}

	return configuration;
}

/**
 * Helpers of the image processing plugins: the linear color captured before the image processing of Babylon Lite, the
 * fog, and the image processing of Babylon.js.
 */
const definitionsWGSL = /* wgsl */ `
// Linear color of the material, captured before the fog and the image processing of Babylon Lite.
var<private> editorIpLinearColor: vec3<f32>;

// Same fog as the PBR materials of Babylon Lite, applied to the linear color.
fn editorIpApplyFog(rgb: vec3<f32>, worldPosition: vec3<f32>) -> vec3<f32> {
	let fogMode = scene.vFogInfos.x;
	if (fogMode <= 0.0) {
		return rgb;
	}

	let fogDistance = length((scene.view * vec4<f32>(worldPosition, 1.0)).xyz);

	var fogCoefficient = 1.0;
	if (fogMode == 3.0) {
		fogCoefficient = (scene.vFogInfos.z - fogDistance) / (scene.vFogInfos.z - scene.vFogInfos.y);
	} else if (fogMode == 1.0) {
		fogCoefficient = 1.0 / pow(2.71828, fogDistance * scene.vFogInfos.w);
	} else if (fogMode == 2.0) {
		fogCoefficient = 1.0 / pow(2.71828, fogDistance * fogDistance * scene.vFogInfos.w * scene.vFogInfos.w);
	}

	let fogFactor = pow(clamp(fogCoefficient, 0.0, 1.0), 2.2);
	return mix(pow(scene.vFogColor.rgb, vec3<f32>(2.2)), rgb, fogFactor);
}

${imageProcessingFunctionsWGSL}

fn editorIpGetRand(seed: vec2<f32>) -> f32 {
	return fract(sin(dot(seed.xy, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

// Same as "applyImageProcessing" of Babylon.js (exposure, vignette, tone mapping, gamma space, contrast, color curves and
// dithering), with the parameters of the plugin. "fragCoord" is the position of the fragment, origin at the bottom-left
// corner of the target as with Babylon.js.
fn editorIpApplyImageProcessing(color: vec3<f32>, fragCoord: vec2<f32>) -> vec3<f32> {
	var rgb = color * material.editorIpParams.x;

	if (material.editorIpMode.z > 0.5) {
		var viewportXY = fragCoord * material.editorIpScreen.xy;
		viewportXY = viewportXY * 2.0 - 1.0;
		let vignetteXY1 = vec3<f32>(viewportXY * material.editorIpVignette1.xy + material.editorIpVignette1.zw, 1.0);
		let vignette = pow(dot(vignetteXY1, vignetteXY1), material.editorIpVignette2.w);
		if (material.editorIpMode.z < 1.5) {
			rgb *= mix(material.editorIpVignette2.rgb, vec3<f32>(1.0), vignette);
		} else {
			rgb = mix(material.editorIpVignette2.rgb, rgb, vignette);
		}
	}

	rgb = editorIpToneMap(rgb, material.editorIpParams.z);
	rgb = saturate(pow(rgb, vec3<f32>(1.0 / 2.2)));

	if (material.editorIpParams.y != 1.0) {
		rgb = editorIpContrast(rgb, material.editorIpParams.y);
	}

	if (material.editorIpMode.w > 0.5) {
		let luma = clamp(dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
		let curveMix = clamp(vec2<f32>(luma * 3.0 - 1.5, luma * -3.0 + 1.5), vec2<f32>(0.0), vec2<f32>(1.0));
		let colorCurve = material.editorIpCurveNeutral + curveMix.x * material.editorIpCurvePositive - curveMix.y * material.editorIpCurveNegative;
		rgb *= colorCurve.rgb;
		rgb = mix(vec3<f32>(luma), rgb, colorCurve.a);
	}

	if (material.editorIpParams.w > 0.0) {
		let rand = editorIpGetRand(fragCoord * material.editorIpScreen.xy);
		let dither = mix(-material.editorIpParams.w, material.editorIpParams.w, rand);
		rgb = saturate(rgb + vec3<f32>(dither));
	}

	return rgb;
}`;

/**
 * Code of the PBR materials: the linear color of the material (captured before the fog and the image processing of
 * Babylon Lite) is processed as Babylon.js processes it.
 */
const pbrBeforeFragColorWGSL = /* wgsl */ `
{
	// Geometry renderer tasks of the tools (rendering the geometry textures of the post-processes, their contrast is set to
	// -1): Babylon Lite writes the geometry where the alpha of the base color is greater than 0.4, Babylon.js where the
	// alpha of the material is ("writeGeometryInfo" of the pre-pass renderer). The color is not used by these tasks.
	if (scene.vImageInfos.y < -0.5) {
		alpha = alpha * material.materialAlpha;
	}

	let editorIpLiteToneMapping = select(0.0, material.editorIpScreen.w, scene.vImageInfos.w > 0.5);

	// Some features of Babylon Lite change the color after its capture (unlit, sheen, sub-surface, refraction): the linear
	// color is then computed by inverting the image processing of Babylon Lite, which can't recover the values greater
	// than 1 nor the dark tones the tone mapping crushes.
	var editorIpLinear = editorIpApplyFog(editorIpLinearColor, input.worldPos);
	if (any(abs(editorIpApplyScene(editorIpLinear, scene.vImageInfos.x, scene.vImageInfos.y, editorIpLiteToneMapping) - color) > vec3<f32>(0.001))) {
		editorIpLinear = editorIpInverseScene(color, scene.vImageInfos.x, scene.vImageInfos.y, editorIpLiteToneMapping);
	}

	let editorIpFragCoord = vec2<f32>(input.clipPos.x, material.editorIpScreen.z - input.clipPos.y);

	if (material.editorIpMode.x < 0.5) {
		// Same as Babylon.js with "IMAGEPROCESSINGPOSTPROCESS": the linear color is sanitized.
		color = clamp(editorIpLinear, vec3<f32>(0.0), vec3<f32>(30.0));
	} else if (material.editorIpMode.x < 1.5) {
		color = editorIpApplyImageProcessing(editorIpLinear, editorIpFragCoord);
	} else {
		color = saturate(pow(max(editorIpLinear, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2)));
	}
}
`;

/**
 * Code of the standard materials: the color of the material is in gamma space.
 */
const standardBeforeFragColorWGSL = /* wgsl */ `
{
	let editorIpFragCoord = vec2<f32>(input.clipPos.x, material.editorIpScreen.z - input.clipPos.y);

	if (material.editorIpMode.x < 0.5) {
		color = vec4<f32>(pow(color.rgb, vec3<f32>(2.2)), color.a);
	} else if (material.editorIpMode.x < 1.5 && material.editorIpMode.y > 0.5) {
		color = vec4<f32>(editorIpApplyImageProcessing(pow(color.rgb, vec3<f32>(2.2)), editorIpFragCoord), color.a);
	}
}
`;

/**
 * Creates the plugin applying the image processing of Babylon.js to the given material:
 * - when the image processing is applied by a post-process (default rendering pipeline with its image processing
 *   enabled), the material outputs its linear color, processed by the post-process,
 * - otherwise, the material applies the image processing itself (or only converts its color to gamma space when the
 *   image processing is disabled).
 * The material uses the image processing configuration of the scene, or the configuration saved with the material
 * (`_imageProcessingConfiguration`, saved by some versions of the editor).
 * @param scene defines the reference to the scene the material belongs to.
 * @param material defines the reference to the material.
 * @param data defines the serialized image processing configuration of the material, if any.
 * @param type defines the type of the material.
 * @returns the plugin to attach to the material.
 */
export function _createMaterialImageProcessingPlugin(scene: SceneContext, material: Material, data: any, type: "pbr" | "standard" = "pbr"): MaterialPlugin {
	const state = getSceneState(scene);
	state.materials.add(material);

	const configuration = data && typeof data === "object" ? parseMaterialConfiguration(material, data) : null;
	const ownParameters = configuration ? getMaterialImageProcessing(configuration, true) : null;

	return {
		name: "EditorMaterialImageProcessing",
		// After the other plugins: the image processing is the last thing applied to the color of the material.
		priority: 1000,
		// Babylon Lite uploads the uniforms of the plugins of the standard materials once, unless dynamic (the PBR
		// materials upload them again when marked as dirty): the image processing changes at any time.
		dynamic: type === "standard",
		getUniforms: () => ({
			ubo: [
				{ name: "editorIpMode", type: "vec4<f32>" },
				{ name: "editorIpParams", type: "vec4<f32>" },
				{ name: "editorIpScreen", type: "vec4<f32>" },
				{ name: "editorIpVignette1", type: "vec4<f32>" },
				{ name: "editorIpVignette2", type: "vec4<f32>" },
				{ name: "editorIpCurveNeutral", type: "vec4<f32>" },
				{ name: "editorIpCurvePositive", type: "vec4<f32>" },
				{ name: "editorIpCurveNegative", type: "vec4<f32>" },
			],
		}),
		writeUbo: (uboData, offsets) => {
			const write = (name: string, values: number[]) => {
				const offset = offsets.get(name);
				if (offset !== undefined) {
					uboData.set(values, offset / 4);
				}
			};

			const parameters = ownParameters ?? state.parameters;
			const width = Math.max(1, state.width);
			const height = Math.max(1, state.height);

			write("editorIpMode", [parameters.mode, parameters.imageProcessing ? 1 : 0, parameters.vignette, parameters.curves ? 1 : 0]);
			write("editorIpParams", [parameters.exposure, parameters.contrast, parameters.toneMapping, parameters.ditherIntensity]);
			// (inverse screen size, height of the screen, tone mapping of the materials of Babylon Lite)
			write("editorIpScreen", [1 / width, 1 / height, height, _getMaterialsToneMapping(scene)]);

			// Same as Babylon.js "ImageProcessingConfiguration.bind".
			if (parameters.vignette) {
				const aspectRatio = width / height;

				let vignetteScaleY = Math.tan(parameters.vignetteCameraFov * 0.5);
				let vignetteScaleX = vignetteScaleY * aspectRatio;

				const vignetteScaleGeometricMean = Math.sqrt(vignetteScaleX * vignetteScaleY);
				vignetteScaleX = vignetteScaleX + (vignetteScaleGeometricMean - vignetteScaleX) * parameters.vignetteStretch;
				vignetteScaleY = vignetteScaleY + (vignetteScaleGeometricMean - vignetteScaleY) * parameters.vignetteStretch;

				write("editorIpVignette1", [vignetteScaleX, vignetteScaleY, -vignetteScaleX * parameters.vignetteCenterX, -vignetteScaleY * parameters.vignetteCenterY]);
				write("editorIpVignette2", [parameters.vignetteColor[0], parameters.vignetteColor[1], parameters.vignetteColor[2], -2 * parameters.vignetteWeight]);
			}

			if (parameters.curves) {
				write("editorIpCurveNeutral", parameters.curves.neutral);
				write("editorIpCurvePositive", parameters.curves.positive);
				write("editorIpCurveNegative", parameters.curves.negative);
			}
		},
		getCustomCode: (shaderType) => {
			if (shaderType !== "fragment") {
				return null;
			}

			if (type === "standard") {
				// Babylon Lite declares the uniforms of the plugins of the standard materials in their own buffer ("pluginUbo").
				const toStandard = (code: string) => code.replace(/\bmaterial\.editorIp/g, "pluginUbo.editorIp");

				return {
					CUSTOM_FRAGMENT_DEFINITIONS: toStandard(definitionsWGSL),
					CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: toStandard(standardBeforeFragColorWGSL),
				};
			}

			return {
				CUSTOM_FRAGMENT_DEFINITIONS: definitionsWGSL,
				// After the lighting (environment included), before the fog and the image processing. Babylon Lite injects
				// this code twice (with and without environment lighting), the last capture wins.
				CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION: "editorIpLinearColor = color;",
				CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: pbrBeforeFragColorWGSL,
			};
		},
	};
}
