precision highp float;

// Constants
uniform vec3 vEyePosition;
uniform vec4 vBaseColor;

// Input
varying vec3 vPositionW;

#ifdef NORMAL
varying vec3 vNormalW;
#endif

#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif

// Helper functions
#include<helperFunctions>

// Lights
#include<__decl__lightFragment>[0..maxSimultaneousLights]

#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>

// Samplers
#ifdef TEXTURE
varying vec2 vUV;
uniform sampler2D diffuseSampler;
uniform vec2 diffuseSamplerInfos;

uniform sampler2D otherSampler;
#endif

#include<clipPlaneFragmentDeclaration>

// Fog
#include<fogFragmentDeclaration>

void main(void) {
#include<clipPlaneFragment>

	vec3 viewDirectionW = normalize(vEyePosition - vPositionW);

	// Base color
	vec4 baseColor = vec4(1., 1., 1., 1.);
	vec3 diffuseColor = vBaseColor.rgb;

	// Alpha
	float alpha = vBaseColor.a;

#ifdef TEXTURE
	baseColor = texture2D(diffuseSampler, vUV);
	baseColor *= texture2D(otherSampler, vUV);

#ifdef ALPHATEST
	if (baseColor.a < 0.4)
		discard;
#endif

#include<depthPrePass>

	baseColor.rgb *= diffuseSamplerInfos.y;
#endif

#ifdef VERTEXCOLOR
	baseColor.rgb *= vColor.rgb;
#endif

	// Normal
#ifdef NORMAL
	vec3 normalW = normalize(vNormalW);
#else
	vec3 normalW = vec3(1.0, 1.0, 1.0);
#endif

	// Lighting
	vec3 diffuseBase = vec3(0., 0., 0.);
    lightingInfo info;
	float shadow = 1.;
    float glossiness = 0.;

#ifdef SPECULARTERM
	vec3 specularBase = vec3(0., 0., 0.);
#endif    
#include<lightFragment>[0..maxSimultaneousLights]

#ifdef VERTEXALPHA
	alpha *= vColor.a;
#endif

	vec3 finalDiffuse = clamp(diffuseBase * diffuseColor, 0.0, 1.0) * baseColor.rgb;

	// Composition
	vec4 color = vec4(finalDiffuse, alpha);

#include<fogFragment>

	gl_FragColor = color;
}
