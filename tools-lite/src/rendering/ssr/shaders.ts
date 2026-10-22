import { registerPostProcessShaderInclude } from "../post-process/shader";

/*
 * WGSL shaders of the SSR rendering pipeline of Babylon.js (9.27), copied as is so the passes of the tools compute the
 * same values as Babylon.js (see `buildPostProcessShader`). Babylon.js is distributed under the Apache License 2.0.
 * The WGSL version of "computeAttenuationForIntersection" of Babylon.js calls "texelFetch" (GLSL) with an undefined
 * "hitPixel" variable, which doesn't compile ("attenuateBackfaceReflection"): it reads the normal as the GLSL version does.
 */

/**
 * Babylon.js "pbrBRDFFunctions" include (WGSL).
 */
export const pbrBRDFFunctionsWGSL = `
#define FRESNEL_MAXIMUM_ON_ROUGH 0.25
#define BRDF_DIFFUSE_MODEL_EON 0
#define BRDF_DIFFUSE_MODEL_BURLEY 1
#define BRDF_DIFFUSE_MODEL_LAMBERT 2
#define BRDF_DIFFUSE_MODEL_LEGACY 3
#define DIELECTRIC_SPECULAR_MODEL_GLTF 0
#define DIELECTRIC_SPECULAR_MODEL_OPENPBR 1
#define CONDUCTOR_SPECULAR_MODEL_GLTF 0
#define CONDUCTOR_SPECULAR_MODEL_OPENPBR 1
#if !defined(PBR_VERTEX_SHADER) && !defined(OPENPBR_VERTEX_SHADER)
#ifdef MS_BRDF_ENERGY_CONSERVATION
fn getEnergyConservationFactor(specularEnvironmentR0: vec3f,environmentBrdf: vec3f)->vec3f {
return 1.0+specularEnvironmentR0*(1.0/environmentBrdf.y-1.0);
}
#endif
#if CONDUCTOR_SPECULAR_MODEL==CONDUCTOR_SPECULAR_MODEL_OPENPBR
const F82_COS_THETA_MAX: f32 =0.142857143;
const F82_ONE_MINUS_CTM_POW5: f32 =0.462664366;
const F82_ONE_MINUS_CTM_POW6: f32 =0.396569457;
const F82_B_DENOMINATOR_RECIP: f32 =17.6512785;
const BRDF_Z_SCALE: f32 =16.0;
fn getF82Specular(NdotV: f32,F0: vec3f,edgeTint: vec3f,roughness: f32)->vec3f {
let white_minus_F0: vec3f=vec3f(1.0f)-F0;
let b_numerator: vec3f=(F0+white_minus_F0*F82_ONE_MINUS_CTM_POW5)*(vec3f(1.0)-edgeTint);
let b: vec3f=b_numerator*F82_B_DENOMINATOR_RECIP;
let cos_theta: f32=max(roughness,NdotV);
let one_minus_cos_theta: f32=1.0-cos_theta;
let offset_from_F0: vec3f=(white_minus_F0-b*cos_theta*one_minus_cos_theta)*pow(one_minus_cos_theta,5.0f);
return clamp(F0+offset_from_F0,vec3f(0.0f),vec3f(1.0f));
}
fn getF82B(F0: vec3f,edgeTint: vec3f)->vec3f {
return (F0+(vec3f(1.0)-F0)*F82_ONE_MINUS_CTM_POW5)*(vec3f(1.0)-edgeTint)*F82_B_DENOMINATOR_RECIP;
}
fn getF82DirectionalAlbedo(F0: vec3f,F90: vec3f,b: vec3f,environmentBrdf: vec3f)->vec3f {
return (F90-F0)*environmentBrdf.x+F0*environmentBrdf.y-b*environmentBrdf.z;
}
fn getF82AverageFresnel(F0: vec3f,b: vec3f)->vec3f {
return F0+(vec3f(1.0)-F0)/21.0-b/126.0;
}
#endif
#ifdef FUZZENVIRONMENTBRDF
fn getFuzzBRDFLookup(NdotV: f32,perceptualRoughness: f32)->vec3f {
let UV: vec2f=vec2f(perceptualRoughness,NdotV);
var brdfLookup: vec4f=textureSample(environmentFuzzBrdfSampler,environmentFuzzBrdfSamplerSampler,UV);
const RiRange: vec2f=vec2f(0.0f,0.75f);
const ARange: vec2f=vec2f(0.005f,0.88f);
const BRange: vec2f=vec2f(-0.18f,0.002f);
brdfLookup.r=mix(ARange.x, ARange.y, brdfLookup.r);
brdfLookup.g=mix(BRange.x, BRange.y, brdfLookup.g);
brdfLookup.b=mix(RiRange.x,RiRange.y,brdfLookup.b);
return brdfLookup.rgb;
}
#endif
#ifdef ENVIRONMENTBRDF
fn getBRDFLookup(NdotV: f32,perceptualRoughness: f32)->vec3f {
var UV: vec2f= vec2f(NdotV,perceptualRoughness);
var brdfLookup: vec4f= textureSample(environmentBrdfSampler,environmentBrdfSamplerSampler,UV);
#ifdef ENVIRONMENTBRDF_RGBD
brdfLookup=vec4f(fromRGBD(brdfLookup.rgba),brdfLookup.a);
#endif
return brdfLookup.rgb;
}
fn getReflectanceFromBRDFWithEnvLookup(specularEnvironmentR0: vec3f,specularEnvironmentR90: vec3f,environmentBrdf: vec3f)->vec3f {
#ifdef BRDF_V_HEIGHT_CORRELATED
var reflectance: vec3f=(specularEnvironmentR90-specularEnvironmentR0)*environmentBrdf.x+specularEnvironmentR0*environmentBrdf.y;
#else
var reflectance: vec3f=specularEnvironmentR0*environmentBrdf.x+specularEnvironmentR90*environmentBrdf.y;
#endif
return reflectance;
}
fn getReflectanceFromBRDFLookup(specularEnvironmentR0: vec3f,environmentBrdf: vec3f)->vec3f {
#ifdef BRDF_V_HEIGHT_CORRELATED
var reflectance: vec3f=mix(environmentBrdf.xxx,environmentBrdf.yyy,specularEnvironmentR0);
#else
var reflectance: vec3f=specularEnvironmentR0*environmentBrdf.x+environmentBrdf.y;
#endif
return reflectance;
}
#endif
/* NOT USED
#if defined(SHEEN) && defined(SHEEN_SOFTER)
fn getBRDFLookupCharlieSheen(NdotV: f32,perceptualRoughness: f32)->f32
{
var c: f32=1.0-NdotV;
var c3: f32=c*c*c;
return 0.65584461*c3+1.0/(4.16526551+exp(-7.97291361*perceptualRoughness+6.33516894));
}
#endif
*/
#if !defined(ENVIRONMENTBRDF) || defined(REFLECTIONMAP_SKYBOX) || defined(ALPHAFRESNEL)
fn getReflectanceFromAnalyticalBRDFLookup_Jones(VdotN: f32,reflectance0: vec3f,reflectance90: vec3f,smoothness: f32)->vec3f
{
var weight: f32=mix(FRESNEL_MAXIMUM_ON_ROUGH,1.0,smoothness);
return reflectance0+weight*(reflectance90-reflectance0)*pow5(saturate(1.0-VdotN));
}
#endif
#if defined(SHEEN) && defined(ENVIRONMENTBRDF)
/**
* The sheen BRDF not containing F can be easily stored in the blue channel of the BRDF texture.
* The blue channel contains DCharlie*VAshikhmin*NdotL as a lokkup table
*/
fn getSheenReflectanceFromBRDFLookup(reflectance0: vec3f,environmentBrdf: vec3f)->vec3f {
var sheenEnvironmentReflectance: vec3f=reflectance0*environmentBrdf.b;
return sheenEnvironmentReflectance;
}
#endif
fn fresnelSchlickGGXVec3(VdotH: f32,reflectance0: vec3f,reflectance90: vec3f)->vec3f
{
return reflectance0+(reflectance90-reflectance0)*pow5(1.0-VdotH);
}
fn fresnelSchlickGGX(VdotH: f32,reflectance0: f32,reflectance90: f32)->f32
{
return reflectance0+(reflectance90-reflectance0)*pow5(1.0-VdotH);
}
#ifdef CLEARCOAT
fn getR0RemappedForClearCoat(f0: vec3f)->vec3f {
#ifdef CLEARCOAT_DEFAULTIOR
#ifdef MOBILE
return saturateVec3(f0*(f0*0.526868+0.529324)-0.0482256);
#else
return saturateVec3(f0*(f0*(0.941892-0.263008*f0)+0.346479)-0.0285998);
#endif
#else
var s: vec3f=sqrt(f0);
var t: vec3f=(uniforms.vClearCoatRefractionParams.z+uniforms.vClearCoatRefractionParams.w*s)/(uniforms.vClearCoatRefractionParams.w+uniforms.vClearCoatRefractionParams.z*s);
return squareVec3(t);
#endif
}
#endif
#ifdef IRIDESCENCE
const XYZ_TO_REC709: mat3x3f= mat3x3f(
3.2404542,-0.9692660, 0.0556434,
-1.5371385, 1.8760108,-0.2040259,
-0.4985314, 0.0415560, 1.0572252
);
fn getIORTfromAirToSurfaceR0(f0: vec3f)->vec3f {
var sqrtF0: vec3f=sqrt(f0);
return (1.+sqrtF0)/(1.-sqrtF0);
}
fn getR0fromIORsVec3(iorT: vec3f,iorI: f32)->vec3f {
return squareVec3((iorT- vec3f(iorI))/(iorT+ vec3f(iorI)));
}
fn getR0fromIORs(iorT: f32,iorI: f32)->f32 {
return square((iorT-iorI)/(iorT+iorI));
}
fn evalSensitivity(opd: f32,shift: vec3f)->vec3f {
var phase: f32=2.0*PI*opd*1.0e-9;
const val: vec3f= vec3f(5.4856e-13,4.4201e-13,5.2481e-13);
const pos: vec3f= vec3f(1.6810e+06,1.7953e+06,2.2084e+06);
const vr: vec3f= vec3f(4.3278e+09,9.3046e+09,6.6121e+09);
var xyz: vec3f=val*sqrt(2.0*PI*vr)*cos(pos*phase+shift)*exp(-square(phase)*vr);
xyz.x+=9.7470e-14*sqrt(2.0*PI*4.5282e+09)*cos(2.2399e+06*phase+shift[0])*exp(-4.5282e+09*square(phase));
xyz/=1.0685e-7;
var srgb: vec3f=XYZ_TO_REC709*xyz;
return srgb;
}
fn evalIridescence(outsideIOR: f32,eta2: f32,cosTheta1: f32,thinFilmThickness: f32,baseF0: vec3f)->vec3f {
var I: vec3f= vec3f(1.0);
var iridescenceIOR: f32=mix(outsideIOR,eta2,smoothstep(0.0,0.03,thinFilmThickness));
var sinTheta2Sq: f32=square(outsideIOR/iridescenceIOR)*(1.0-square(cosTheta1));
var cosTheta2Sq: f32=1.0-sinTheta2Sq;
if (cosTheta2Sq<0.0) {
return I;
}
var cosTheta2: f32=sqrt(cosTheta2Sq);
var R0: f32=getR0fromIORs(iridescenceIOR,outsideIOR);
var R12: f32=fresnelSchlickGGX(cosTheta1,R0,1.);
var R21: f32=R12;
var T121: f32=1.0-R12;
var phi12: f32=0.0;
if (iridescenceIOR<outsideIOR) {
phi12=PI;
}
var phi21: f32=PI-phi12;
var baseIOR: vec3f=getIORTfromAirToSurfaceR0(clamp(baseF0,vec3f(0.0),vec3f(0.9999)));
 
var R1: vec3f=getR0fromIORsVec3(baseIOR,iridescenceIOR);
let maxR1: f32=max(R1.r,max(R1.g,R1.b));
if (maxR1<1e-6) {
return max(vec3f(R12),vec3f(0.0));
}
var R23: vec3f=fresnelSchlickGGXVec3(cosTheta2,R1,vec3f(1.));
var phi23: vec3f=vec3f(0.0);
if (baseIOR[0]<iridescenceIOR) {
phi23[0]=PI;
}
if (baseIOR[1]<iridescenceIOR) {
phi23[1]=PI;
}
if (baseIOR[2]<iridescenceIOR) {
phi23[2]=PI;
}
var opd: f32=2.0*iridescenceIOR*thinFilmThickness*cosTheta2;
var phi: vec3f=vec3f(phi21)+phi23;
var R123: vec3f=clamp(R12*R23,vec3f(1e-5),vec3f(0.9999));
var r123: vec3f=sqrt(R123);
var Rs: vec3f=(T121*T121)*R23/(vec3f(1.0)-R123);
var C0: vec3f=R12+Rs;
I=C0;
var Cm: vec3f=Rs-T121;
for (var m: i32=1; m<=2; m++)
{
Cm*=r123;
var Sm: vec3f=2.0*evalSensitivity(f32(m)*opd,f32(m)*phi);
I+=Cm*Sm;
}
return max(I,vec3f(0.0));
}
#endif
fn normalDistributionFunction_TrowbridgeReitzGGX(NdotH: f32,alphaG: f32)->f32
{
var a2: f32=alphaG*alphaG;
var d: f32=NdotH*NdotH*(a2-1.0)+1.0;
return a2/(PI*d*d);
}
#ifdef SHEEN
fn normalDistributionFunction_CharlieSheen(NdotH: f32,alphaG: f32)->f32
{
var invR: f32=1./alphaG;
var cos2h: f32=NdotH*NdotH;
var sin2h: f32=1.-cos2h;
return (2.+invR)*pow(sin2h,invR*.5)/(2.*PI);
}
#endif
#ifdef ANISOTROPIC
fn normalDistributionFunction_BurleyGGX_Anisotropic(NdotH: f32,TdotH: f32,BdotH: f32,alphaTB: vec2f)->f32 {
var a2: f32=alphaTB.x*alphaTB.y;
var v: vec3f= vec3f(alphaTB.y*TdotH,alphaTB.x *BdotH,a2*NdotH);
var v2: f32=dot(v,v);
var w2: f32=a2/v2;
return a2*w2*w2*RECIPROCAL_PI;
}
#endif
#ifdef BRDF_V_HEIGHT_CORRELATED
fn smithVisibility_GGXCorrelated(NdotL: f32,NdotV: f32,alphaG: f32)->f32 {
#ifdef MOBILE
var GGXV: f32=NdotL*(NdotV*(1.0-alphaG)+alphaG);
var GGXL: f32=NdotV*(NdotL*(1.0-alphaG)+alphaG);
return 0.5/(GGXV+GGXL);
#else
var a2: f32=alphaG*alphaG;
var GGXV: f32=NdotL*sqrt(NdotV*(NdotV-a2*NdotV)+a2);
var GGXL: f32=NdotV*sqrt(NdotL*(NdotL-a2*NdotL)+a2);
return 0.5/(GGXV+GGXL);
#endif
}
#else
fn smithVisibilityG1_TrowbridgeReitzGGXFast(dot: f32,alphaG: f32)->f32
{
#ifdef MOBILE
return 1.0/(dot+alphaG+(1.0-alphaG)*dot ));
#else
var alphaSquared: f32=alphaG*alphaG;return 1.0/(dot+sqrt(alphaSquared+(1.0-alphaSquared)*dot*dot));
#endif
}
fn smithVisibility_TrowbridgeReitzGGXFast(NdotL: f32,NdotV: f32,alphaG: f32)->f32
{
var visibility: f32=smithVisibilityG1_TrowbridgeReitzGGXFast(NdotL,alphaG)*smithVisibilityG1_TrowbridgeReitzGGXFast(NdotV,alphaG);return visibility;}
#endif
#ifdef ANISOTROPIC
fn smithVisibility_GGXCorrelated_Anisotropic(NdotL: f32,NdotV: f32,TdotV: f32,BdotV: f32,TdotL: f32,BdotL: f32,alphaTB: vec2f)->f32 {
var lambdaV: f32=NdotL*length( vec3f(alphaTB.x*TdotV,alphaTB.y*BdotV,NdotV));var lambdaL: f32=NdotV*length( vec3f(alphaTB.x*TdotL,alphaTB.y*BdotL,NdotL));var v: f32=0.5/(lambdaV+lambdaL);return v;}
#endif
#ifdef CLEARCOAT
fn visibility_Kelemen(VdotH: f32)->f32 {
return 0.25/(VdotH*VdotH); }
#endif
#ifdef SHEEN
fn visibility_Ashikhmin(NdotL: f32,NdotV: f32)->f32
{
return 1./(4.*(NdotL+NdotV-NdotL*NdotV));}
/* NOT USED
#ifdef SHEEN_SOFTER
fn l(x: f32,alphaG: f32)->f32
{
var oneMinusAlphaSq: f32=(1.0-alphaG)*(1.0-alphaG);var a: f32=mix(21.5473,25.3245,oneMinusAlphaSq);var b: f32=mix(3.82987,3.32435,oneMinusAlphaSq);var c: f32=mix(0.19823,0.16801,oneMinusAlphaSq);var d: f32=mix(-1.97760,-1.27393,oneMinusAlphaSq);var e: f32=mix(-4.32054,-4.85967,oneMinusAlphaSq);return a/(1.0+b*pow(x,c))+d*x+e;}
fn lambdaSheen(cosTheta: f32,alphaG: f32)->f32
{
return abs(cosTheta)<0.5 ? exp(l(cosTheta,alphaG)) : exp(2.0*l(0.5,alphaG)-l(1.0-cosTheta,alphaG));}
fn visibility_CharlieSheen(NdotL: f32,NdotV: f32,alphaG: f32)->f32
{
var G: f32=1.0/(1.0+lambdaSheen(NdotV,alphaG)+lambdaSheen(NdotL,alphaG));return G/(4.0*NdotV*NdotL);}
#endif
*/
#endif
const constant1_FON: f32=0.5f-2.0f/(3.0f*PI);const constant2_FON: f32=2.0f/3.0f-28.0f/(15.0f*PI);fn E_FON_approx(mu: f32,roughness: f32)->f32
{
var sigma: f32=roughness; 
var mucomp: f32=1.0f-mu;var mucomp2: f32=mucomp*mucomp;const Gcoeffs: mat2x2f=mat2x2f(0.0571085289f,-0.332181442f,
0.491881867f,0.0714429953f);var GoverPi: f32=dot(Gcoeffs*vec2f(mucomp,mucomp2),vec2f(1.0f,mucomp2));return (1.0f+sigma*GoverPi)/(1.0f+constant1_FON*sigma);}
fn diffuseBRDF_EON(albedo: vec3f,roughness: f32,NdotL: f32,NdotV: f32,LdotV: f32)->vec3f
{
var rho: vec3f=albedo;var sigma: f32=roughness; 
var mu_i: f32=NdotL; 
var mu_o: f32=NdotV; 
var s: f32=LdotV-mu_i*mu_o; 
var sovertF: f32=select(s,s/max(mu_i,mu_o),s>0.0f); 
var AF: f32=1.0f/(1.0f+constant1_FON*sigma); 
var f_ss: vec3f=(rho*RECIPROCAL_PI)*AF*(1.0f+sigma*sovertF); 
var EFo: f32=E_FON_approx(mu_o,sigma); 
var EFi: f32=E_FON_approx(mu_i,sigma); 
var avgEF: f32=AF*(1.0f+constant2_FON*sigma); 
var rho_ms: vec3f=(rho*rho)*avgEF/(vec3f(1.0f)-rho*(1.0f-avgEF));const eps: f32=1.0e-7f;var f_ms: vec3f=(rho_ms*RECIPROCAL_PI)*max(eps,1.0f-EFo) 
* max(eps,1.0f-EFi)
/ max(eps,1.0f-avgEF);return (f_ss+f_ms);}
fn diffuseBRDF_Burley(NdotL: f32,NdotV: f32,VdotH: f32,roughness: f32)->f32 {
var diffuseFresnelNV: f32=pow5(saturateEps(1.0-NdotL));var diffuseFresnelNL: f32=pow5(saturateEps(1.0-NdotV));var diffuseFresnel90: f32=0.5+2.0*VdotH*VdotH*roughness;var fresnel: f32 =
(1.0+(diffuseFresnel90-1.0)*diffuseFresnelNL) *
(1.0+(diffuseFresnel90-1.0)*diffuseFresnelNV);return fresnel/PI;}
#ifdef SS_TRANSLUCENCY
fn transmittanceBRDF_Burley(tintColor: vec3f,diffusionDistance: vec3f,thickness: f32)->vec3f {
var S: vec3f=1./maxEpsVec3(diffusionDistance);var temp: vec3f=exp((-0.333333333*thickness)*S);return tintColor.rgb*0.25*(temp*temp*temp+3.0*temp);}
fn computeWrappedDiffuseNdotL(NdotL: f32,w: f32)->f32 {
var t: f32=1.0+w;var invt2: f32=1.0/(t*t);return saturate((NdotL+w)*invt2);}
#endif
#endif
`;

/**
 * Babylon.js "screenSpaceRayTrace" include (WGSL).
 */
export const screenSpaceRayTraceWGSL = `
fn distanceSquared(a: vec2f,b: vec2f)->f32 {
 
var temp=a-b;
 
return dot(temp,temp);
 }
#ifdef SSRAYTRACE_SCREENSPACE_DEPTH
fn linearizeDepth(depth: f32,near: f32,far: f32)->f32 {
#ifdef SSRAYTRACE_RIGHT_HANDED_SCENE
return -(near*far)/(far-depth*(far-near));
#else
return (near*far)/(far-depth*(far-near));
#endif
}
#endif
/**
param csOrigin Camera-space ray origin,which must be 
within the view volume and must have z>0.01 and project within the valid screen rectangle
param csDirection Unit length camera-space ray direction
param projectToPixelMatrix A projection matrix that maps to **pixel** coordinates 
(**not** [-1,+1] normalized device coordinates).
param csZBuffer The camera-space Z buffer
param csZBufferSize Dimensions of csZBuffer
param csZThickness Camera space csZThickness to ascribe to each pixel in the depth buffer
param nearPlaneZ Positive number. Doesn't have to be THE actual near plane,just a reasonable value
for clipping rays headed towards the camera. Should be the actual near plane if screen-space depth is enabled.
param farPlaneZ The far plane for the camera. Used when screen-space depth is enabled.
param stride Step in horizontal or vertical pixels between samples. This is a var because: f32 integer math is slow on GPUs,but should be set to an integer>=1
param jitterFraction Number between 0 and 1 for how far to bump the ray in stride units
to conceal banding artifacts,plus the stride ray offset.
param maxSteps Maximum number of iterations. Higher gives better images but may be slow
param maxRayTraceDistance Maximum camera-space distance to trace before returning a miss
param selfCollisionNumSkip Number of steps to skip at start when raytracing to avar self: voidnull collisions.
1 is a reasonable value,depending on the scene you may need to set this value to 2
param hitPixel Pixel coordinates of the first intersection with the scene
param numIterations number of iterations performed
param csHitPovar Camera: i32 space location of the ray hit
*/
fn traceScreenSpaceRay1(
csOrigin: vec3f,
csDirection: vec3f,
projectToPixelMatrix: mat4x4f,
csZBuffer: texture_2d<f32>,
csZBufferSize: vec2f,
#ifdef SSRAYTRACE_USE_BACK_DEPTHBUFFER
csZBackBuffer: texture_2d<f32>,
csZBackSizeFactor: f32,
#endif
csZThickness: f32,
nearPlaneZ: f32,
farPlaneZ: f32,
stride: f32,
jitterFraction: f32,
maxSteps: f32,
maxRayTraceDistance: f32,
selfCollisionNumSkip: f32,
startPixel: ptr<function,vec2f>,
hitPixel: ptr<function,vec2f>,
csHitPoint: ptr<function,vec3f>,
numIterations: ptr<function,f32>
#ifdef SSRAYTRACE_DEBUG
,debugColor: ptr<function,vec3f>
#endif
)->bool
{
#ifdef SSRAYTRACE_RIGHT_HANDED_SCENE
var rayLength: f32=select(maxRayTraceDistance,(-nearPlaneZ-csOrigin.z)/csDirection.z,(csOrigin.z+csDirection.z*maxRayTraceDistance)>-nearPlaneZ);
#else
var rayLength: f32=select(maxRayTraceDistance,(nearPlaneZ-csOrigin.z)/csDirection.z,(csOrigin.z+csDirection.z*maxRayTraceDistance)<nearPlaneZ);
#endif
var csEndPoint: vec3f=csOrigin+csDirection*rayLength;
*hitPixel= vec2f(-1.0,-1.0);
var H0: vec4f=projectToPixelMatrix* vec4f(csOrigin,1.0);
var H1: vec4f=projectToPixelMatrix* vec4f(csEndPoint,1.0);
var k0: f32=1.0/H0.w;
var k1: f32=1.0/H1.w;
var Q0: vec3f=csOrigin*k0;
var Q1: vec3f=csEndPoint*k1;
var P0: vec2f=H0.xy*k0;
var P1: vec2f=H1.xy*k1;
#ifdef SSRAYTRACE_CLIP_TO_FRUSTUM
var xMax: f32=csZBufferSize.x-0.5;
var xMin=0.5;
var yMax=csZBufferSize.y-0.5;
var yMin=0.5;
var alpha: f32=0.0;
if ((P1.y>yMax) || (P1.y<yMin)) {
alpha=(P1.y-select(yMin,yMax,(P1.y>yMax)))/(P1.y-P0.y);
}
if ((P1.x>xMax) || (P1.x<xMin)) {
alpha=max(alpha,(P1.x-select(xMin,xMax,(P1.x>xMax)))/(P1.x-P0.x));
}
P1=mix(P1,P0,alpha);
 k1=mix(k1,k0,alpha);
 Q1=mix(Q1,Q0,alpha);
#endif
P1+= vec2f(select(0.0,0.01,distanceSquared(P0,P1)<0.0001));
var delta: vec2f=P1-P0;
var permute: bool=false;
if (abs(delta.x)<abs(delta.y)) {
 
permute=true;
delta=delta.yx;
P0=P0.yx;
P1=P1.yx;
 }
var stepDirection: f32=sign(delta.x);
var invdx: f32=stepDirection/delta.x;
var dP: vec2f= vec2f(stepDirection,delta.y*invdx);
var dQ: vec3f=(Q1-Q0)*invdx;
var dk: f32=(k1-k0)*invdx;
var zMin: f32=min(csEndPoint.z,csOrigin.z);
var zMax: f32=max(csEndPoint.z,csOrigin.z);
dP*=stride;
 dQ*=stride;
 dk*=stride;
P0+=dP*jitterFraction;
 Q0+=dQ*jitterFraction;
 k0+=dk*jitterFraction;
var pqk: vec4f= vec4f(P0,Q0.z,k0);
var dPQK: vec4f= vec4f(dP,dQ.z,dk);
*startPixel=select(P0.xy,P0.yx,permute);
var prevZMaxEstimate: f32=csOrigin.z;
var rayZMin: f32=prevZMaxEstimate;
var rayZMax=prevZMaxEstimate;
var sceneZMax: f32=rayZMax+1e4;
var end: f32=P1.x*stepDirection;
var hit: bool=false;
var stepCount: f32;
for (stepCount=0.0;(stepCount<=selfCollisionNumSkip) ||
((pqk.x*stepDirection)<=end &&
stepCount<maxSteps &&
!hit);pqk+=dPQK 
)
{
*hitPixel=select(pqk.xy,pqk.yx,permute);
#ifndef SSRAYTRACE_CLIP_TO_FRUSTUM
if ((*hitPixel).x<0.0 || (*hitPixel).x>=csZBufferSize.x ||
(*hitPixel).y<0.0 || (*hitPixel).y>=csZBufferSize.y) {
 break;
 }
#endif
rayZMin=prevZMaxEstimate;
rayZMax=(dPQK.z*0.5+pqk.z)/(dPQK.w*0.5+pqk.w);
rayZMax=clamp(rayZMax,zMin,zMax);
prevZMaxEstimate=rayZMax;
#ifdef SSRAYTRACE_RIGHT_HANDED_SCENE
if (prevZMaxEstimate<-farPlaneZ) {
 break;
 }
#else
if (prevZMaxEstimate>farPlaneZ) {
 break;
 }
#endif
if (rayZMin>rayZMax) {
 
var t: f32=rayZMin;
 rayZMin=rayZMax;
 rayZMax=t;
}
sceneZMax=textureLoad(csZBuffer,vec2<i32>(*hitPixel),0).r;
#ifdef SSRAYTRACE_SCREENSPACE_DEPTH
sceneZMax=linearizeDepth(sceneZMax,nearPlaneZ,farPlaneZ);
#endif
if (sceneZMax==0.0) {
 sceneZMax=1e8;
 }
#ifdef SSRAYTRACE_RIGHT_HANDED_SCENE
#ifdef SSRAYTRACE_USE_BACK_DEPTHBUFFER
var sceneBackZ: f32=textureLoad(csZBackBuffer,vec2<i32>(*hitPixel/csZBackSizeFactor),0).r;
#ifdef SSRAYTRACE_SCREENSPACE_DEPTH
sceneBackZ=linearizeDepth(sceneBackZ,nearPlaneZ,farPlaneZ);
#endif
if (sceneBackZ==0.0) {
 sceneBackZ=-1e8;
 }
hit=(rayZMax>=sceneBackZ-csZThickness) && (rayZMin<=sceneZMax);
#else
hit=(rayZMax>=sceneZMax-csZThickness) && (rayZMin<=sceneZMax);
#endif
#else
#ifdef SSRAYTRACE_USE_BACK_DEPTHBUFFER
var sceneBackZ: f32=textureLoad(csZBackBuffer,vec2<i32>(*hitPixel/csZBackSizeFactor),0).r;
#ifdef SSRAYTRACE_SCREENSPACE_DEPTH
sceneBackZ=linearizeDepth(sceneBackZ,nearPlaneZ,farPlaneZ);
#endif
if (sceneBackZ==0.0) {
 sceneBackZ=1e8;
 }
hit=(rayZMin<=sceneBackZ+csZThickness) && (rayZMax>=sceneZMax);
#else
hit=(rayZMin<=sceneZMax+csZThickness) && (rayZMax>=sceneZMax);
#endif
#endif
stepCount+=1.0;
}
pqk-=dPQK;
stepCount-=1.0;
if (((pqk.x+dPQK.x)*stepDirection)>end || (stepCount+1.0)>=maxSteps) {
hit=false;
}
#ifdef SSRAYTRACE_ENABLE_REFINEMENT
if (stride>1.0 && hit) {
pqk-=dPQK;
stepCount-=1.0;
var invStride: f32=1.0/stride;
dPQK*=invStride;
var refinementStepCount: f32=0.0;
prevZMaxEstimate=pqk.z/pqk.w;
rayZMax=prevZMaxEstimate;
sceneZMax=rayZMax+1e7;
for (;refinementStepCount<=1.0 ||
((refinementStepCount<=stride*1.4) &&
(rayZMax<sceneZMax));pqk+=dPQK)
{
rayZMin=prevZMaxEstimate;
rayZMax=(dPQK.z*0.5+pqk.z)/(dPQK.w*0.5+pqk.w);
rayZMax=clamp(rayZMax,zMin,zMax);
prevZMaxEstimate=rayZMax;
rayZMax=max(rayZMax,rayZMin);
*hitPixel=select(pqk.xy,pqk.yx,permute);
sceneZMax=textureLoad(csZBuffer,vec2<i32>(*hitPixel),0).r;
#ifdef SSRAYTRACE_SCREENSPACE_DEPTH
sceneZMax=linearizeDepth(sceneZMax,nearPlaneZ,farPlaneZ);
#endif
if (sceneZMax==0.0) {
 sceneZMax=1e8;
 }
refinementStepCount+=1.0;
}
pqk-=dPQK;
refinementStepCount-=1.0;
stepCount+=refinementStepCount/stride;
}
#endif
Q0=vec3f(Q0.xy+dQ.xy*stepCount,pqk.z);
*csHitPoint=Q0/pqk.w;
*numIterations=stepCount+1.0;
#ifdef SSRAYTRACE_DEBUG
if (((pqk.x+dPQK.x)*stepDirection)>end) {
*debugColor= vec3f(0,0,1);
}
 else if ((stepCount+1.0)>=maxSteps) {
*debugColor= vec3f(1,0,0);
}
 else if (!hit) {
*debugColor= vec3f(1,1,0);
}
 else {
*debugColor= vec3f(0,stepCount/maxSteps,0);
}
#endif
return hit;
}
/**
texCoord: in the [0,1] range
depth: depth in view space (range [znear,zfar]])
*/
fn computeViewPosFromUVDepth(texCoord: vec2f,depth: f32,projection: mat4x4f,invProjectionMatrix: mat4x4f)->vec3f {
var xy=texCoord*2.0-1.0;
var z: f32;
#ifdef SSRAYTRACE_RIGHT_HANDED_SCENE
#ifdef ORTHOGRAPHIC_CAMERA
z=-projection[2].z*depth+projection[3].z;
#else
z=-projection[2].z-projection[3].z/depth;
#endif
#else
#ifdef ORTHOGRAPHIC_CAMERA
z=projection[2].z*depth+projection[3].z;
#else
z=projection[2].z+projection[3].z/depth;
#endif
#endif
var w=1.0;
var ndc=vec4f(xy,z,w);
var eyePos: vec4f=invProjectionMatrix*ndc;
var result=eyePos.xyz/eyePos.w;
return result;
}
`;

/**
 * Babylon.js "screenSpaceReflection2.fragment" shader (WGSL).
 */
export const screenSpaceReflection2FragmentWGSL = `
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
varying vUV: vec2f;
#ifdef SSR_SUPPORTED
var reflectivitySamplerSampler: sampler;
var reflectivitySampler: texture_2d<f32>;
var normalSampler: texture_2d<f32>;
var depthSampler: texture_2d<f32>;
#ifdef SSRAYTRACE_USE_BACK_DEPTHBUFFER
var backDepthSampler: texture_2d<f32>;
uniform backSizeFactor: f32;
#endif
#ifdef SSR_USE_ENVIRONMENT_CUBE
var envCubeSamplerSampler: sampler;
var envCubeSampler: texture_cube<f32>;
#ifdef SSR_USE_LOCAL_REFLECTIONMAP_CUBIC
uniform vReflectionPosition: vec3f;
uniform vReflectionSize: vec3f;
#endif
#endif
uniform view: mat4x4f;
uniform invView: mat4x4f;
uniform projection: mat4x4f;
uniform invProjectionMatrix: mat4x4f;
uniform projectionPixel: mat4x4f;
uniform nearPlaneZ: f32;
uniform farPlaneZ: f32;
uniform stepSize: f32;
uniform maxSteps: f32;
uniform strength: f32;
uniform thickness: f32;
uniform roughnessFactor: f32;
uniform reflectionSpecularFalloffExponent: f32;
uniform maxDistance: f32;
uniform selfCollisionNumSkip: f32;
uniform reflectivityThreshold: f32;
#include<helperFunctions>
#include<pbrBRDFFunctions>
#include<screenSpaceRayTrace>
fn hash(a: vec3f)->vec3f
{
var result=fract(a*0.8);
result+=dot(result,result.yxz+19.19);
return fract((result.xxy+result.yxx)*result.zyx);
}
fn computeAttenuationForIntersection(ihitPixel: vec2f,hitUV: vec2f,vsRayOrigin: vec3f,vsHitPoint: vec3f,reflectionVector: vec3f,maxRayDistance: f32,numIterations: f32)->f32 {
var attenuation: f32=1.0;
#ifdef SSR_ATTENUATE_SCREEN_BORDERS
var dCoords: vec2f=smoothstep(vec2f(0.2),vec2f(0.6),abs( vec2f(0.5,0.5)-hitUV.xy));
attenuation*=clamp(1.0-(dCoords.x+dCoords.y),0.0,1.0);
#endif
#ifdef SSR_ATTENUATE_INTERSECTION_DISTANCE
attenuation*=1.0-clamp(distance(vsRayOrigin,vsHitPoint)/maxRayDistance,0.0,1.0);
#endif
#ifdef SSR_ATTENUATE_INTERSECTION_NUMITERATIONS
attenuation*=1.0-(numIterations/uniforms.maxSteps);
#endif
#ifdef SSR_ATTENUATE_BACKFACE_REFLECTION
var reflectionNormal: vec3f=textureLoad(normalSampler,vec2<i32>(ihitPixel),0).xyz;
var directionBasedAttenuation: f32=smoothstep(-0.17,0.0,dot(reflectionNormal,-reflectionVector));
attenuation*=directionBasedAttenuation;
#endif
return attenuation;
}
#endif
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#ifdef SSR_SUPPORTED
var colorFull: vec4f=textureSampleLevel(textureSampler,textureSamplerSampler,input.vUV,0.0);
var color: vec3f=colorFull.rgb;
var reflectivity: vec4f=max(textureSampleLevel(reflectivitySampler,reflectivitySamplerSampler,input.vUV,0.0),vec4f(0.0));
#ifndef SSR_DISABLE_REFLECTIVITY_TEST
if (max(reflectivity.r,max(reflectivity.g,reflectivity.b))<=uniforms.reflectivityThreshold) {
#ifdef SSR_USE_BLUR
fragmentOutputs.color= vec4f(0.);
#else
fragmentOutputs.color=colorFull;
#endif
return fragmentOutputs;
}
#endif
#ifdef SSR_INPUT_IS_GAMMA_SPACE
color=toLinearSpaceVec3(color);
#endif
var texSize: vec2f= vec2f(textureDimensions(depthSampler,0));
var csNormal: vec3f=textureLoad(normalSampler,vec2<i32>(input.vUV*texSize),0).xyz;
 
#ifdef SSR_DECODE_NORMAL
csNormal=csNormal*2.0-1.0;
#endif
#ifdef SSR_NORMAL_IS_IN_WORLDSPACE
csNormal=(uniforms.view* vec4f(csNormal,0.0)).xyz;
#endif
var depth: f32=textureLoad(depthSampler,vec2<i32>(input.vUV*texSize),0).r;
#ifdef SSRAYTRACE_SCREENSPACE_DEPTH
depth=linearizeDepth(depth,uniforms.nearPlaneZ,uniforms.farPlaneZ);
#endif
var csPosition: vec3f=computeViewPosFromUVDepth(input.vUV,depth,uniforms.projection,uniforms.invProjectionMatrix);
#ifdef ORTHOGRAPHIC_CAMERA
var csViewDirection: vec3f= vec3f(0.,0.,1.);
#else
var csViewDirection: vec3f=normalize(csPosition);
#endif
var csReflectedVector: vec3f=reflect(csViewDirection,csNormal);
#ifdef SSR_USE_ENVIRONMENT_CUBE
var wReflectedVector: vec3f=(uniforms.invView* vec4f(csReflectedVector,0.0)).xyz;
#ifdef SSR_USE_LOCAL_REFLECTIONMAP_CUBIC
var worldPos: vec4f=uniforms.invView* vec4f(csPosition,1.0);
wReflectedVector=parallaxCorrectNormal(worldPos.xyz,normalize(wReflectedVector),uniforms.vReflectionSize,uniforms.vReflectionPosition);
#endif
#ifdef SSR_INVERTCUBICMAP
wReflectedVector.y*=-1.0;
#endif
#ifdef SSRAYTRACE_RIGHT_HANDED_SCENE
wReflectedVector.z*=-1.0;
#endif
var envColor: vec3f=textureSampleLevel(envCubeSampler,envCubeSamplerSampler,wReflectedVector,0.0).xyz;
#ifdef SSR_ENVIRONMENT_CUBE_IS_GAMMASPACE
envColor=toLinearSpaceVec3(envColor);
#endif
#else
var envColor: vec3f=color;
#endif
var reflectionAttenuation: f32=1.0;
var rayHasHit: bool=false;
var startPixel: vec2f;
var hitPixel: vec2f;
var hitPoint: vec3f;
var numIterations: f32;
#ifdef SSRAYTRACE_DEBUG
var debugColor: vec3f;
#endif
#ifdef SSR_ATTENUATE_FACING_CAMERA
reflectionAttenuation*=1.0-smoothstep(0.25,0.5,dot(-csViewDirection,csReflectedVector));
#endif
if (reflectionAttenuation>0.0) {
#ifdef SSR_USE_BLUR
var jitt: vec3f= vec3f(0.);
#else
var roughness: f32=1.0-reflectivity.a;
var jitt: vec3f=mix( vec3f(0.0),hash(csPosition)- vec3f(0.5),roughness)*uniforms.roughnessFactor;
 
#endif
var uv2: vec2f=input.vUV*texSize;
var c: f32=(uv2.x+uv2.y)*0.25;
var jitter: f32=((c)%(1.0));
 
rayHasHit=traceScreenSpaceRay1(
csPosition,
normalize(csReflectedVector+jitt),
uniforms.projectionPixel,
depthSampler,
texSize,
#ifdef SSRAYTRACE_USE_BACK_DEPTHBUFFER
backDepthSampler,
uniforms.backSizeFactor,
#endif
uniforms.thickness,
uniforms.nearPlaneZ,
uniforms.farPlaneZ,
uniforms.stepSize,
jitter,
uniforms.maxSteps,
uniforms.maxDistance,
uniforms.selfCollisionNumSkip,
&startPixel,
&hitPixel,
&hitPoint,
&numIterations
#ifdef SSRAYTRACE_DEBUG
,&debugColor
#endif
);
}
#ifdef SSRAYTRACE_DEBUG
fragmentOutputs.color= vec4f(debugColor,1.);
return fragmentOutputs;
#endif
var F0: vec3f=reflectivity.rgb;
var fresnel: vec3f=fresnelSchlickGGXVec3(max(dot(csNormal,-csViewDirection),0.0),F0, vec3f(1.));
var SSR: vec3f=envColor;
if (rayHasHit) {
var reflectedColor: vec3f=textureLoad(textureSampler,vec2<i32>(hitPixel),0).rgb;
#ifdef SSR_INPUT_IS_GAMMA_SPACE
reflectedColor=toLinearSpaceVec3(reflectedColor);
#endif
reflectionAttenuation*=computeAttenuationForIntersection(hitPixel,hitPixel/texSize,csPosition,hitPoint,csReflectedVector,uniforms.maxDistance,numIterations);
SSR=reflectedColor*reflectionAttenuation+(1.0-reflectionAttenuation)*envColor;
}
#ifndef SSR_BLEND_WITH_FRESNEL
SSR*=fresnel;
#endif
SSR=clamp(SSR,vec3f(0.0),vec3f(1000.0));
 
#ifdef SSR_USE_BLUR
var blur_radius: f32=0.0;
var roughness: f32=1.0-reflectivity.a*(1.0-uniforms.roughnessFactor);
if (roughness>0.001) {
var cone_angle: f32=min(roughness,0.999)*3.14159265*0.5;
var cone_len: f32=distance(startPixel,hitPixel);
var op_len: f32=2.0*tan(cone_angle)*cone_len;
 
var a: f32=op_len;
var h: f32=cone_len;
var a2: f32=a*a;
var fh2: f32=4.0f*h*h;
blur_radius=(a*(sqrt(a2+fh2)-a))/(4.0f*h);
}
fragmentOutputs.color= vec4f(SSR,blur_radius/255.0);
 
#else
#ifdef SSR_BLEND_WITH_FRESNEL
var reflectionMultiplier: vec3f=clamp(pow(fresnel*uniforms.strength, vec3f(uniforms.reflectionSpecularFalloffExponent)),vec3f(0.0),vec3f(1.0));
#else
var reflectionMultiplier: vec3f=clamp(pow(reflectivity.rgb*uniforms.strength, vec3f(uniforms.reflectionSpecularFalloffExponent)),vec3f(0.0),vec3f(1.0));
#endif
var colorMultiplier: vec3f=1.0-reflectionMultiplier;
var finalColor: vec3f=(color*colorMultiplier)+(SSR*reflectionMultiplier);
#ifdef SSR_OUTPUT_IS_GAMMA_SPACE
finalColor=toGammaSpaceVec3(finalColor);
#endif
fragmentOutputs.color= vec4f(finalColor,colorFull.a);
#endif
#else
fragmentOutputs.color=textureSampleLevel(textureSampler,textureSamplerSampler,input.vUV,0.0);
#endif
}
`;

/**
 * Babylon.js "screenSpaceReflection2Blur.fragment" shader (WGSL).
 */
export const screenSpaceReflection2BlurFragmentWGSL = `
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
varying vUV: vec2f;
uniform texelOffsetScale: vec2f;
const weights: array<f32,8>=array<f32,8>(0.071303,0.131514,0.189879,0.321392,0.452906, 0.584419,0.715932,0.847445);
fn processSample(uv: vec2f,i: f32,stepSize: vec2f,accumulator: ptr<function,vec4f>,denominator: ptr<function,f32>)
{
var offsetUV: vec2f=stepSize*i+uv;
var coefficient: f32=weights[ i32(2.0-abs(i))];
*accumulator+=textureSampleLevel(textureSampler,textureSamplerSampler,offsetUV,0.0)*coefficient;
*denominator+=coefficient;
}
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
var colorFull: vec4f=textureSampleLevel(textureSampler,textureSamplerSampler,input.vUV,0.0);
if (dot(colorFull, vec4f(1.0))==0.0) {
fragmentOutputs.color=colorFull;
return fragmentOutputs;
}
var blurRadius: f32=colorFull.a*255.0;
 
var stepSize: vec2f=uniforms.texelOffsetScale.xy*blurRadius;
var accumulator: vec4f=textureSampleLevel(textureSampler,textureSamplerSampler,input.vUV,0.0)*0.214607;
var denominator: f32=0.214607;
processSample(input.vUV,1.0,stepSize,&accumulator,&denominator);
processSample(input.vUV,1.0*0.2,stepSize,&accumulator,&denominator);
processSample(input.vUV,1.0*0.4,stepSize,&accumulator,&denominator);
processSample(input.vUV,1.0*0.6,stepSize,&accumulator,&denominator);
processSample(input.vUV,1.0*0.8,stepSize,&accumulator,&denominator);
processSample(input.vUV,1.0*1.2,stepSize,&accumulator,&denominator);
processSample(input.vUV,1.0*1.4,stepSize,&accumulator,&denominator);
processSample(input.vUV,1.0*1.6,stepSize,&accumulator,&denominator);
processSample(input.vUV,1.0*1.8,stepSize,&accumulator,&denominator);
processSample(input.vUV,1.0*2.0,stepSize,&accumulator,&denominator);
processSample(input.vUV,-1.0,stepSize,&accumulator,&denominator);
processSample(input.vUV,-1.0*0.2,stepSize,&accumulator,&denominator);
processSample(input.vUV,-1.0*0.4,stepSize,&accumulator,&denominator);
processSample(input.vUV,-1.0*0.6,stepSize,&accumulator,&denominator);
processSample(input.vUV,-1.0*0.8,stepSize,&accumulator,&denominator);
processSample(input.vUV,-1.0*1.2,stepSize,&accumulator,&denominator);
processSample(input.vUV,-1.0*1.4,stepSize,&accumulator,&denominator);
processSample(input.vUV,-1.0*1.6,stepSize,&accumulator,&denominator);
processSample(input.vUV,-1.0*1.8,stepSize,&accumulator,&denominator);
processSample(input.vUV,-1.0*2.0,stepSize,&accumulator,&denominator);
fragmentOutputs.color= vec4f(accumulator.rgb/denominator,colorFull.a);
}
`;

/**
 * Babylon.js "screenSpaceReflection2BlurCombiner.fragment" shader (WGSL).
 */
export const screenSpaceReflection2BlurCombinerFragmentWGSL = `
var textureSamplerSampler: sampler;
var textureSampler: texture_2d<f32>;
 
var mainSamplerSampler: sampler;
var mainSampler: texture_2d<f32>;
var reflectivitySamplerSampler: sampler;
var reflectivitySampler: texture_2d<f32>;
uniform strength: f32;
uniform reflectionSpecularFalloffExponent: f32;
uniform reflectivityThreshold: f32;
varying vUV: vec2f;
#include<helperFunctions>
#ifdef SSR_BLEND_WITH_FRESNEL
#include<pbrBRDFFunctions>
#include<screenSpaceRayTrace>
uniform projection: mat4x4f;
uniform invProjectionMatrix: mat4x4f;
#ifdef SSR_NORMAL_IS_IN_WORLDSPACE
uniform view: mat4x4f;
#endif
var normalSampler: texture_2d<f32>;
var depthSampler: texture_2d<f32>;
#ifdef SSRAYTRACE_SCREENSPACE_DEPTH
uniform nearPlaneZ: f32;
uniform farPlaneZ: f32;
#endif
#endif
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#ifdef SSRAYTRACE_DEBUG
fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);
#else
var SSR: vec3f=textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb;
var color: vec4f=textureSample(mainSampler,textureSamplerSampler,input.vUV);
var reflectivity: vec4f=textureSample(reflectivitySampler,reflectivitySamplerSampler,input.vUV);
#ifndef SSR_DISABLE_REFLECTIVITY_TEST
if (max(reflectivity.r,max(reflectivity.g,reflectivity.b))<=uniforms.reflectivityThreshold) {
fragmentOutputs.color=color;
return fragmentOutputs;
}
#endif
#ifdef SSR_INPUT_IS_GAMMA_SPACE
color=toLinearSpaceVec4(color);
#endif
#ifdef SSR_BLEND_WITH_FRESNEL
var texSize: vec2f= vec2f(textureDimensions(depthSampler,0));
var csNormal: vec3f=textureLoad(normalSampler,vec2<i32>(input.vUV*texSize),0).xyz;
#ifdef SSR_DECODE_NORMAL
csNormal=csNormal*2.0-1.0;
#endif
#ifdef SSR_NORMAL_IS_IN_WORLDSPACE
csNormal=(uniforms.view*vec4f(csNormal,0.0)).xyz;
#endif
var depth: f32=textureLoad(depthSampler,vec2<i32>(input.vUV*texSize),0).r;
#ifdef SSRAYTRACE_SCREENSPACE_DEPTH
depth=linearizeDepth(depth,uniforms.nearPlaneZ,uniforms.farPlaneZ);
#endif
var csPosition: vec3f=computeViewPosFromUVDepth(input.vUV,depth,uniforms.projection,uniforms.invProjectionMatrix);
var csViewDirection: vec3f=normalize(csPosition);
var F0: vec3f=reflectivity.rgb;
var fresnel: vec3f=fresnelSchlickGGXVec3(max(dot(csNormal,-csViewDirection),0.0),F0, vec3f(1.));
var reflectionMultiplier: vec3f=clamp(pow(fresnel*uniforms.strength, vec3f(uniforms.reflectionSpecularFalloffExponent)),vec3f(0.0),vec3f(1.0));
#else
var reflectionMultiplier: vec3f=clamp(pow(reflectivity.rgb*uniforms.strength, vec3f(uniforms.reflectionSpecularFalloffExponent)),vec3f(0.0),vec3f(1.0));
#endif
var colorMultiplier: vec3f=1.0-reflectionMultiplier;
var finalColor: vec3f=(color.rgb*colorMultiplier)+(SSR*reflectionMultiplier);
#ifdef SSR_OUTPUT_IS_GAMMA_SPACE
finalColor=toGammaSpaceVec3(finalColor);
#endif
fragmentOutputs.color= vec4f(finalColor,color.a);
#endif
}
`;

registerPostProcessShaderInclude("pbrBRDFFunctions", pbrBRDFFunctionsWGSL);
registerPostProcessShaderInclude("screenSpaceRayTrace", screenSpaceRayTraceWGSL);
