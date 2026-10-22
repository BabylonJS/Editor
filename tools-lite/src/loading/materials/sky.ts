import { createShaderMaterial, SceneContext, setShaderUniform, ShaderMaterial } from "@babylonjs/lite";

import { getSceneData } from "../../tools/scene";

import { isEditorSceneContext } from "../../rendering/pipeline";
import { getSceneImageProcessingConfiguration } from "../../rendering/default/image-processing";

/**
 * Vertex shader of the sky material, port of the Babylon.js "sky.vertex" shader.
 */
const skyVertexWGSL = `
struct SkyVertexOutput {
	@builtin(position) position: vec4<f32>,
	@location(0) positionW: vec3<f32>,
};

@vertex
fn mainVertex(input: VertexInput) -> SkyVertexOutput {
	var output: SkyVertexOutput;

	let worldPos = shaderSystem.world * vec4<f32>(input.position, 1.0);
	output.position = shaderSystem.viewProjection * worldPos;
	output.positionW = worldPos.xyz;

	return output;
}
`;

/**
 * Fragment shader of the sky material, port of the Babylon.js "sky.fragment" shader (Preetham sky model). As in
 * Babylon.js, the color of the sky is converted to linear space when the image processing is applied by the default
 * rendering pipeline.
 */
const skyFragmentWGSL = `
struct SkyVertexOutput {
	@builtin(position) position: vec4<f32>,
	@location(0) positionW: vec3<f32>,
};

const skyPi: f32 = 3.141592653589793238462643383279502884197169;
const skyLambda: vec3<f32> = vec3<f32>(680e-9, 550e-9, 450e-9);
const skyK: vec3<f32> = vec3<f32>(0.686, 0.678, 0.666);
const skyV: f32 = 4.0;

const rayleighZenithLength: f32 = 8.4e3;
const mieZenithLength: f32 = 1.25e3;

const skyEE: f32 = 1000.0;
const sunAngularDiameterCos: f32 = 0.999956676946448443553574619906976478926848692873900859324;

const cutoffAngle: f32 = skyPi / 1.95;
const steepness: f32 = 1.5;

const CLOUD_TAU_MAX: f32 = 15.0;
const CLOUD_G: f32 = 0.5;
const CLOUD_G_BACK: f32 = -0.5;
const CLOUD_BACK_WEIGHT: f32 = 0.2;

const tonemapA: f32 = 0.15;
const tonemapB: f32 = 0.50;
const tonemapC: f32 = 0.10;
const tonemapD: f32 = 0.20;
const tonemapE: f32 = 0.02;
const tonemapF: f32 = 0.30;
const tonemapW: f32 = 1000.0;

fn simplifiedRayleigh() -> vec3<f32> {
	return 0.0005 / vec3<f32>(94.0, 40.0, 18.0);
}

fn rayleighPhase(cosTheta: f32) -> f32 {
	return (3.0 / (16.0 * skyPi)) * (1.0 + cosTheta * cosTheta);
}

fn totalMie(lambda: vec3<f32>, K: vec3<f32>, T: f32) -> vec3<f32> {
	let c = (0.2 * T) * 10e-18;
	return 0.434 * c * skyPi * pow((2.0 * skyPi) / lambda, vec3<f32>(skyV - 2.0)) * K;
}

fn hgPhase(cosTheta: f32, g: f32) -> f32 {
	return (1.0 / (4.0 * skyPi)) * ((1.0 - g * g) / pow(1.0 - 2.0 * g * cosTheta + g * g, 1.5));
}

fn cloudPhase(cosTheta: f32, gForward: f32) -> f32 {
	return mix(hgPhase(cosTheta, gForward), hgPhase(cosTheta, CLOUD_G_BACK), CLOUD_BACK_WEIGHT);
}

fn sunIntensity(zenithAngleCos: f32) -> f32 {
	return skyEE * max(0.0, 1.0 - exp((-(cutoffAngle - acos(clamp(zenithAngleCos, -1.0, 1.0))) / steepness)));
}

fn uncharted2Tonemap(x: vec3<f32>) -> vec3<f32> {
	return ((x * (tonemapA * x + tonemapC * tonemapB) + tonemapD * tonemapE) / (x * (tonemapA * x + tonemapB) + tonemapD * tonemapF)) - tonemapE / tonemapF;
}

@fragment
fn mainFragment(input: SkyVertexOutput) -> @location(0) vec4<f32> {
	let cameraPosition = scene.vEyePosition.xyz;
	let sunPosition = shaderUniforms.sunPosition;
	let up = shaderUniforms.up;
	let luminance = shaderUniforms.luminance;
	let mieDirectionalG = shaderUniforms.mieDirectionalG;

	let sunfade = 1.0 - clamp(1.0 - exp((sunPosition.y / 450000.0)), 0.0, 1.0);
	let rayleighCoefficient = shaderUniforms.rayleigh - (1.0 * (1.0 - sunfade));
	let sunDirection = normalize(sunPosition);
	let sunE = sunIntensity(dot(sunDirection, up));
	let betaR = simplifiedRayleigh() * rayleighCoefficient;
	let betaM = totalMie(skyLambda, skyK, shaderUniforms.turbidity) * shaderUniforms.mieCoefficient;
	let zenithAngle = acos(max(0.0, dot(up, normalize(input.positionW - cameraPosition + shaderUniforms.cameraOffset))));
	let zenithFactor = cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / skyPi), -1.253);
	let sR = rayleighZenithLength / zenithFactor;
	let sM = mieZenithLength / zenithFactor;
	let Fex = exp(-(betaR * sR + betaM * sM));
	let cosTheta = dot(normalize(input.positionW - cameraPosition), sunDirection);
	let rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
	let betaRTheta = betaR * rPhase;
	let mPhase = hgPhase(cosTheta, mieDirectionalG);
	let betaMTheta = betaM * mPhase;

	var Lin = pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * (1.0 - Fex), vec3<f32>(1.5));
	Lin *= mix(vec3<f32>(1.0), pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * Fex, vec3<f32>(1.0 / 2.0)), clamp(pow(1.0 - dot(up, sunDirection), 5.0), 0.0, 1.0));

	var L0 = vec3<f32>(0.1) * Fex;

	var sundiskTerm: f32;
	let cloudiness = shaderUniforms.cloudiness;
	if (cloudiness > 0.0) {
		let cloudTau = cloudiness * CLOUD_TAU_MAX;
		let cloudT = exp(-cloudTau);
		let cloudG = CLOUD_G * cloudT;
		let omegaSun = 2.0 * skyPi * (1.0 - sunAngularDiameterCos);
		let sharpDisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
		sundiskTerm = cloudT * sharpDisk + (1.0 - cloudT) * omegaSun * cloudPhase(cosTheta, cloudG);
	} else {
		sundiskTerm = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
	}

	L0 += (sunE * 19000.0 * Fex) * sundiskTerm;

	var texColor = (Lin + L0);
	texColor *= 0.04;
	texColor += vec3<f32>(0.0, 0.001, 0.0025) * 0.3;

	let whiteScale = 1.0 / uncharted2Tonemap(vec3<f32>(tonemapW));
	let curr = uncharted2Tonemap((log2(2.0 / pow(luminance, 4.0))) * texColor);
	var retColor = clamp(curr * whiteScale, vec3<f32>(0.0), vec3<f32>(1.0));

	// Same as the Babylon.js "imageProcessingCompatibility" include: the sky is converted to linear space when the image
	// processing is applied by a post-process. Otherwise, the sky material applies no image processing.
	if (shaderUniforms.linearOutput > 0.5) {
		retColor = pow(retColor, vec3<f32>(2.2));
	}

	return vec4<f32>(retColor, 1.0);
}
`;

/**
 * Defines the properties of a sky material, the same as the Babylon.js `SkyMaterial`.
 */
export interface ISkyMaterialProperties {
	luminance: number;
	turbidity: number;
	rayleigh: number;
	mieCoefficient: number;
	mieDirectionalG: number;
	distance: number;
	inclination: number;
	azimuth: number;
	useSunPosition: boolean;
	sunPosition: { x: number; y: number; z: number };
	cameraOffset: { x: number; y: number; z: number };
	up: { x: number; y: number; z: number };
	cloudiness: number;
}

/**
 * Defines a sky material created from a Babylon.js `SkyMaterial`: a Babylon Lite shader material rendering the same
 * Preetham sky model, with the same properties as the Babylon.js `SkyMaterial`.
 */
export type SkyShaderMaterial = ShaderMaterial & ISkyMaterialProperties;

/**
 * Returns the direction of the sun of the given sky material, the same way Babylon.js `SkyMaterial` computes it.
 * @param properties defines the properties of the sky material.
 */
export function getSkySunPosition(properties: ISkyMaterialProperties): [number, number, number] {
	if (properties.useSunPosition) {
		return [properties.sunPosition.x, properties.sunPosition.y, properties.sunPosition.z];
	}

	const theta = Math.PI * (properties.inclination - 0.5);
	const phi = 2 * Math.PI * (properties.azimuth - 0.5);

	let x = properties.distance * Math.cos(phi);
	let y = properties.distance * Math.sin(phi) * Math.sin(theta);
	let z = properties.distance * Math.sin(phi) * Math.cos(theta);

	// Rotation from (0, 1, 0) to the up vector of the material.
	const upLength = Math.hypot(properties.up.x, properties.up.y, properties.up.z) || 1;
	const ux = properties.up.x / upLength;
	const uy = properties.up.y / upLength;
	const uz = properties.up.z / upLength;

	if (Math.abs(ux) > 1e-6 || Math.abs(uz) > 1e-6 || uy < 0) {
		// Quaternion from (0, 1, 0) to (ux, uy, uz).
		let qx = uz;
		let qy = 0;
		let qz = -ux;
		let qw = 1 + uy;

		// Same as Babylon.js "Quaternion.FromUnitVectorsToRef" for opposite vectors.
		if (qw < 1e-6) {
			qx = 0;
			qy = 0;
			qz = 1;
			qw = 0;
		}

		const length = Math.hypot(qx, qy, qz, qw);
		qx /= length;
		qy /= length;
		qz /= length;
		qw /= length;

		// Rotate (x, y, z) by the quaternion.
		const ix = qw * x + qy * z - qz * y;
		const iy = qw * y + qz * x - qx * z;
		const iz = qw * z + qx * y - qy * x;
		const iw = -qx * x - qy * y - qz * z;

		x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
		y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
		z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
	}

	return [x, y, z];
}

/**
 * Creates the Babylon Lite equivalent of the given serialized Babylon.js `SkyMaterial`: a shader material rendering
 * the same Preetham sky model. The properties of the Babylon.js `SkyMaterial` are available on the material and
 * applied each frame (ie. `material.inclination = 0.3`).
 * @param scene defines the reference to the scene where the material is used.
 * @param data defines the serialized sky material.
 */
export function parseSkyMaterial(scene: SceneContext, data: any): SkyShaderMaterial {
	const material = createShaderMaterial({
		name: data.name,
		vertexSource: skyVertexWGSL,
		fragmentSource: skyFragmentWGSL,
		attributes: ["position"],
		uniforms: [
			"world",
			"viewProjection",
			{ name: "sunPosition", type: "vec3<f32>" },
			{ name: "luminance", type: "f32", defaultValue: 1 },
			{ name: "up", type: "vec3<f32>", defaultValue: [0, 1, 0] },
			{ name: "turbidity", type: "f32", defaultValue: 10 },
			{ name: "cameraOffset", type: "vec3<f32>" },
			{ name: "rayleigh", type: "f32", defaultValue: 2 },
			{ name: "mieCoefficient", type: "f32", defaultValue: 0.005 },
			{ name: "mieDirectionalG", type: "f32", defaultValue: 0.8 },
			{ name: "cloudiness", type: "f32", defaultValue: 0 },
			{ name: "linearOutput", type: "f32", defaultValue: 0 },
		],
		// The faces of the sky boxes are seen from the inside.
		backFaceCulling: false,
	}) as SkyShaderMaterial;

	const toVector = (value: number[] | undefined, defaultValue: number[]) => ({
		x: value?.[0] ?? defaultValue[0],
		y: value?.[1] ?? defaultValue[1],
		z: value?.[2] ?? defaultValue[2],
	});

	const properties: ISkyMaterialProperties = {
		luminance: data.luminance ?? 1,
		turbidity: data.turbidity ?? 10,
		rayleigh: data.rayleigh ?? 2,
		mieCoefficient: data.mieCoefficient ?? 0.005,
		mieDirectionalG: data.mieDirectionalG ?? 0.8,
		distance: data.distance ?? 500,
		inclination: data.inclination ?? 0.49,
		azimuth: data.azimuth ?? 0.25,
		useSunPosition: data.useSunPosition ?? false,
		sunPosition: toVector(data.sunPosition, [0, 100, 0]),
		cameraOffset: toVector(data.cameraOffset, [0, 0, 0]),
		up: toVector(data.up, [0, 1, 0]),
		cloudiness: data.cloudiness ?? 0,
	};

	// Same properties as the Babylon.js SkyMaterial.
	Object.keys(properties).forEach((key) => {
		Object.defineProperty(material, key, {
			get: () => properties[key as keyof ISkyMaterialProperties],
			set: (value) => {
				(properties as any)[key] = value;
			},
			enumerable: true,
			configurable: true,
		});
	});

	material.metadata = data.metadata;

	const applied = new Map<string, string>();
	const setUniform = (name: string, value: number | number[]) => {
		const serialized = Array.isArray(value) ? value.join(",") : String(value);
		if (applied.get(name) !== serialized) {
			applied.set(name, serialized);
			setShaderUniform(material, name, value);
		}
	};

	const update = () => {
		setUniform("sunPosition", getSkySunPosition(properties));
		setUniform("luminance", properties.luminance);
		setUniform("turbidity", properties.turbidity);
		setUniform("rayleigh", properties.rayleigh);
		setUniform("mieCoefficient", properties.mieCoefficient);
		setUniform("mieDirectionalG", properties.mieDirectionalG);
		setUniform("cloudiness", properties.cloudiness);
		setUniform("up", [properties.up.x, properties.up.y, properties.up.z]);
		setUniform("cameraOffset", [properties.cameraOffset.x, properties.cameraOffset.y, properties.cameraOffset.z]);
		setUniform("linearOutput", isEditorSceneContext(scene) && getSceneImageProcessingConfiguration(scene).applyByPostProcess ? 1 : 0);
	};

	update();
	getSceneData(scene).onBeforeRenderObservable.add(() => update());

	return material;
}
