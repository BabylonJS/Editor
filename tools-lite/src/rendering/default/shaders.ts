/*
 * WGSL shaders of the post-processes of the default rendering pipeline of Babylon.js (9.27), copied as is so the
 * passes of the tools compute the same values as Babylon.js (see `buildPostProcessShader`). Babylon.js is distributed
 * under the Apache License 2.0.
 */

/**
 * Babylon.js "imageProcessing.fragment" shader (WGSL).
 */
export const imageProcessingFragmentWGSL = `
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
#include<imageProcessingDeclaration>
#include<helperFunctions>
#include<imageProcessingFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
var result: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV);
result=vec4f(max(result.rgb,vec3f(0.)),result.a);
#ifdef IMAGEPROCESSING
#ifndef FROMLINEARSPACE
result=vec4f(toLinearSpaceVec3(result.rgb),result.a);
#endif
result=applyImageProcessing(result);
#else
#ifdef FROMLINEARSPACE
result=applyImageProcessing(result);
#endif
#endif
fragmentOutputs.color=result;
}
`;

/**
 * Babylon.js "pass.fragment" shader (WGSL).
 */
export const passFragmentWGSL = `
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);
}
`;

/**
 * Babylon.js "sharpen.fragment" shader (WGSL).
 */
export const sharpenFragmentWGSL = `
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
uniform screenSize: vec2f;
uniform sharpnessAmounts: vec2f;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
var onePixel: vec2f= vec2f(1.0,1.0)/uniforms.screenSize;
var color: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV);
var edgeDetection: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV+onePixel*vec2f(0,-1)) +
textureSample(textureSampler,textureSamplerSampler,input.vUV+onePixel*vec2f(-1,0)) +
textureSample(textureSampler,textureSamplerSampler,input.vUV+onePixel*vec2f(1,0)) +
textureSample(textureSampler,textureSamplerSampler,input.vUV+onePixel*vec2f(0,1)) -
color*4.0;
fragmentOutputs.color=max(vec4f(color.rgb*uniforms.sharpnessAmounts.y,color.a)-(uniforms.sharpnessAmounts.x* vec4f(edgeDetection.rgb,0)),vec4f(0.));
}
`;

/**
 * Babylon.js "grain.fragment" shader (WGSL).
 */
export const grainFragmentWGSL = `
#include<helperFunctions>
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
uniform intensity: f32;
uniform animatedSeed: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);
var seed: vec2f=input.vUV*uniforms.animatedSeed;
var grain: f32=dither(seed,uniforms.intensity);
var lum: f32=getLuminance(fragmentOutputs.color.rgb);
var grainAmount: f32=(cos(-PI+(lum*PI*2.))+1.)/2.;
fragmentOutputs.color=vec4f(fragmentOutputs.color.rgb+grain*grainAmount,fragmentOutputs.color.a);
fragmentOutputs.color=vec4f(max(fragmentOutputs.color.rgb,vec3f(0.0)),fragmentOutputs.color.a);
}
`;

/**
 * Babylon.js "chromaticAberration.fragment" shader (WGSL).
 */
export const chromaticAberrationFragmentWGSL = `
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
uniform chromatic_aberration: f32;
uniform radialIntensity: f32;
uniform direction: vec2f;
uniform centerPosition: vec2f;
uniform screen_width: f32;
uniform screen_height: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
var centered_screen_pos: vec2f= vec2f(input.vUV.x-uniforms.centerPosition.x,input.vUV.y-uniforms.centerPosition.y);
var directionOfEffect: vec2f=uniforms.direction;
if(directionOfEffect.x==0. && directionOfEffect.y==0.){
directionOfEffect=normalize(centered_screen_pos);
}
var radius2: f32=centered_screen_pos.x*centered_screen_pos.x
+ centered_screen_pos.y*centered_screen_pos.y;
var radius: f32=sqrt(radius2);
var ref_indices: vec3f= vec3f(-0.3,0.0,0.3);
var ref_shiftX: f32=uniforms.chromatic_aberration*pow(radius,uniforms.radialIntensity)*directionOfEffect.x/uniforms.screen_width;
var ref_shiftY: f32=uniforms.chromatic_aberration*pow(radius,uniforms.radialIntensity)*directionOfEffect.y/uniforms.screen_height;
var ref_coords_r: vec2f=vec2f(input.vUV.x+ref_indices.r*ref_shiftX,input.vUV.y+ref_indices.r*ref_shiftY*0.5);
var ref_coords_g: vec2f=vec2f(input.vUV.x+ref_indices.g*ref_shiftX,input.vUV.y+ref_indices.g*ref_shiftY*0.5);
var ref_coords_b: vec2f=vec2f(input.vUV.x+ref_indices.b*ref_shiftX,input.vUV.y+ref_indices.b*ref_shiftY*0.5);
var r=textureSample(textureSampler,textureSamplerSampler,ref_coords_r);
var g=textureSample(textureSampler,textureSamplerSampler,ref_coords_g);
var b=textureSample(textureSampler,textureSamplerSampler,ref_coords_b);
var a=clamp(r.a+g.a+b.a,0.,1.);
fragmentOutputs.color=vec4f(r.r,g.g,b.b,a);
}
`;

/**
 * Babylon.js "fxaa.vertex" shader (WGSL).
 */
export const fxaaVertexWGSL = `
attribute position: vec2f;
uniform texelSize: vec2f;
varying vUV: vec2f;
varying sampleCoordS: vec2f;
varying sampleCoordE: vec2f;
varying sampleCoordN: vec2f;
varying sampleCoordW: vec2f;
varying sampleCoordNW: vec2f;
varying sampleCoordSE: vec2f;
varying sampleCoordNE: vec2f;
varying sampleCoordSW: vec2f;
const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vUV=(vertexInputs.position*madd+madd);
vertexOutputs.sampleCoordS=vertexOutputs.vUV+ vec2f( 0.0,1.0)*uniforms.texelSize;
vertexOutputs.sampleCoordE=vertexOutputs.vUV+ vec2f( 1.0,0.0)*uniforms.texelSize;
vertexOutputs.sampleCoordN=vertexOutputs.vUV+ vec2f( 0.0,-1.0)*uniforms.texelSize;
vertexOutputs.sampleCoordW=vertexOutputs.vUV+ vec2f(-1.0,0.0)*uniforms.texelSize;
vertexOutputs.sampleCoordNW=vertexOutputs.vUV+ vec2f(-1.0,-1.0)*uniforms.texelSize;
vertexOutputs.sampleCoordSE=vertexOutputs.vUV+ vec2f( 1.0,1.0)*uniforms.texelSize;
vertexOutputs.sampleCoordNE=vertexOutputs.vUV+ vec2f( 1.0,-1.0)*uniforms.texelSize;
vertexOutputs.sampleCoordSW=vertexOutputs.vUV+ vec2f(-1.0,1.0)*uniforms.texelSize;
vertexOutputs.position=vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}
`;

/**
 * Babylon.js "fxaa.fragment" shader (WGSL).
 */
export const fxaaFragmentWGSL = `
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
uniform texelSize: vec2f;
varying sampleCoordS: vec2f;
varying sampleCoordE: vec2f;
varying sampleCoordN: vec2f;
varying sampleCoordW: vec2f;
varying sampleCoordNW: vec2f;
varying sampleCoordSE: vec2f;
varying sampleCoordNE: vec2f;
varying sampleCoordSW: vec2f;
const fxaaQualitySubpix: f32=1.0;
const fxaaQualityEdgeThreshold: f32=0.166;
const fxaaQualityEdgeThresholdMin: f32=0.0833;
const kLumaCoefficients: vec3f= vec3f(0.2126,0.7152,0.0722);
fn FxaaLuma(rgba: vec4f)->f32 {
return dot(rgba.rgb,kLumaCoefficients);
}
 
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
var posM: vec2f;
posM.x=input.vUV.x;
posM.y=input.vUV.y;
var rgbyM: vec4f=textureSampleLevel(textureSampler,textureSamplerSampler,input.vUV,0.0);
var lumaM: f32=FxaaLuma(rgbyM);
var lumaS: f32=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,input.sampleCoordS,0.0));
var lumaE: f32=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,input.sampleCoordE,0.0));
var lumaN: f32=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,input.sampleCoordN,0.0));
var lumaW: f32=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,input.sampleCoordW,0.0));
var maxSM: f32=max(lumaS,lumaM);
var minSM: f32=min(lumaS,lumaM);
var maxESM: f32=max(lumaE,maxSM);
var minESM: f32=min(lumaE,minSM);
var maxWN: f32=max(lumaN,lumaW);
var minWN: f32=min(lumaN,lumaW);
var rangeMax: f32=max(maxWN,maxESM);
var rangeMin: f32=min(minWN,minESM);
var rangeMaxScaled: f32=rangeMax*fxaaQualityEdgeThreshold;
var range: f32=rangeMax-rangeMin;
var rangeMaxClamped: f32=max(fxaaQualityEdgeThresholdMin,rangeMaxScaled);
#ifndef MALI
if(range<rangeMaxClamped) 
{
fragmentOutputs.color=rgbyM;
return fragmentOutputs;
}
#endif
var lumaNW: f32=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,input.sampleCoordNW,0.0));
var lumaSE: f32=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,input.sampleCoordSE,0.0));
var lumaNE: f32=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,input.sampleCoordNE,0.0));
var lumaSW: f32=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,input.sampleCoordSW,0.0));
var lumaNS: f32=lumaN+lumaS;
var lumaWE: f32=lumaW+lumaE;
var subpixRcpRange: f32=1.0/range;
var subpixNSWE: f32=lumaNS+lumaWE;
var edgeHorz1: f32=(-2.0*lumaM)+lumaNS;
var edgeVert1: f32=(-2.0*lumaM)+lumaWE;
var lumaNESE: f32=lumaNE+lumaSE;
var lumaNWNE: f32=lumaNW+lumaNE;
var edgeHorz2: f32=(-2.0*lumaE)+lumaNESE;
var edgeVert2: f32=(-2.0*lumaN)+lumaNWNE;
var lumaNWSW: f32=lumaNW+lumaSW;
var lumaSWSE: f32=lumaSW+lumaSE;
var edgeHorz4: f32=(abs(edgeHorz1)*2.0)+abs(edgeHorz2);
var edgeVert4: f32=(abs(edgeVert1)*2.0)+abs(edgeVert2);
var edgeHorz3: f32=(-2.0*lumaW)+lumaNWSW;
var edgeVert3: f32=(-2.0*lumaS)+lumaSWSE;
var edgeHorz: f32=abs(edgeHorz3)+edgeHorz4;
var edgeVert: f32=abs(edgeVert3)+edgeVert4;
var subpixNWSWNESE: f32=lumaNWSW+lumaNESE;
var lengthSign: f32=uniforms.texelSize.x;
var horzSpan: bool=edgeHorz>=edgeVert;
var subpixA: f32=subpixNSWE*2.0+subpixNWSWNESE;
if (!horzSpan)
{
lumaN=lumaW;
}
if (!horzSpan) 
{
lumaS=lumaE;
}
if (horzSpan) 
{
lengthSign=uniforms.texelSize.y;
}
var subpixB: f32=(subpixA*(1.0/12.0))-lumaM;
var gradientN: f32=lumaN-lumaM;
var gradientS: f32=lumaS-lumaM;
var lumaNN: f32=lumaN+lumaM;
var lumaSS: f32=lumaS+lumaM;
var pairN: bool=abs(gradientN)>=abs(gradientS);
var gradient: f32=max(abs(gradientN),abs(gradientS));
if (pairN)
{
lengthSign=-lengthSign;
}
var subpixC: f32=clamp(abs(subpixB)*subpixRcpRange,0.0,1.0);
var posB: vec2f;
posB.x=posM.x;
posB.y=posM.y;
var offNP: vec2f;
offNP.x=select(uniforms.texelSize.x,0.0,(!horzSpan));
offNP.y=select(uniforms.texelSize.y,0.0,(horzSpan));
if (!horzSpan) 
{
posB.x+=lengthSign*0.5;
}
if (horzSpan)
{
posB.y+=lengthSign*0.5;
}
var posN: vec2f;
posN.x=posB.x-offNP.x*1.5;
posN.y=posB.y-offNP.y*1.5;
var posP: vec2f;
posP.x=posB.x+offNP.x*1.5;
posP.y=posB.y+offNP.y*1.5;
var subpixD: f32=((-2.0)*subpixC)+3.0;
var lumaEndN: f32=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,posN,0.0));
var subpixE: f32=subpixC*subpixC;
var lumaEndP: f32=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,posP,0.0));
if (!pairN) 
{
lumaNN=lumaSS;
}
var gradientScaled: f32=gradient*1.0/4.0;
var lumaMM: f32=lumaM-lumaNN*0.5;
var subpixF: f32=subpixD*subpixE;
var lumaMLTZero: bool=lumaMM<0.0;
lumaEndN-=lumaNN*0.5;
lumaEndP-=lumaNN*0.5;
var doneN: bool=abs(lumaEndN)>=gradientScaled;
var doneP: bool=abs(lumaEndP)>=gradientScaled;
if (!doneN) 
{
posN.x-=offNP.x*3.0;
}
if (!doneN) 
{
posN.y-=offNP.y*3.0;
}
var doneNP: bool=(!doneN) || (!doneP);
if (!doneP) 
{
posP.x+=offNP.x*3.0;
}
if (!doneP)
{
posP.y+=offNP.y*3.0;
}
if (doneNP)
{
if (!doneN) {
lumaEndN=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,posN.xy,0.0));
}
if (!doneP) {
lumaEndP=FxaaLuma(textureSampleLevel(textureSampler,textureSamplerSampler,posP.xy,0.0));
}
if (!doneN) {
lumaEndN=lumaEndN-lumaNN*0.5;
}
if (!doneP) {
lumaEndP=lumaEndP-lumaNN*0.5;
}
doneN=abs(lumaEndN)>=gradientScaled;
doneP=abs(lumaEndP)>=gradientScaled;
if (!doneN) {
posN.x-=offNP.x*12.0;
}
if (!doneN) {
posN.y-=offNP.y*12.0;
}
doneNP=(!doneN) || (!doneP);
if (!doneP) {
posP.x+=offNP.x*12.0;
}
if (!doneP) {
posP.y+=offNP.y*12.0;
}
}
var dstN: f32=posM.x-posN.x;
var dstP: f32=posP.x-posM.x;
if (!horzSpan)
{
dstN=posM.y-posN.y;
}
if (!horzSpan) 
{
dstP=posP.y-posM.y;
}
var goodSpanN: bool=(lumaEndN<0.0) != lumaMLTZero;
var spanLength: f32=(dstP+dstN);
var goodSpanP: bool=(lumaEndP<0.0) != lumaMLTZero;
var spanLengthRcp: f32=1.0/spanLength;
var directionN: bool=dstN<dstP;
var dst: f32=min(dstN,dstP);
var goodSpan: bool=select(goodSpanP,goodSpanN,directionN);
var subpixG: f32=subpixF*subpixF;
var pixelOffset: f32=(dst*(-spanLengthRcp))+0.5;
var subpixH: f32=subpixG*fxaaQualitySubpix;
var pixelOffsetGood: f32=select(0.0,pixelOffset,goodSpan);
var pixelOffsetSubpix: f32=max(pixelOffsetGood,subpixH);
if (!horzSpan)
{
posM.x+=pixelOffsetSubpix*lengthSign;
}
if (horzSpan)
{
posM.y+=pixelOffsetSubpix*lengthSign;
}
#ifdef MALI
if(range<rangeMaxClamped) 
{
fragmentOutputs.color=rgbyM;
}
else
{
fragmentOutputs.color=textureSampleLevel(textureSampler,textureSamplerSampler,posM,0.0);
}
#else
fragmentOutputs.color=textureSampleLevel(textureSampler,textureSamplerSampler,posM,0.0);
#endif
}
`;

/**
 * Babylon.js "extractHighlights.fragment" shader (WGSL).
 */
export const extractHighlightsFragmentWGSL = `
#include<helperFunctions>
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
uniform threshold: f32;
uniform exposure: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);
var luma: f32=dot(LuminanceEncodeApprox,fragmentOutputs.color.rgb*uniforms.exposure);
fragmentOutputs.color=vec4f(step(uniforms.threshold,luma)*fragmentOutputs.color.rgb,fragmentOutputs.color.a);
}
`;

/**
 * Babylon.js "bloomMerge.fragment" shader (WGSL).
 */
export const bloomMergeFragmentWGSL = `
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
var bloomBlurSampler: sampler;
var bloomBlur: texture_2d<f32>;
uniform bloomWeight: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);
var blurred: vec3f=textureSample(bloomBlur,bloomBlurSampler,input.vUV).rgb;
fragmentOutputs.color=vec4f(fragmentOutputs.color.rgb+(blurred.rgb*uniforms.bloomWeight),fragmentOutputs.color.a);
}
`;

/**
 * Babylon.js "kernelBlur.vertex" shader (WGSL).
 */
export const kernelBlurVertexShaderWGSL = `
attribute position: vec2f;
uniform delta: vec2f;
varying sampleCenter: vec2f;
#include<kernelBlurVaryingDeclaration>[0..varyingCount]
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.sampleCenter=(vertexInputs.position*madd+madd);
#include<kernelBlurVertex>[0..varyingCount]
vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}
`;

/**
 * Babylon.js "kernelBlur.fragment" shader (WGSL).
 */
export const kernelBlurFragmentShaderWGSL = `
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
uniform delta: vec2f;
varying sampleCenter: vec2f;
#ifdef DOF
var circleOfConfusionSamplerSampler: sampler;
var circleOfConfusionSampler: texture_2d<f32>;
fn sampleCoC(offset: vec2f)->f32 {
var coc: f32=textureSample(circleOfConfusionSampler,circleOfConfusionSamplerSampler,offset).r;
return coc;
 }
#endif
#include<kernelBlurVaryingDeclaration>[0..varyingCount]
#ifdef PACKEDFLOAT
#include<packingFunctions>
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
var computedWeight: f32=0.0;
#ifdef PACKEDFLOAT
var blend: f32=0.;
#else
var blend: vec4f= vec4f(0.);
#endif
#ifdef DOF
var sumOfWeights: f32=CENTER_WEIGHT;
 
var factor: f32=0.0;
#ifdef PACKEDFLOAT
blend+=unpack(textureSample(textureSampler,textureSamplerSampler,input.sampleCenter))*CENTER_WEIGHT;
#else
blend+=textureSample(textureSampler,textureSamplerSampler,input.sampleCenter)*CENTER_WEIGHT;
#endif
#endif
#include<kernelBlurFragment>[0..varyingCount]
#include<kernelBlurFragment2>[0..depCount]
#ifdef PACKEDFLOAT
fragmentOutputs.color=pack(blend);
#else
fragmentOutputs.color=blend;
#endif
#ifdef DOF
fragmentOutputs.color/=sumOfWeights;
#endif
}
`;

/**
 * Babylon.js "circleOfConfusion.fragment" shader (WGSL).
 */
export const circleOfConfusionFragmentWGSL = `
varying vUV: vec2f;
var depthSamplerSampler: sampler;
var depthSampler: texture_2d<f32>;
#ifndef COC_DEPTH_NOT_NORMALIZED
uniform cameraMinMaxZ: vec2f;
#endif
uniform focusDistance: f32;
uniform cocPrecalculation: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
var depth: f32=textureSample(depthSampler,depthSamplerSampler,input.vUV).r;
#define CUSTOM_COC_DEPTH
#ifdef COC_DEPTH_NOT_NORMALIZED
let pixelDistance=depth*1000.0;
#else
let pixelDistance: f32=(uniforms.cameraMinMaxZ.x+uniforms.cameraMinMaxZ.y*depth)*1000.0;
 
#endif
#define CUSTOM_COC_PIXELDISTANCE
var coc: f32=abs(uniforms.cocPrecalculation*((uniforms.focusDistance-pixelDistance)/pixelDistance));
coc=clamp(coc,0.0,1.0);
fragmentOutputs.color= vec4f(coc,coc,coc,1.0);
}
`;

/**
 * Babylon.js "depthOfFieldMerge.fragment" shader (WGSL).
 */
export const depthOfFieldMergeFragmentWGSL = `
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
var circleOfConfusionSamplerSampler: sampler;
var circleOfConfusionSampler: texture_2d<f32>;
var blurStep0Sampler: sampler;
var blurStep0: texture_2d<f32>;
#if BLUR_LEVEL>0
var blurStep1Sampler: sampler;
var blurStep1: texture_2d<f32>;
#endif
#if BLUR_LEVEL>1
var blurStep2Sampler: sampler;
var blurStep2: texture_2d<f32>;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
var coc: f32=textureSampleLevel(circleOfConfusionSampler,circleOfConfusionSamplerSampler,input.vUV,0.0).r;
#if BLUR_LEVEL==0
var original: vec4f=textureSampleLevel(textureSampler,textureSamplerSampler,input.vUV,0.0);
var blurred0: vec4f=textureSampleLevel(blurStep0,blurStep0Sampler,input.vUV,0.0);
fragmentOutputs.color=mix(original,blurred0,coc);
#endif
#if BLUR_LEVEL==1
if(coc<0.5){
var original: vec4f=textureSampleLevel(textureSampler,textureSamplerSampler,input.vUV,0.0);
var blurred1: vec4f=textureSampleLevel(blurStep1,blurStep1Sampler,input.vUV,0.0);
fragmentOutputs.color=mix(original,blurred1,coc/0.5);
}
else{
var blurred0: vec4f=textureSampleLevel(blurStep0,blurStep0Sampler,input.vUV,0.0);
var blurred1: vec4f=textureSampleLevel(blurStep1,blurStep1Sampler,input.vUV,0.0);
fragmentOutputs.color=mix(blurred1,blurred0,(coc-0.5)/0.5);
}
#endif
#if BLUR_LEVEL==2
if(coc<0.33){
var original: vec4f=textureSampleLevel(textureSampler,textureSamplerSampler,input.vUV,0.0);
var blurred2: vec4f=textureSampleLevel(blurStep2,blurStep2Sampler,input.vUV,0.0);
fragmentOutputs.color=mix(original,blurred2,coc/0.33);
}
else if(coc<0.66){
var blurred1: vec4f=textureSampleLevel(blurStep1,blurStep1Sampler,input.vUV,0.0);
var blurred2: vec4f=textureSampleLevel(blurStep2,blurStep2Sampler,input.vUV,0.0);
fragmentOutputs.color=mix(blurred2,blurred1,(coc-0.33)/0.33);
}
else{
var blurred0: vec4f=textureSampleLevel(blurStep0,blurStep0Sampler,input.vUV,0.0);
var blurred1: vec4f=textureSampleLevel(blurStep1,blurStep1Sampler,input.vUV,0.0);
fragmentOutputs.color=mix(blurred1,blurred0,(coc-0.66)/0.34);
}
#endif
}
`;

/**
 * Babylon.js "glowMapMerge" shader (WGSL).
 */
export const glowMapMergeFragmentWGSL = `
varying vUV: vec2f;
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
#ifdef EMISSIVE
var textureSampler2Sampler: sampler;
var textureSampler2: texture_2d<f32>;
#endif
uniform offset: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
var baseColor: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV);
#ifdef EMISSIVE
baseColor+=textureSample(textureSampler2,textureSampler2Sampler,input.vUV);
baseColor*=uniforms.offset;
#else
baseColor=vec4f(baseColor.rgb,abs(uniforms.offset-baseColor.a));
#ifdef STROKE
var alpha: f32=smoothstep(.0,.1,baseColor.a);
baseColor=vec4f(baseColor.rgb*alpha,alpha);
#endif
#endif
#if LDR
baseColor=clamp(baseColor,vec4f(0.),vec4f(1.0));
#endif
fragmentOutputs.color=baseColor;
#define CUSTOM_FRAGMENT_MAIN_END
}
`;
