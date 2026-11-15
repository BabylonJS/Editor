# babylonjs-editor-tools-lite — missing features

`babylonjs-editor-tools-lite` reproduces the features of `babylonjs-editor-tools` using only [Babylon Lite](https://www.npmjs.com/package/@babylonjs/lite) (`@babylonjs/lite` 1.36.0). Babylon Lite supports fewer features than Babylon.js: this file lists everything the editor can configure that is not supported, only partially supported or emulated by the tools, and the behaviors that differ from the Babylon.js version of the tools.

Legend:

- **Missing**: not supported, the feature is ignored (a warning is logged once when it is used).
- **Partial**: supported with limitations.
- **Emulated**: Babylon Lite has no equivalent, the tools reproduce the behavior on top of Babylon Lite.

## Platform

- **Intentional**: WebGPU only. There is no WebGL support, in compatibility mode or otherwise.
- **Intentional**: only the KTX2 compressed textures (`.ktx2`) are supported. The KTX1 textures generated with a format suffix (`-astc.ktx`, `-dxt.ktx`, `-pvrtc.ktx`, `-etc1.ktx`, `-etc2.ktx`) are not loaded, `configureEngineToUseCompressedTextures` and `addExcludedCompressedTexture` are removed and the offline preload ignores the `.ktx` files. KTX2 textures are enabled using `setUseKtx2CompressedTextures`.
- **Partial**: the MSAA of the scenes rendered without post-process is the MSAA of the engine (`createEngine`). When rendering pipelines render the camera, the scene is rendered with the samples of the first pipeline, as Babylon.js does (`samples` of the default rendering pipeline and of the SSR, `textureSamples` of the SSAO2, `msaaSamples` of the TAA and of the volumetric lighting), with 1 or 4 samples (the sample counts supported by WebGPU).

## Scene loading

- **Partial**: Babylon Lite renders only the registered scenes. `loadScene` registers the scene (with the support of the shadows when the scene contains shadow generators) or rebuilds its renderables when it is already registered (several editor scenes loaded in the same scene). Use `doNotRegisterScene` to register the scene yourself.
- **Partial**: the physics world must be created by the application (`createHavokWorld`) and given to `loadScene` (`physicsWorld` option): Babylon Lite scenes have no physics engine.
- **Partial**: the BRDF lookup texture required by Babylon Lite for the image based lighting is embedded in the tools (same texture as Babylon.js). It can be replaced using the `brdfUrl` option.
- **Missing**: the entities of the scene file that Babylon Lite doesn't support are not loaded: classic particle systems (`ParticleSystem`, `GPUParticleSystem`), reflection probes, lens flare systems, the effect layers saved in the scene file (glow and highlight layers: the glow layer of the default rendering pipeline is supported, see below) and legacy sounds.
- **Missing**: Babylon Lite has no collision system: the collisions of the scene, the meshes and the cameras (`collisionsEnabled`, `checkCollisions`, `ellipsoid`, collision meshes of the editor) are not applied. The physics (character controller of Babylon Lite) can be used instead.

## Meshes and geometry

- **Missing**: skeletons and skinned meshes. Babylon Lite creates skeletons only when loading glTF files: the skinned meshes of the editor scenes are displayed in their bind pose, the bones are not animated and `AdvancedAssetContainerInstantiatedEntries.skeletons` is always empty.
- **Emulated**: instanced meshes (`InstancedMesh`). Babylon Lite has no instanced mesh: each instance is a clone sharing the geometry (GPU buffers) and the material of its source mesh, available through `mesh.sourceMesh` and identified by `isInstancedMesh`. There is no GPU instancing: each instance is a draw call. Thin instances are supported.
- **Emulated**: levels of detail. The mesh to display is selected each frame using the distance to the camera, the same way Babylon.js does (`getLOD`). As with Babylon.js, the screen coverages (`lodCoverages`) are ignored. Use `getMeshLodLevels` / `setMeshLodLevelDistance` instead of `getLODLevels`.
- **Emulated**: billboard modes and infinite distance, updated each frame by the tools.
- **Emulated**: the enabled and visible states of the nodes (`setNodeEnabled`, `setMeshVisibleState`), the dispose of the nodes (`disposeNode`) and the dispose observables (`getOnDisposeObservable`).
- **Partial**: multi-materials: each sub-mesh is a mesh of its own (child of the main mesh) as Babylon Lite meshes have one material.
- **Partial**: morph targets: up to 4 targets per mesh, on PBR materials only. The morph targets are shared between the clones of a mesh (`AdvancedAssetContainer.instantiate`).
- **Missing**: mesh properties: `visibility`, `renderingGroupId`, `layerMask`, `alphaIndex` (Babylon Lite sorts the transparent meshes by distance only), `applyFog`, overlay (`renderOverlay`, `overlayColor`), outline, edges rendering.
- **Partial**: Babylon Lite doesn't cull the meshes outside of the camera frustum (except the thin instances): all the visible meshes are drawn, as with `alwaysSelectAsActiveMesh`.
- **Partial**: the meshes disabled by an asset container (`removeDefault`) stay in the scene but are not rendered: Babylon Lite disposes the meshes removed from their last scene and a disposed mesh can't be cloned anymore.

## Materials

### PBR materials

Babylon Lite PBR materials implement the glTF metallic-roughness model. The other channel layouts of Babylon.js are emulated by repacking the textures on the CPU: when the compressed textures are enabled, the original image (`.png`, `.jpg`) exported with the KTX2 texture is repacked, so the repacked textures are not compressed. A texture is used as it is when its original image can't be loaded.

- **Emulated**: the metallic textures configured with other channels than the glTF layout (metalness in blue, roughness in green, ambient occlusion in red) are repacked.
- **Emulated**: `invertNormalMapX` / `invertNormalMapY`. Babylon Lite reads the normal maps as Babylon.js does with `invertNormalMapX = true` and `invertNormalMapY = false`: the other normal maps are repacked (red and/or green channels inverted).
- **Emulated**: the specular-glossiness workflow (materials without metallic and roughness values, like the PBR materials created in the editor, which are mirrors by default). The reflectivity color is the reflectance of the material, or a specular-glossiness texture is created with the values computed by Babylon.js (reflectivity texture multiplied by the reflectivity color and the level of the texture, micro surface read from the alpha channel or computed from the reflectivity with `useAutoMicroSurfaceFromReflectivityMap`).
- **Emulated**: the alpha of the material. Babylon Lite reads the alpha from the base color texture: when the material is transparent (alpha blend or alpha test), the alpha channel of the base color texture is computed as Babylon.js computes the alpha (albedo alpha used only with `useAlphaFromAlbedoTexture` or alpha test, opacity texture read from its alpha channel or from the luminance of its color with `getAlphaFromRGB`). Without albedo texture, a white base color texture is created from the opacity texture. An opacity texture with another UV transform than the albedo texture is read with the UV transform of the albedo texture.
- **Emulated**: the skybox materials (reflection texture in skybox mode, ie. created by `scene.createDefaultSkybox`) are Babylon Lite PBR skyboxes, which display the environment of the scene: the reflection texture of the skybox is expected to be the environment texture of the scene (a warning is logged otherwise).
- **Emulated**: `disableLighting` disables the lights only (`directIntensity = 0`), the image based lighting is kept as in Babylon.js.
- **Partial**: the material plugins are partially supported: clear coat, sheen, anisotropy, iridescence and sub-surface translucency. The sub-surface refraction is not supported (Babylon.js refracts the environment texture while Babylon Lite only refracts the scene, as the glTF transmission).
- **Missing**: parallax and parallax occlusion (Babylon Lite PBR materials have no way to offset the texture coordinates), `zOffset` / `zOffsetUnits` (only the shader materials of Babylon Lite have a depth bias: the decals may z-fight), object space normal maps, micro surface texture, detail maps, hexagonal tiling, OpenPBR properties (`baseWeight`), `specularIntensity`, `ambientColor`, `reflectionColor`, the reflection texture of the materials (except the skyboxes, the environment of the scene is used), `twoSidedLighting`, `useSpecularOverAlpha` / `useRadianceOverAlpha` set to false, `useHorizonOcclusion`, `useRadianceOcclusion`, `useAmbientInGrayScale`, `ambientTextureImpactOnAnalyticalLights`, `useLogarithmicDepth`, alpha modes other than the standard blending, `disableDepthWrite` / `forceDepthWrite` / `needDepthPrePass`, `fogEnabled` per material, stencil, point size, `sideOrientation`.
- **Emulated**: the image processing configuration saved per material (`_imageProcessingConfiguration`, saved with the materials of some assets). When it isn't applied by a post-process (`applyByPostProcess = false`), Babylon.js applies the image processing of the material in the material, then the default rendering pipeline applies its own on top. Otherwise the material outputs linear colors, processed by the default rendering pipeline only. A material plugin captures the linear color of the material before the image processing of Babylon Lite and applies the one of Babylon.js: exposure, vignette, tone mapping, contrast and color curves of the material, then the image processing of the scene when the default rendering pipeline applies it. The materials without configuration keep the image processing of the scene.
    - the dithering, color grading and white balance of the material configurations are not supported (a warning is logged).
    - the unlit, sheen, sub-surface and refraction features of Babylon Lite change the color after the capture: the linear color is then recovered by inverting the image processing of Babylon Lite, which can't recover the dark tones the tone mapping crushes.
- **Emulated**: the decoding of the colors of the textures. The shaders of Babylon.js decode the color textures in gamma space (albedo, emissive, reflectivity, reflectance, sheen, lightmap) with the sRGB curve approximated by a 2.2 power, darker in the dark tones than the exact curve of the GPU. The GPU decodes the textures loaded in a sRGB buffer (`_useSRGBBuffer`, the textures imported from glTF files, whose `gammaSpace` is false). The albedo textures in gamma space use the gamma albedo of Babylon Lite (same decoding), the textures in a sRGB buffer are loaded as sRGB textures, and the other color textures are repacked so Babylon Lite (GPU or shaders) decodes them to the same values, with a 8 bits precision.
- **Partial**: the metallic reflectance (`metallicF0Factor`, `metallicReflectanceColor` and their textures). The PBR materials of Babylon.js use the legacy specular energy conservation by default (`brdf.useLegacySpecularEnergyConservation`): the reflectance at grazing angles (F90) is `metallicF0Factor`, metals included. Babylon Lite uses `mix(metallicF0Factor, 1, metallic)` (the non legacy model of Babylon.js) and has no option for the legacy one: the metallic materials with a `metallicF0Factor` lower than 1 are brighter at grazing angles.

### Standard materials

- **Partial**: supported channels: diffuse, ambient, specular (color, power, texture), emissive, bump (`invertNormalMapX` / `invertNormalMapY` emulated by repacking the normal map), opacity, 2D reflection texture, lightmap, alpha, alpha cutoff, back-face culling, `disableLighting`.
- **Emulated**: the alpha of the diffuse texture used for the alpha blending (`useAlphaFromDiffuseTexture`): Babylon Lite reads it for the alpha test only, the diffuse texture is set as the opacity texture too (combined with the opacity texture of the material, if any). When a transparency mode is set, the alpha cutoff is divided by the alpha of the material, as Babylon.js then tests the alpha of the material multiplied by the alpha of the diffuse texture.
- **Emulated**: `disableLighting`: Babylon Lite outputs the emissive color multiplied by the diffuse color while Babylon.js outputs their sum (plus the ambient color): the colors are combined when the material has no emissive texture.
- **Missing**: cube reflection and refraction textures (Babylon Lite standard materials only accept cube textures made of six images while the editor saves `.env` and `.hdr` cube textures), skyboxes (reflection texture in skybox mode), Fresnel parameters, parallax, `twoSidedLighting`, alpha modes, `fogEnabled` per material, material plugins.

### Node materials

Node materials are compiled by the node material parser of Babylon Lite.

- **Partial**: the blocks not supported by Babylon Lite make the material fail to compile: the meshes use the default material.
- **Missing**: node materials don't receive the cascaded shadows (only the exponential and PCF shadows).
- **Partial**: the names of the blocks starting with a digit (ie. `2π`, `0.5`) are prefixed by `_` (Babylon Lite generates invalid WGSL identifiers for them).
- **Partial**: the node material compiler of Babylon Lite can generate gigantic shaders for some graphs (shared expressions are not stored in temporary variables). The shaders larger than `maxNodeMaterialShaderLength` (2 000 000 characters) are rejected to avoid freezing the page: the meshes use the default material.
- **Partial**: a texture of a node material that can't be loaded is replaced by a white texture (Babylon Lite requires a texture for each texture block).
- **Partial**: `convertToGammaSpace` of the texture blocks converts the textures in gamma space too (Babylon.js only converts the textures in linear space). `convertToLinearSpace` behaves as in Babylon.js (the textures are repacked when needed).

### Other materials

- **Emulated**: `SkyMaterial` is rendered by a shader material implementing the same sky model (Preetham), with the same properties (`luminance`, `turbidity`, `inclination`, etc.). The fog and the dithering of the sky material are not supported. As with Babylon.js, the sky is not used for the image based lighting (`loadSkyEnvironment` can be used to generate the environment from a sky material).
- **Missing**: the other materials of the materials library available in the editor (cell, fire, gradient, grid, lava, normal, tri-planar and water materials): the meshes use the default material.

## Textures

- **Missing**: the cube textures used by the materials (except the PBR skyboxes, see above), mirror and render target textures, video textures, procedural textures.
- **Partial**: texture transforms: `uScale`, `vScale`, `uOffset`, `vOffset` and `wAng` (the rotation around the center is converted to the rotation around the origin of Babylon Lite). `uAng` and `vAng` (3D rotations) are not supported.
- **Partial**: `applyTexturesQuality` loads the textures again with the new quality (Babylon Lite textures are immutable), repacked textures included.
- **Partial**: the offline database (`setupOfflineProvider`) stores and loads the files requested by the tools (scenes, geometries, textures, sounds) through `addFileLoaderOverride`: the files loaded by your own code with `fetch` don't use the database.

## Lights and shadows

- **Partial**: point, spot, directional and hemispheric lights. `radius`, projection textures, `falloffType`, `lightmapMode` and `renderPriority` are not supported.
- **Partial**: clustered lights: the clustered point and spot lights are plain data in Babylon Lite: the tools create a node for each of them (`ClusteredLightNode`) that the clustered light follows each frame. The clustered lights only light the PBR materials. The clustered light container is added once the scene has an active camera.
- **Missing**: the shadows of the point lights.
- **Partial**: shadow generators: PCF (directional and spot lights), exponential shadow maps (directional lights, the exponential shadow maps of the spot lights are rendered as PCF shadow maps) and cascaded shadow maps (directional lights). Contact hardening shadows (PCSS), Poisson sampling, `filteringQuality`, `transparencyShadow`, `forceBackFacesOnly`, `penumbraDarkness`, `depthClamp`, `autoCalcDepthBounds`, `blurBoxOffset`, the shadow frustum settings of the directional lights (`shadowOrthoScale`, `shadowFrustumSize`, `autoUpdateExtends`, ortho extents) and the `refreshRate` of the shadow maps are not supported.
- **Emulated**: the casters of the shadows are evaluated as the render list predicate of the Babylon.js version of the tools (all the meshes within the range of the light), every few frames instead of each frame. The skyboxes (sky materials and PBR skyboxes) are excluded: their huge bounds break the fitting of the cascaded shadow maps of Babylon Lite.
- **Partial**: changing the quality of the shadows (`applyShadowsQuality`) creates the shadow generators again and rebuilds the renderables of the scene.

## Cameras and inputs

- **Partial**: free, universal, target, touch and gamepad cameras are loaded as Babylon Lite free cameras, arc rotate cameras as arc rotate cameras. Other cameras (follow, VR, XR, etc.) are not supported.
- **Missing**: camera inputs configuration (keys, mouse, touch and gamepad settings), `upVector` (roll), `lockedTarget`, `layerMask`, the other properties of the arc rotate cameras (`targetScreenOffset`, `allowUpsideDown`, `panningOriginTarget`, etc.).
- **Partial**: `attachCameraControl` attaches the default inputs of Babylon Lite (orbit for arc rotate cameras, WASD / arrows and mouse look for free cameras).
- **Emulated**: the pointer and keyboard events of the scene (`onPointerObservable`, `onKeyboardObservable`, `PointerEventTypes`, `KeyboardEventTypes`) and the picking of the pointer events (`pickScene`).

## Animations

- **Emulated**: animation groups (`EditorAnimationGroup`) and animations (`EditorAnimation`). The values are evaluated the same way Babylon.js does (linear, step and Hermite interpolations, spherical interpolation of quaternions, easing function) and the playback (range, speed, loop modes, events) is handled by the tools: Babylon Lite animations support neither Hermite tangents nor events.
- **Missing**: animation blending (`enableBlending`, `blendingSpeed`), weights and additive animations (`weight`, `isAdditive` are kept but not applied), animation masks, `playOrder`, the `Animatable` API, the easing function classes of Babylon.js (use a function `(gradient) => number`).
- **Missing**: bones animations (no skeletons).
- **Partial**: matrices are not interpolated (same as Babylon.js by default).

## Rendering pipelines and post-processes

The rendering pipelines are rendered by the frame graph tasks of the tools: the scene must be created using `createEditorSceneContext`. The scenes created with the default render task of Babylon Lite are rendered without post-processes: only the exposure, the contrast and the tone mapping apply (to the materials, not to the clear color).

- **Emulated**: the default rendering pipeline (`rendering/default`), the SSAO2 (`rendering/ssao`), SSR (`rendering/ssr`) and TAA (`rendering/taa`) rendering pipelines and the motion blur post-process (`rendering/motion-blur`) are custom implementations of the pipelines of Babylon.js 9.27 with WebGPU: same passes, same sizes, formats and samplers of the textures, same order (`renderingPipelinesOrder`) and the WGSL shaders of Babylon.js, run through an adapter reproducing the conventions of Babylon.js (render targets stored upside down, texture and fragment coordinates with their origin at the bottom-left corner). They have the properties and the options of the Babylon.js pipelines and were compared pixel by pixel with Babylon.js (WebGPU, or WebGL2 where Babylon.js fails with WebGPU): the remaining differences are a few 1/255 on a fraction of the pixels, as for the scenes rendered without post-process.
    - default rendering pipeline: image processing (exposure, contrast, tone mapping, vignette, color curves, color grading, white balance, dithering), bloom, depth of field, chromatic aberration, sharpen, grain, FXAA and glow layer. As with Babylon.js, the materials output linear colors when the image processing is applied by the post-process.
    - SSAO2: same random texture and sample sphere, generated using `Math.random` as Babylon.js does (the noise differs from one run to the other, as with Babylon.js), expensive and legacy blurs.
    - SSR: all the options, including the thickness computed from the depth of the back faces, the blur, the attenuations, the environment texture (`ISSREnvironmentTexture`, a cube texture of Babylon Lite), the screen space depth (`useScreenspaceDepth`) and the debug output.
    - TAA: same Halton sequence, history (ping-pong textures), `clampHistory` and `reprojectHistory`. The projection is jittered by offsetting the view projection matrix of the scene, the same way Babylon.js jitters the projection matrix of the camera, including its behaviors: no new jitter while the camera moves, and no jitter at all when the TAA isn't the first post-process of the camera (see "Babylon.js issues found while porting").
    - motion blur: object based (velocity of the meshes, `motionBlurSamples`, `motionStrength`) and screen based (depth of the scene and previous view projection of the camera), scaled by the time elapsed since the previous frame as Babylon.js does (`scene.getAnimationRatio()`).
    - glow layer (`glowLayerEnabled`, `GlowLayer`): the meshes are drawn into the glow map with the color of their glow (emissive color and texture, alpha, alpha test and blending of the PBR and standard materials, as Babylon.js computes them), the glow map is blurred twice and added to the color of the scene before the post-processes. The meshes using another material (node materials, sky materials) are drawn with the neutral color, as Babylon.js does.
- **Partial**: the geometry textures of the pre-pass renderer read by the SSAO2 and the SSR (depth, normals, reflectivity) are rendered by geometry renderer tasks of Babylon Lite. As with Babylon.js, the transparent meshes are drawn after the opaque meshes, sorted from back to front, and write the geometry where their alpha is greater than their alpha cutoff (PBR materials) or 0.4 (standard materials). The differences: the alpha of the PBR materials doesn't include the luminance of the specular and radiance (`useSpecularOverAlpha`, `useRadianceOverAlpha`) and the alpha channel of the reflectivity (roughness) is blended as the color while Babylon.js adds the alphas.
- **Emulated**: the velocity of the pre-pass renderer (object based motion blur, reprojection of the TAA) is rendered by the tools, the same way Babylon.js computes it (world matrices and view projection of the previous frame, encoded or linear velocity, alpha of the transparent meshes): the geometry renderer tasks of Babylon Lite compute the motion of the camera only (see "Babylon Lite issues found while porting"). The screen space depth of the pre-pass (SSR `useScreenspaceDepth`) and the depth renderers of Babylon.js (depth of field, back faces of the SSR with `backfaceForceDepthWriteTransparentMeshes`) are rendered the same way: the geometry renderer tasks of Babylon Lite run the whole shaders of the materials to render a depth. These meshes are drawn from their GPU buffers (positions, texture coordinates, vertex colors, thin instances): the morph targets, the skeletons and the baked vertex animations are not applied (`excludeSkinnedMesh` has no effect), and the thin instances keep the velocity of their mesh (the previous matrices of the instances are not tracked). As with the TAA material manager of Babylon.js, the jitter of the reprojection offsets the vertices of the pre-pass once the velocity is computed.
- **Partial**: motion blur: rendered at the size of the rendering (the `options` ratio of the constructor is not supported).
- **Partial**: glow layer: the glow map is drawn from the GPU buffers of the meshes (positions, texture coordinates, vertex colors, thin instances): the morph targets, the skeletons and the baked vertex animations are not applied. `referenceMeshToUseItsOwnMaterial`, the rendering groups other than the default one, the MSAA of the glow map (`mainTextureSamples`) and the blend modes of the merge other than "add" and "combine" are not supported. The emissive textures of the PBR materials are loaded a second time for the glow: Babylon Lite decodes them as sRGB textures, whose mipmaps are computed in linear space.
- **Emulated**: color grading: the `.3dl` lookup tables (`ColorGradingTexture`) and the 2D lookup textures are sampled as 3D textures. The 2D lookup textures are converted when loaded: changing `colorGradingWithGreenDepth` afterwards has no effect. The 2D lookup textures were compared with Babylon.js using WebGL2 (they fail with WebGPU, see below).
- **Partial**: volumetric lighting rendering pipeline (`rendering/volumetric`), ported from the Babylon.js version of the tools with the same configuration, the same configuration per light (`light.metadata.volumetricLighting`, clustered lights included), the same selection of the lights and the same shaders (raymarching, temporal accumulation, bilateral blur, composition and debug outputs). The differences:
    - Babylon Lite has no shadows for the point lights: the point lights casting volumetric shadows are occluded using the depth buffer, as the Babylon.js version does for the lights without shadow map.
    - the depth of the scene is stored in half floats: the surfaces further than 65504 units are considered as the sky.
    - `depthSource`: as with the Babylon.js version, the depth is read from the pre-pass when another pipeline renders it (SSAO2, SSR, motion blur, reprojection of the TAA). Otherwise the depth of all the surfaces is rendered by a geometry renderer task (`GeometryBuffer`), while the Babylon.js version then renders the opaque and alpha tested surfaces with a depth renderer (when the scene has no geometry buffer renderer).
- **Missing**: volumetric light scattering post-process. Its configuration functions are kept and return `null`.
- **Missing**: `sortCameraPostProcesses` / `keepRenderingPipelinesOrdered` do nothing: the order of the post-processes is fixed (`renderingPipelinesOrder`).

## Sounds

- **Partial**: sound nodes are played using the audio engine of Babylon Lite (static sounds, spatial sounds, volume, playback rate). The spatial sounds follow their node once the listener is attached (`attachAudioListener`, equivalent of `audioEngine.listener.attach`).
- **Partial**: changing `playbackRate` applies the next time the sound is played.

## Sprites

- **Partial**: sprite managers are rendered by the billboard sprite systems of Babylon Lite. The packed atlases (`.json`) and the grid atlases are supported, the sprite animations, `cellIndex` / `cellRef`, `invertU` / `invertV`, `angle`, `color`, `width` / `height` and `isVisible` too.
- **Missing**: sprite maps (`SpriteMap`), the picking of the sprites, the blend modes and depth options of the sprite managers.

## Particles

- **Partial**: node particle system sets are supported using the node particles of Babylon Lite.
- **Missing**: `ParticleSystem` and `GPUParticleSystem`. `@particleSystemFromScene` resolves only the node particle systems.

## Physics

- **Partial**: physics aggregates are configured as the Babylon.js version of the tools does (shape, mass properties, motion type, friction and restitution) using Havok. The density of the shapes is not supported by Babylon Lite.
- **Missing**: ragdolls (`applyRagdollJointLimits` is removed, the ragdoll configurations can still be parsed).

## Navigation

- **Partial**: the navmesh assets (`.navmesh`) import the data baked by the editor (`navmesh.bin`, `tilecache.bin`) in a navigation plugin of Babylon Lite. Babylon Lite has no public function to import baked navmesh data: the data is imported through the Recast module used by Babylon Lite. When the module is not available, the navmesh is built at runtime from the static meshes and the removal of the isolated areas is not applied.
- **Partial**: the navigation plugin is a Babylon Lite `NavigationPlugin` (functional API: `computePath`, `createNavCrowd`, etc.) instead of the Babylon.js `RecastJSPlugin`.

## GUI

- **Missing**: Babylon.js GUI (`AdvancedDynamicTexture`, `.gui` files): Babylon Lite has no GUI system. `@guiFromAsset` assigns `null` and the `gui` asset parser logs an error.

## Scripts, decorators and asset containers

- **Partial**: scripts receive Babylon Lite objects (plain data): they must use the Babylon Lite API. All the decorators are supported (except the GUI, see above).
- **Partial**: `AdvancedAssetContainer.instantiate` clones the nodes (`doNotInstantiate` is ignored), copies the states kept by the tools (class names, enabled and visible states, levels of detail, behaviors, sounds) and clones the cameras. The clones have no physics aggregate (same as Babylon.js).
- **Missing**: `AdvancedAssetContainer.container` (Babylon Lite has no asset container): use `entities`, `getNodes()` and `dispose()`.

## Gaussian splatting

- **Partial**: gaussian splatting meshes are created from the splats data saved by the editor, one Babylon Lite gaussian splatting mesh per proxy. The spherical harmonics are not supported (Babylon Lite reads them only when loading splat files with `loadSplat`).

## Behavior differences with babylonjs-editor-tools

These behaviors of the Babylon.js version of the tools are not reproduced on purpose:

- the assets of the scripts that fail to load are not loaded again forever (the preload loop of the Babylon.js version never ends when an asset fails to load).
- `applyScriptOnObject` stops calling `onUpdate` once the object is disposed.
- when an asset container is instantiated, the script values referencing another node of the container always reference the instantiated node.

## Babylon Lite issues found while porting

- the node material compiler doesn't store shared expressions in temporary variables (a 400 blocks graph generated a 10 MB shader that freezes the page).
- the node material compiler generates invalid WGSL identifiers for the block names starting with a digit.
- `loadBabylon` applies the Euler rotations in XYZ order while Babylon.js uses the yaw-pitch-roll (YXZ) order.
- `addClusteredLightContainer` throws when the scene has no camera yet.
- the chromatic aberration post-process uses a V axis pointing down (Babylon.js uses a V axis pointing up for `direction` and `centerPosition`).
- the standard materials with `disableLighting` output `emissive * diffuse` while Babylon.js outputs `diffuse + emissive + ambient`, and they don't use the alpha of the diffuse texture for the alpha blending (both emulated by the tools).
- a scene with a cascaded shadow generator (directional light) and a PCF shadow generator (spot light) renders nothing: every frame fails with an invalid bind group ("binding index 3 not present in the bind group layout"), also without the tools.
- the PBR materials have no legacy specular energy conservation (`useLegacySpecularEnergyConservation` of Babylon.js, enabled by default): the F90 of the metallic reflectance is always `mix(specularWeight, 1, metallic)`.
- the geometry shaders of the standard materials (geometry renderer task) replace the first `return color;` of the fragment shader by the geometry outputs: when the code of a material plugin contains `return color;` (in a helper function), the shader fails to compile (the plugins of the tools avoid it).
- the velocity rendered by the geometry renderer (`LINEAR_VELOCITY`) is not exactly 0 for the static meshes when the camera doesn't move: the current and previous clip positions are computed with identical matrices but differ by up to 1e-5 (in normalized device coordinates) near the camera on large triangles.
- the velocity rendered by the geometry renderer for the PBR materials only includes the motion of the camera (`previousViewProjection * worldPosition`): the motion of the meshes is ignored (the standard materials use the previous world matrix of the mesh).
- the geometry renderer tasks run the whole shaders of the materials (lights, shadows, image based lighting) even when only a depth is requested: rendering a depth costs about as much as rendering the scene (the tools render the depths with their own shaders).
- the material plugins can't change the color of the PBR materials before the fog and the image processing: `CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION` is injected in the middle of the fragments sorted by name (before the unlit, sheen, sub-surface and refraction fragments), and `CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR` runs after the image processing.

## Babylon.js issues found while porting

- with WebGPU, the image processing fails to compile when the color grading uses a 2D lookup texture: the WGSL version of the "imageProcessingFunctions" shader calls `textureSample(txColorTransform, sampler, vec3, vec2)` instead of the `sampleTexture3D` function of the GLSL version.
- the `.babylon` loader doesn't import the module registering `TransformNode.Parse`: the scenes with transform nodes stop loading after the multi-materials, unless the application imports `@babylonjs/core/Meshes/transformNode` (or the whole `@babylonjs/core`). The error is not reported: `SceneLoader` ignores the error the plugin reports when it returns `true`.
- with WebGPU, the SSR fails to compile with `attenuateBackfaceReflection`: the WGSL version of `computeAttenuationForIntersection` calls `texelFetch(normalSampler, hitPixel, 0)` (GLSL function, undefined variable) instead of `textureLoad(normalSampler, vec2<i32>(ihitPixel), 0)`.
- the TAA only jitters the camera when it is the first post-process of the camera: when another post-process renders before it (default rendering pipeline, SSAO2, SSR, volumetric lighting), the TAA jitters the projection matrix after the scene is drawn, and each render target rendered before the next frame is drawn (shadow maps, depth renderers, and the tile mask of the clustered light container that the Babylon.js version of the tools creates for each scene) computes the projection matrix again (`getProjectionMatrix(true)` in `ObjectRenderer.initRender`), removing the jitter: the TAA then blends frames without anti-aliasing them. The tools reproduce this behavior.
- with WebGPU, the reprojection of the TAA (`reprojectHistory`) makes the PBR materials using a normal map without tangents or receiving cascaded shadows exceed the 16 inter-stage variables allowed by default (`maxInterStageShaderVariables`): their render pipelines are invalid and the meshes are not drawn.
- with WebGPU, the prepass renderer of a scene using SSAO2, the motion blur and the TAA together exceeds `maxColorAttachmentBytesPerSample` (34 bytes for 32): Babylon.js doesn't request the higher limit the adapter supports.
- with WebGPU, the object based motion blur makes the PBR materials receiving cascaded shadows exceed the 16 inter-stage variables allowed by default (velocity of the pre-pass, same as the reprojection of the TAA): the meshes are not drawn.
