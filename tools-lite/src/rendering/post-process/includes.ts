import { registerPostProcessShaderInclude } from "./shader";

/*
 * WGSL includes of Babylon.js (9.27) shared by the post-processes ported from Babylon.js. They are copied as is so the
 * ported shaders compute the same values as Babylon.js. Babylon.js is distributed under the Apache License 2.0.
 */

/**
 * Babylon.js "helperFunctions" include (WGSL).
 */
export const helperFunctionsWGSL = `
const PI: f32=3.1415926535897932384626433832795;
const TWO_PI: f32=6.283185307179586;
const HALF_PI: f32=1.5707963267948966;
const RECIPROCAL_PI: f32=0.3183098861837907;
const RECIPROCAL_PI2: f32=0.15915494309189535;
const RECIPROCAL_PI4: f32=0.07957747154594767;
const HALF_MIN: f32=5.96046448e-08;
 
const LinearEncodePowerApprox: f32=2.2;
const GammaEncodePowerApprox: f32=1.0/LinearEncodePowerApprox;
const LuminanceEncodeApprox: vec3f=vec3f(0.2126,0.7152,0.0722);
const Epsilon:f32=0.0000001;
fn square(x: f32)->f32 {
return x*x;
}
fn saturate(x: f32)->f32 {
return clamp(x,0.0,1.0);
}
fn saturateVec3(x: vec3f)->vec3f {
return clamp(x,vec3f(),vec3f(1.0));
}
fn saturateEps(x: f32)->f32 {
return clamp(x,Epsilon,1.0);
}
fn maxEps(x: f32)->f32 {
return max(x,Epsilon);
}
fn maxEpsVec3(x: vec3f)->vec3f {
return max(x,vec3f(Epsilon));
}
fn absEps(x: f32)->f32 {
return abs(x)+Epsilon;
}
fn transposeMat3(inMatrix: mat3x3f)->mat3x3f {
let i0: vec3f=inMatrix[0];
let i1: vec3f=inMatrix[1];
let i2: vec3f=inMatrix[2];
let outMatrix:mat3x3f=mat3x3f(
vec3(i0.x,i1.x,i2.x),
vec3(i0.y,i1.y,i2.y),
vec3(i0.z,i1.z,i2.z)
);
return outMatrix;
}
fn inverseMat3(inMatrix: mat3x3f)->mat3x3f {
let a00: f32=inMatrix[0][0];
let a01: f32=inMatrix[0][1];
let a02: f32=inMatrix[0][2];
let a10: f32=inMatrix[1][0];
let a11: f32=inMatrix[1][1];
let a12: f32=inMatrix[1][2];
let a20: f32=inMatrix[2][0];
let a21: f32=inMatrix[2][1];
let a22: f32=inMatrix[2][2];
let b01: f32=a22*a11-a12*a21;
let b11: f32=-a22*a10+a12*a20;
let b21: f32=a21*a10-a11*a20;
let det: f32=a00*b01+a01*b11+a02*b21;
return mat3x3f(b01/det,(-a22*a01+a02*a21)/det,(a12*a01-a02*a11)/det,
b11/det,(a22*a00-a02*a20)/det,(-a12*a00+a02*a10)/det,
b21/det,(-a21*a00+a01*a20)/det,(a11*a00-a01*a10)/det);
}
#if USE_EXACT_SRGB_CONVERSIONS
fn toLinearSpaceExact(color: vec3f)->vec3f
{
let nearZeroSection: vec3f=0.0773993808*color;
let remainingSection: vec3f=pow(0.947867299*(color+vec3f(0.055)),vec3f(2.4));
return select(remainingSection,nearZeroSection,color<=vec3f(0.04045));
}
fn toGammaSpaceExact(color: vec3f)->vec3f
{
let nearZeroSection: vec3f=12.92*color;
let remainingSection: vec3f=1.055*pow(color,vec3f(0.41666))-vec3f(0.055);
return select(remainingSection,nearZeroSection,color<=vec3f(0.0031308));
}
#endif
fn toLinearSpace(color: f32)->f32
{
#if USE_EXACT_SRGB_CONVERSIONS
var nearZeroSection=0.0773993808*color;
var remainingSection=pow(0.947867299*(color+0.055),2.4);
return select(remainingSection,nearZeroSection,color<=0.04045);
#else
return pow(color,LinearEncodePowerApprox);
#endif
}
fn toLinearSpaceVec3(color: vec3f)->vec3f
{
#if USE_EXACT_SRGB_CONVERSIONS
return toLinearSpaceExact(color);
#else
return pow(color,vec3f(LinearEncodePowerApprox));
#endif
}
fn toLinearSpaceVec4(color: vec4<f32>)->vec4<f32>
{
#if USE_EXACT_SRGB_CONVERSIONS
return vec4f(toLinearSpaceExact(color.rgb),color.a);
#else
return vec4f(pow(color.rgb,vec3f(LinearEncodePowerApprox)),color.a);
#endif
}
fn toGammaSpace(color: vec4<f32>)->vec4<f32>
{
#if USE_EXACT_SRGB_CONVERSIONS
return vec4<f32>(toGammaSpaceExact(color.rgb),color.a);
#else
return vec4<f32>(pow(color.rgb,vec3f(GammaEncodePowerApprox)),color.a);
#endif
}
fn toGammaSpaceVec3(color: vec3f)->vec3f
{
#if USE_EXACT_SRGB_CONVERSIONS
return toGammaSpaceExact(color);
#else
return pow(color,vec3f(GammaEncodePowerApprox));
#endif
}
fn squareVec3(value: vec3f)->vec3f
{
return value*value;
}
fn pow5(value: f32)->f32 {
let sq: f32=value*value;
return sq*sq*value;
}
fn double_refract(I: vec3f,N: vec3f,eta: f32)->vec3f {
let Tfront: vec3f=refract(I,N,1.0/eta);
let Nback: vec3f=normalize(reflect(N,Tfront));
return refract(Tfront,-Nback,eta);
}
fn getLuminanceUnclamped(color: vec3f)->f32
{
return dot(color,LuminanceEncodeApprox);
}
fn getLuminance(color: vec3f)->f32
{
return saturate(getLuminanceUnclamped(color));
}
fn getRand(seed: vec2<f32>)->f32 {
return fract(sin(dot(seed.xy ,vec2<f32>(12.9898,78.233)))*43758.5453);
}
fn dither(seed: vec2<f32>,varianceAmount: f32)->f32 {
let rand: f32=getRand(seed);
let normVariance: f32=varianceAmount/255.0;
let dither: f32=mix(-normVariance,normVariance,rand);
return dither;
}
const rgbdMaxRange: f32=255.0;
fn toRGBD(color: vec3f)->vec4<f32> {
let maxRGB: f32=max(max(color.r,max(color.g,color.b)),Epsilon);
var D: f32 =max(rgbdMaxRange/maxRGB,1.);
D =clamp(floor(D)/255.0,0.,1.);
var rgb: vec3f =color.rgb*D;
rgb=toGammaSpaceVec3(rgb);
return vec4<f32>(saturateVec3(rgb),D);
}
fn fromRGBD(rgbd: vec4<f32>)->vec3f {
let rgb=toLinearSpaceVec3(rgbd.rgb);
return rgb/rgbd.a;
}
fn parallaxCorrectNormal(vertexPos: vec3f,origVec: vec3f,cubeSize: vec3f,cubePos: vec3f)->vec3f {
let invOrigVec: vec3f=vec3f(1.)/origVec;
let halfSize: vec3f=cubeSize*0.5;
let intersecAtMaxPlane: vec3f=(cubePos+halfSize-vertexPos)*invOrigVec;
let intersecAtMinPlane: vec3f=(cubePos-halfSize-vertexPos)*invOrigVec;
let largestIntersec: vec3f=max(intersecAtMaxPlane,intersecAtMinPlane);
let distance: f32=min(min(largestIntersec.x,largestIntersec.y),largestIntersec.z);
let intersectPositionWS: vec3f=vertexPos+origVec*distance;
return intersectPositionWS-cubePos;
}
fn equirectangularToCubemapDirection(uv : vec2f)->vec3f {
var longitude : f32=uv.x*TWO_PI-PI;
var latitude : f32=HALF_PI-uv.y*PI;
var direction : vec3f;
direction.x=cos(latitude)*sin(longitude);
direction.y=sin(latitude);
direction.z=cos(latitude)*cos(longitude);
return direction;
}
fn sqrtClamped(value: f32)->f32 {
return sqrt(max(value,0.));
}
fn avg(value: vec3f)->f32 {
return dot(value,vec3f(0.333333333));
}
fn singleScatterToMultiScatterAlbedo(rho_ss: vec3f)->vec3f {
let s: vec3f=sqrt(max(vec3f(1.0)-rho_ss,vec3f(0.0)));
return (vec3f(1.0)-s)*(vec3f(1.0)-vec3f(0.139)*s)/(vec3f(1.0)+vec3f(1.17)*s);
}
fn multiScatterToSingleScatterAlbedo(rho_ms: vec3f)->vec3f {
let s: vec3f=4.09712f+4.20863f*rho_ms-sqrt(9.59217f+41.6808f*rho_ms+17.7126f*rho_ms*rho_ms);
return 1.0f-s*s;
}
fn multiScatterToSingleScatterAlbedoWithAniso(rho_ms: vec3f,aniso: f32)->vec3f {
let s: vec3f=4.09712+4.20863f*rho_ms-sqrt(9.59217f+41.6808f*rho_ms+17.7126f*rho_ms*rho_ms);
return (vec3f(1.0f)-s*s)/maxEpsVec3(vec3f(1.0f)-vec3f(aniso)*s*s);
}
fn min3(v: vec3f)->f32 {
return min(v.x,min(v.y,v.z));
}
fn max3(v: vec3f)->f32 {
return max(v.x,max(v.y,v.z));
}
fn uint2float(i: u32)->f32 {
return bitcast<f32>(0x3F800000u | (i>>9u))-1.0;
}
fn plasticSequence(rstate: u32)->vec2f {
return vec2f(uint2float(rstate*3242174889u),
uint2float(rstate*2447445414u));
}
`;

/**
 * Babylon.js "imageProcessingDeclaration" include (WGSL).
 */
export const imageProcessingDeclarationWGSL = `
#ifdef EXPOSURE
uniform exposureLinear: f32;
#endif
#ifdef CONTRAST
uniform contrast: f32;
#endif
#ifdef WHITEBALANCE
uniform whiteBalanceMatrix: mat3x3f;
#endif
#if defined(VIGNETTE) || defined(DITHER)
uniform vInverseScreenSize: vec2f;
#endif
#ifdef VIGNETTE
uniform vignetteSettings1: vec4f;
uniform vignetteSettings2: vec4f;
#endif
#ifdef COLORCURVES
uniform vCameraColorCurveNegative: vec4f;
uniform vCameraColorCurveNeutral: vec4f;
uniform vCameraColorCurvePositive: vec4f;
#endif
#ifdef COLORGRADING
#ifdef COLORGRADING3D
var txColorTransformSampler: sampler;
var txColorTransform: texture_3d<f32>;
#else
var txColorTransformSampler: sampler;
var txColorTransform: texture_2d<f32>;
#endif
uniform colorTransformSettings: vec4f;
#endif
#ifdef DITHER
uniform ditherIntensity: f32;
#endif
`;

/**
 * Babylon.js "imageProcessingFunctions" include (WGSL).
 */
export const imageProcessingFunctionsWGSL = `
#if TONEMAPPING==3
const PBRNeutralStartCompression: f32=0.8-0.04;
const PBRNeutralDesaturation: f32=0.15;
fn PBRNeutralToneMapping( color: vec3f )->vec3f {
var x: f32=min(color.r,min(color.g,color.b));
var offset: f32=select(0.04,x-6.25*x*x,x<0.08);
var result=color;
result-=offset;
var peak: f32=max(result.r,max(result.g,result.b));
if (peak<PBRNeutralStartCompression) {
return result;
}
var d: f32=1.-PBRNeutralStartCompression;
var newPeak: f32=1.-d*d/(peak+d-PBRNeutralStartCompression);
result*=newPeak/peak;
var g: f32=1.-1./(PBRNeutralDesaturation*(peak-newPeak)+1.);
return mix(result,newPeak* vec3f(1,1,1),g);
}
#endif
#if TONEMAPPING==2
const ACESInputMat: mat3x3f= mat3x3f(
vec3f(0.59719,0.07600,0.02840),
vec3f(0.35458,0.90834,0.13383),
vec3f(0.04823,0.01566,0.83777)
);
const ACESOutputMat: mat3x3f= mat3x3f(
vec3f( 1.60475,-0.10208,-0.00327),
vec3f(-0.53108, 1.10813,-0.07276),
vec3f(-0.07367,-0.00605, 1.07602)
);
fn RRTAndODTFit(v: vec3f)->vec3f
{
var a: vec3f=v*(v+0.0245786)-0.000090537;
var b: vec3f=v*(0.983729*v+0.4329510)+0.238081;
return a/b;
}
fn ACESFitted(color: vec3f)->vec3f
{
var output=ACESInputMat*color;
output=RRTAndODTFit(output);
output=ACESOutputMat*output;
output=saturateVec3(output);
return output;
}
#endif
#define CUSTOM_IMAGEPROCESSINGFUNCTIONS_DEFINITIONS
fn applyImageProcessing(result: vec4f)->vec4f {
#define CUSTOM_IMAGEPROCESSINGFUNCTIONS_UPDATERESULT_ATSTART
var rgb=result.rgb;
;
#ifdef WHITEBALANCE
rgb=uniforms.whiteBalanceMatrix*rgb;
rgb=max(rgb,vec3f(0.0));
#endif
#ifdef EXPOSURE
rgb*=uniforms.exposureLinear;
#endif
#ifdef VIGNETTE
var viewportXY: vec2f=fragmentInputs.position.xy*uniforms.vInverseScreenSize;
viewportXY=viewportXY*2.0-1.0;
var vignetteXY1: vec3f= vec3f(viewportXY*uniforms.vignetteSettings1.xy+uniforms.vignetteSettings1.zw,1.0);
var vignetteTerm: f32=dot(vignetteXY1,vignetteXY1);
var vignette: f32=pow(vignetteTerm,uniforms.vignetteSettings2.w);
var vignetteColor: vec3f=uniforms.vignetteSettings2.rgb;
#ifdef VIGNETTEBLENDMODEMULTIPLY
var vignetteColorMultiplier: vec3f=mix(vignetteColor, vec3f(1,1,1),vignette);
rgb*=vignetteColorMultiplier;
#endif
#ifdef VIGNETTEBLENDMODEOPAQUE
rgb=mix(vignetteColor,rgb,vignette);
#endif
#endif
#if TONEMAPPING==3
rgb=PBRNeutralToneMapping(rgb);
#elif TONEMAPPING==2
rgb=ACESFitted(rgb);
#elif TONEMAPPING==1
const tonemappingCalibration: f32=1.590579;
rgb=1.0-exp2(-tonemappingCalibration*rgb);
#endif
rgb=toGammaSpaceVec3(rgb);
rgb=saturateVec3(rgb);
#ifdef CONTRAST
var resultHighContrast: vec3f=rgb*rgb*(3.0-2.0*rgb);
if (uniforms.contrast<1.0) {
rgb=mix( vec3f(0.5,0.5,0.5),rgb,uniforms.contrast);
}
 else {
rgb=mix(rgb,resultHighContrast,uniforms.contrast-1.0);
}
rgb=max(rgb,vec3f(0.));
#endif
#ifdef COLORGRADING
var colorTransformInput: vec3f=rgb*uniforms.colorTransformSettings.xxx+uniforms.colorTransformSettings.yyy;
#ifdef COLORGRADING3D
var colorTransformOutput: vec3f=textureSample(txColorTransform,txColorTransformSampler,colorTransformInput).rgb;
#else
var colorTransformOutput: vec3f=textureSample(txColorTransform,txColorTransformSampler,colorTransformInput,uniforms.colorTransformSettings.yz).rgb;
#endif
rgb=mix(rgb,colorTransformOutput,uniforms.colorTransformSettings.www);
#endif
#ifdef COLORCURVES
var luma: f32=getLuminance(rgb);
var curveMix: vec2f=clamp( vec2f(luma*3.0-1.5,luma*-3.0+1.5), vec2f(0.0), vec2f(1.0));
var colorCurve: vec4f=uniforms.vCameraColorCurveNeutral+curveMix.x*uniforms.vCameraColorCurvePositive-curveMix.y*uniforms.vCameraColorCurveNegative;
rgb*=colorCurve.rgb;
rgb=mix( vec3f(luma),rgb,colorCurve.a);
#endif
#ifdef DITHER
var rand: f32=getRand(fragmentInputs.position.xy*uniforms.vInverseScreenSize);
var dither: f32=mix(-uniforms.ditherIntensity,uniforms.ditherIntensity,rand);
rgb=saturateVec3(rgb+ vec3f(dither));
#endif
#define CUSTOM_IMAGEPROCESSINGFUNCTIONS_UPDATERESULT_ATEND
return vec4f(rgb,result.a);
}
`;

/**
 * Babylon.js "packingFunctions" include (WGSL).
 */
export const packingFunctionsWGSL = `
fn pack(depth: f32)->vec4f
{
const bit_shift: vec4f= vec4f(255.0*255.0*255.0,255.0*255.0,255.0,1.0);
const bit_mask: vec4f= vec4f(0.0,1.0/255.0,1.0/255.0,1.0/255.0);
var res: vec4f=fract(depth*bit_shift);
res-=res.xxyz*bit_mask;
return res;
}
fn unpack(color: vec4f)->f32
{
const bit_shift: vec4f= vec4f(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);
return dot(color,bit_shift);
}
`;

/**
 * Babylon.js "kernelBlurVaryingDeclaration" include (WGSL).
 */
export const kernelBlurVaryingDeclarationWGSL = `
varying sampleCoord{X}: vec2f;
`;

/**
 * Babylon.js "kernelBlurFragment" include (WGSL).
 */
export const kernelBlurFragmentWGSL = `
#ifdef DOF
factor=sampleCoC(fragmentInputs.sampleCoord{X});
 
computedWeight=KERNEL_WEIGHT{X}*factor;
sumOfWeights+=computedWeight;
#else
computedWeight=KERNEL_WEIGHT{X};
#endif
#ifdef PACKEDFLOAT
blend+=unpack(textureSample(textureSampler,textureSamplerSampler,fragmentInputs.sampleCoord{X}))*computedWeight;
#else
blend+=textureSample(textureSampler,textureSamplerSampler,fragmentInputs.sampleCoord{X})*computedWeight;
#endif
`;

/**
 * Babylon.js "kernelBlurFragment2" include (WGSL).
 */
export const kernelBlurFragment2WGSL = `
#ifdef DOF
factor=sampleCoC(fragmentInputs.sampleCenter+uniforms.delta*KERNEL_DEP_OFFSET{X});
computedWeight=KERNEL_DEP_WEIGHT{X}*factor;
sumOfWeights+=computedWeight;
#else
computedWeight=KERNEL_DEP_WEIGHT{X};
#endif
#ifdef PACKEDFLOAT
blend+=unpack(textureSample(textureSampler,textureSamplerSampler,fragmentInputs.sampleCenter+uniforms.delta*KERNEL_DEP_OFFSET{X}))*computedWeight;
#else
blend+=textureSample(textureSampler,textureSamplerSampler,fragmentInputs.sampleCenter+uniforms.delta*KERNEL_DEP_OFFSET{X})*computedWeight;
#endif
`;

/**
 * Babylon.js "kernelBlurVertex" include (WGSL).
 */
export const kernelBlurVertexWGSL = `
vertexOutputs.sampleCoord{X}=vertexOutputs.sampleCenter+uniforms.delta*KERNEL_OFFSET{X};
`;

registerPostProcessShaderInclude("helperFunctions", helperFunctionsWGSL);
registerPostProcessShaderInclude("imageProcessingDeclaration", imageProcessingDeclarationWGSL);
registerPostProcessShaderInclude("imageProcessingFunctions", imageProcessingFunctionsWGSL);
registerPostProcessShaderInclude("packingFunctions", packingFunctionsWGSL);
registerPostProcessShaderInclude("kernelBlurVaryingDeclaration", kernelBlurVaryingDeclarationWGSL);
registerPostProcessShaderInclude("kernelBlurFragment", kernelBlurFragmentWGSL);
registerPostProcessShaderInclude("kernelBlurFragment2", kernelBlurFragment2WGSL);
registerPostProcessShaderInclude("kernelBlurVertex", kernelBlurVertexWGSL);
