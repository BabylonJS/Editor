// Attributes
attribute vec3 position;
attribute vec4 color;
attribute vec3 options;
attribute vec2 size;
attribute float cellIndex;

// Varyings
varying vec2 vUV;
varying vec4 vColor;

// Uniforms
uniform mat4 view;
uniform mat4 projection;
uniform vec3 particlesInfos;

#ifdef CLIPPLANE
uniform vec4 vClipPlane;
uniform mat4 invView;
varying float fClipDistance;
#endif

// Main
void main(void)
{
    vec3 viewPos = (view * vec4(position, 1.0)).xyz;
    vec2 cornerPos;
    float angle = options.x;
    vec2 offset = options.yz;
    cornerPos = vec2(offset.x - 0.5, offset.y - 0.5) * size;

    vec3 rotatedCorner;
    rotatedCorner.x = cornerPos.x * cos(angle) - cornerPos.y * sin(angle);
    rotatedCorner.y = cornerPos.x * sin(angle) + cornerPos.y * cos(angle);
    rotatedCorner.z = 0.;

    viewPos += rotatedCorner;
    gl_Position = projection * vec4(viewPos, 1.0);
    vColor = color;
    
#ifdef ANIMATESHEET
    float rowOffset = floor(cellIndex / particlesInfos.z);
    float columnOffset = cellIndex - rowOffset * particlesInfos.z;
    vec2 uvScale = particlesInfos.xy;
    vec2 uvOffset = vec2(offset.x, 1.0 - offset.y);
    vUV = (uvOffset + vec2(columnOffset, rowOffset)) * uvScale;
#else
    vUV = offset;
#endif

#ifdef CLIPPLANE
    vec4 worldPos = invView * vec4(viewPos, 1.0);
    fClipDistance = dot(worldPos, vClipPlane);
#endif
}