import { enableMaterialPlugins, markMaterialUboDirty, Material, MaterialPlugin, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../../tools/warn";
import { getSceneData } from "../../tools/scene";

import { imageProcessingFunctionsWGSL } from "../../rendering/shaders";
import { _computeColorCurves, _getMaterialsToneMapping, _getRenderingSettings, IColorCurves } from "../../rendering/pipeline";

/**
 * Defines the state of the image processing of a scene, read by the image processing plugins of its materials.
 */
interface ISceneImageProcessingState {
	/**
	 * Defines the tone mapping the materials of Babylon Lite apply: 0 none, 1 standard, 2 ACES and 3 Khronos PBR neutral
	 * (the values of the "TONEMAPPING" define of Babylon.js).
	 */
	toneMapping: number;
	/**
	 * Defines wether or not the image processing of the default rendering pipeline is enabled: Babylon.js applies it
	 * using a post-process, after the materials.
	 */
	postProcess: boolean;
	width: number;
	height: number;
	materials: Set<Material>;
}

const scenesStates = new WeakMap<SceneContext, ISceneImageProcessingState>();

/**
 * Returns the value of the "TONEMAPPING" define of Babylon.js for the given tone mapping type.
 */
function getToneMappingDefine(enabled: boolean, type: number): number {
	if (!enabled) {
		return 0;
	}

	switch (type) {
		case 1:
			return 2;
		case 2:
			return 3;
		default:
			return 1;
	}
}

function getSceneState(scene: SceneContext): ISceneImageProcessingState {
	let state = scenesStates.get(scene);
	if (!state) {
		state = { toneMapping: -1, postProcess: false, width: 0, height: 0, materials: new Set() };
		scenesStates.set(scene, state);

		// Same state for every material: the uniforms of the materials are updated only when it changes.
		getSceneData(scene).onBeforeRenderObservable.add(() => updateSceneState(scene, state!));
		updateSceneState(scene, state);

		enableMaterialPlugins(scene);
	}

	return state;
}

function updateSceneState(scene: SceneContext, state: ISceneImageProcessingState): void {
	const toneMapping = _getMaterialsToneMapping(scene);
	const postProcess = _getRenderingSettings(scene).imageProcessingEnabled;
	const width = scene.surface.engine.canvas?.width ?? 1;
	const height = scene.surface.engine.canvas?.height ?? 1;

	if (state.toneMapping === toneMapping && state.postProcess === postProcess && state.width === width && state.height === height) {
		return;
	}

	state.toneMapping = toneMapping;
	state.postProcess = postProcess;
	state.width = width;
	state.height = height;

	state.materials.forEach((material) => markMaterialUboDirty(material));
}

/**
 * Helpers of the image processing plugin: the linear color captured before the image processing of Babylon Lite, the
 * fog, and the image processing of Babylon.js with its inverse.
 */
const definitionsWGSL = /* wgsl */ `
// Linear color of the material, captured before the fog and the image processing of Babylon Lite.
var<private> editorIpLinearColor: vec3<f32>;

// Same fog as the PBR materials of Babylon Lite, applied to the linear color.
fn editorIpApplyFog(color: vec3<f32>, worldPosition: vec3<f32>) -> vec3<f32> {
	let fogMode = scene.vFogInfos.x;
	if (fogMode <= 0.0) {
		return color;
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
	return mix(pow(scene.vFogColor.rgb, vec3<f32>(2.2)), color, fogFactor);
}

${imageProcessingFunctionsWGSL}`;

/**
 * Returns the color of the given serialized color curves of Babylon.js (`ColorCurves` serialized with the image
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
 * Creates the plugin reproducing the image processing of a Babylon.js PBR material that has its own image processing
 * configuration (`_imageProcessingConfiguration`, saved by some versions of the editor), when its result differs from
 * the image processing the PBR materials of Babylon Lite apply with the values of the scene:
 * - when the configuration doesn't apply the image processing by a post-process, Babylon.js applies it in the material
 *   with the values of the configuration, and the default rendering pipeline applies it a second time on top,
 * - when it does, the material outputs linear colors, which no post-process converts when the camera has no default
 *   rendering pipeline with its image processing enabled.
 * The plugin captures the linear color of the material before the image processing of Babylon Lite and applies the one
 * of Babylon.js instead.
 * @param scene defines the reference to the scene the material belongs to.
 * @param material defines the reference to the material.
 * @param data defines the serialized image processing configuration of the material, if any.
 * @returns the plugin to attach to the material, or null when the material uses the image processing of the scene.
 */
export function _createMaterialImageProcessingPlugin(scene: SceneContext, material: Material, data: any): MaterialPlugin | null {
	if (!data || typeof data !== "object") {
		return null;
	}

	const enabled = data._isEnabled ?? data.isEnabled ?? true;
	const applyByPostProcess = data._applyByPostProcess ?? data.applyByPostProcess ?? false;

	// 0: linear output (image processing by a post-process), 1: image processing of the material, 2: image processing disabled.
	const mode = !enabled ? 2 : applyByPostProcess ? 0 : 1;

	const exposure = data._exposure ?? data.exposure ?? 1;
	const contrast = data._contrast ?? data.contrast ?? 1;
	const toneMapping = getToneMappingDefine(data._toneMappingEnabled ?? data.toneMappingEnabled ?? false, data._toneMappingType ?? data.toneMappingType ?? 0);

	const vignetteEnabled = mode === 1 && (data._vignetteEnabled ?? data.vignetteEnabled ?? false);
	const curvesEnabled = mode === 1 && (data._colorCurvesEnabled ?? data.colorCurvesEnabled ?? false) && !!data.colorCurves;
	const curves = curvesEnabled ? _computeColorCurves(getColorCurves(data.colorCurves)) : null;

	if (mode === 1) {
		const unsupported = [
			(data._ditheringEnabled ?? false) && "dithering",
			(data._colorGradingEnabled ?? false) && "color grading",
			(data._whiteBalanceEnabled ?? false) && "white balance",
		].filter(Boolean);

		if (unsupported.length) {
			warnOnce(
				`material-image-processing-${material.name}`,
				`the ${unsupported.join(", ")} of the image processing configuration of the material "${material.name}" is not supported (only the exposure, contrast, tone mapping, vignette and color curves are).`
			);
		}
	}

	const state = getSceneState(scene);
	state.materials.add(material);

	const vignetteCameraFov = data.vignetteCameraFov ?? 0.5;
	const vignetteStretch = data.vignetteStretch ?? 0;
	const vignetteCenterX = data.vignetteCenterX ?? 0;
	const vignetteCenterY = data.vignetteCenterY ?? 0;
	const vignetteWeight = data.vignetteWeight ?? 1.5;
	const vignetteColor = data.vignetteColor ?? [0, 0, 0, 0];
	const vignetteBlendMode = data._vignetteBlendMode ?? data.vignetteBlendMode ?? 0;

	return {
		name: "EditorMaterialImageProcessing",
		// After the other plugins: the image processing is the last thing applied to the color of the material.
		priority: 1000,
		getUniforms: () => ({
			ubo: [
				{ name: "editorIpScene", type: "vec4<f32>" },
				{ name: "editorIpMaterial", type: "vec4<f32>" },
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

			// (tone mapping of the materials of Babylon Lite, image processing by a post-process, vignette mode, color curves)
			write("editorIpScene", [state.toneMapping, state.postProcess ? 1 : 0, vignetteEnabled ? (vignetteBlendMode === 1 ? 2 : 1) : 0, curvesEnabled ? 1 : 0]);
			write("editorIpMaterial", [mode, exposure, contrast, toneMapping]);
			write("editorIpScreen", [1 / Math.max(1, state.width), 1 / Math.max(1, state.height), 0, 0]);

			// Same as Babylon.js "ImageProcessingConfiguration.bind".
			if (vignetteEnabled) {
				const aspectRatio = state.width / Math.max(1, state.height);

				let vignetteScaleY = Math.tan(vignetteCameraFov * 0.5);
				let vignetteScaleX = vignetteScaleY * aspectRatio;

				const vignetteScaleGeometricMean = Math.sqrt(vignetteScaleX * vignetteScaleY);
				vignetteScaleX = vignetteScaleX + (vignetteScaleGeometricMean - vignetteScaleX) * vignetteStretch;
				vignetteScaleY = vignetteScaleY + (vignetteScaleGeometricMean - vignetteScaleY) * vignetteStretch;

				write("editorIpVignette1", [vignetteScaleX, vignetteScaleY, -vignetteScaleX * vignetteCenterX, -vignetteScaleY * vignetteCenterY]);
				write("editorIpVignette2", [vignetteColor[0] ?? 0, vignetteColor[1] ?? 0, vignetteColor[2] ?? 0, -2 * vignetteWeight]);
			}

			if (curves) {
				write("editorIpCurveNeutral", curves.neutral);
				write("editorIpCurvePositive", curves.positive);
				write("editorIpCurveNegative", curves.negative);
			}
		},
		getCustomCode: (shaderType) => {
			if (shaderType !== "fragment") {
				return null;
			}

			return {
				CUSTOM_FRAGMENT_DEFINITIONS: definitionsWGSL,
				// After the lighting (environment included), before the fog and the image processing. Babylon Lite injects
				// this code twice (with and without environment lighting), the last capture wins.
				CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION: "editorIpLinearColor = color;",
				CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: /* wgsl */ `
// Nothing to change when Babylon.js outputs linear colors processed by the default rendering pipeline, as Babylon Lite
// does, or when Babylon Lite renders linear colors (refraction).
if (scene.vImageInfos.w >= 0.0 && (material.editorIpMaterial.x > 0.5 || material.editorIpScene.y < 0.5)) {
	let editorIpLiteToneMapping = select(0.0, material.editorIpScene.x, scene.vImageInfos.w > 0.5);

	// Some features of Babylon Lite change the color after its capture (unlit, sheen, sub-surface, refraction): the linear
	// color is then computed by inverting the image processing of Babylon Lite, which can't recover the dark tones the
	// tone mapping crushes.
	var editorIpLinear = editorIpApplyFog(editorIpLinearColor, input.worldPos);
	if (any(abs(editorIpApplyScene(editorIpLinear, scene.vImageInfos.x, scene.vImageInfos.y, editorIpLiteToneMapping) - color) > vec3<f32>(0.001))) {
		editorIpLinear = editorIpInverseScene(color, scene.vImageInfos.x, scene.vImageInfos.y, editorIpLiteToneMapping);
	}

	var editorIpColor = clamp(editorIpLinear, vec3<f32>(0.0), vec3<f32>(30.0));

	if (material.editorIpMaterial.x > 1.5) {
		editorIpColor = saturate(pow(max(editorIpLinear, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2)));
	} else if (material.editorIpMaterial.x > 0.5) {
		editorIpColor = editorIpLinear * material.editorIpMaterial.y;

		if (material.editorIpScene.z > 0.5) {
			// Same as the WGSL shaders of Babylon.js: the origin is the top-left corner of the screen.
			let viewportXY = input.clipPos.xy * material.editorIpScreen.xy * 2.0 - 1.0;
			let vignetteXY1 = vec3<f32>(viewportXY * material.editorIpVignette1.xy + material.editorIpVignette1.zw, 1.0);
			let vignette = pow(dot(vignetteXY1, vignetteXY1), material.editorIpVignette2.w);
			if (material.editorIpScene.z < 1.5) {
				editorIpColor *= mix(material.editorIpVignette2.rgb, vec3<f32>(1.0), vignette);
			} else {
				editorIpColor = mix(material.editorIpVignette2.rgb, editorIpColor, vignette);
			}
		}

		editorIpColor = editorIpToneMap(editorIpColor, material.editorIpMaterial.w);
		editorIpColor = saturate(pow(max(editorIpColor, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2)));
		editorIpColor = editorIpContrast(editorIpColor, material.editorIpMaterial.z);

		if (material.editorIpScene.w > 0.5) {
			let luma = clamp(dot(editorIpColor, vec3<f32>(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
			let curveMix = clamp(vec2<f32>(luma * 3.0 - 1.5, luma * -3.0 + 1.5), vec2<f32>(0.0), vec2<f32>(1.0));
			let colorCurve = material.editorIpCurveNeutral + curveMix.x * material.editorIpCurvePositive - curveMix.y * material.editorIpCurveNegative;
			editorIpColor = mix(vec3<f32>(luma), editorIpColor * colorCurve.rgb, colorCurve.a);
		}
	}

	if (material.editorIpScene.y > 0.5) {
		// The default rendering pipeline applies the image processing of the scene on top.
		color = editorIpApplyScene(editorIpColor, scene.vImageInfos.x, scene.vImageInfos.y, editorIpLiteToneMapping);
	} else {
		color = clamp(editorIpColor, vec3<f32>(0.0), vec3<f32>(1.0));
	}
}
`,
			};
		},
	};
}
