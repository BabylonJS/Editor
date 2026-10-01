# Loading scenes (`loadScene`)

`loadScene` appends a scene saved by the editor (a `.babylon` file) into an existing Babylon.js `Scene`,
then reconstructs everything the editor configured and re-attaches scripts.

```ts
async function loadScene(
    rootUrl: string,
    sceneFilename: string,
    scene: Scene,
    scriptsMap: ScriptMap,
    options?: SceneLoaderOptions
): Promise<void>;
```

| Argument | Meaning |
| --- | --- |
| `rootUrl` | Base URL/folder containing the scene and its assets (e.g. `"/scene/"`, or `"./scene/"` in the Electron template). |
| `sceneFilename` | The `.babylon` filename (e.g. `"example.babylon"`). |
| `scene` | An already-created Babylon.js `Scene`. |
| `scriptsMap` | The generated map from `src/scripts.ts` (see writing-scripts.md). |
| `options` | Optional `SceneLoaderOptions` (quality, progress, post-processing). |

## What it does

Beyond appending the file, `loadScene`:

- Registers parsers for meshes, audio, textures, shadow generators, morph targets, sprite managers/maps, and
  node particle system sets.
- Waits until the scene is fully ready (textures, delayed-load items).
- Preloads all assets linked to scripts (e.g. via `@visibleAsAsset`), looping until none remain — unless
  `skipAssetsPreload` is set.
- Configures clustered lights, shadow map refresh/render-list predicates, mesh LOD quality, and
  distance/screen-coverage LOD switching.
- Applies the saved rendering/post-processing configuration to the active camera.
- Applies physics gravity from scene metadata and creates the physics bodies configured on meshes and
  transform nodes (physics must be enabled on the scene **before** calling `loadScene`).
- Instantiates and attaches every script to the scene, transform nodes, meshes, lights (including the lights
  of clustered light containers), cameras and sprites.

## `SceneLoaderOptions`

```ts
type SceneLoaderQualitySelector = "very-low" | "low" | "medium" | "high";

type SceneLoaderOptions = {
    /** Overall quality (affects texture dimensions, shadows, LODs). Default "high". */
    quality?: SceneLoaderQualitySelector;
    /** Override quality for textures only (takes priority over `quality`). */
    texturesQuality?: SceneLoaderQualitySelector;
    /** Override quality for shadows only. */
    shadowsQuality?: SceneLoaderQualitySelector;
    /** Override quality for LODs only. */
    lodsQuality?: SceneLoaderQualitySelector;
    /** Selectively disable post-processes when applying the camera rendering config. */
    postProcessConfiguration?: IApplyRenderingConfigurationOptions;
    /** Progress callback in [0, 1]. */
    onProgress?: (value: number) => void;
    /** Skip preloading of script-linked assets. Default false. */
    skipAssetsPreload?: boolean;
};
```

`postProcessConfiguration` (`IApplyRenderingConfigurationOptions`) lets you turn off the saved post-processes
on low-end devices, or change the MSAA samples:

```ts
{
    msaaSamples?: number;
    defaultPipelineDisabled?: boolean;
    ssao2Disabled?: boolean;
    ssrDisabled?: boolean;
    motionBlurDisabled?: boolean;
    vlsDisabled?: boolean;
    volumetricLightingDisabled?: boolean;
    taaDisabled?: boolean;
}
```

Lower quality levels reduce memory and improve performance (especially on mobile): the editor precomputes
`high` (untouched), `medium` (half-size textures), and `low` (quarter-size). `very-low` is even more
aggressive on shadows and LODs.

## Terrains

Support for terrains (the `TerrainMesh` nodes sculpted and painted in the editor) is **not** included by default, for
tree-shaking purposes: like Gaussian Splatting, it is registered by importing its file once in the code of the app,
before `loadScene`:

```ts
import "babylonjs-editor-tools/loading/terrain";
```

The import registers the parser of the terrains and `TerrainMaterialPlugin`; `loadScene` then waits for the weight
maps (the painted layers) and the layer textures. Don't rely on `src/scripts.ts` for it: the file written when the
project is played in the editor imports every plugin, the one written by `babylonjs-editor-cli pack` (Generate)
imports none. Without the import, a scene that contains a terrain is not loaded entirely: Babylon.js logs
`BABYLON.TerrainMaterialPlugin not found, you may have missed an import.` and stops parsing the scene at the terrain
material (its meshes are missing). What matters:

- Terrains are exported as a `GroundMesh` flagged `isTerrainMesh`: the parser sets `mesh.isTerrainMesh` on them
  (`isTerrainMesh(mesh)`) and repairs their `GroundMesh` internals so their heights match the relief. Other loaders
  (e.g. the Babylon.js sandbox) still get a ground.

- `texturesQuality` (or `quality`) also scales the terrain layer textures: `high` full size, `medium` half,
  `low` and `very-low` a quarter (at least 128 px). Weight maps are data: they are never downscaled or
  compressed.
- Nothing to set for the weight maps: games free their CPU copy once they are on the GPU (4 MB per 1024 × 1024
  map) and load them again from their files after a WebGL context loss. Only a game that reads or paints them at
  runtime (`getWeightMap`, `updateWeightMapRegion`) sets `TerrainMaterialPlugin.KeepWeightMapData = true` **before**
  `loadScene`, like the editor does.
- `engine.doNotHandleContextLost = true` (or the `doNotHandleContextLost` engine option) keeps no CPU copy of the
  textures for the recovery of a lost WebGL context: it saves 64 MB for 8 layers of 1024 px, but the page must be
  reloaded after a context loss. Meant for memory-constrained devices (mobile).
- Terrain layers need WebGL2 or WebGPU (WebGL1 renders the relief with the plain PBR material). Scenes with
  terrains also load on a `NullEngine` (servers, tests), without GPU work.
- Read heights with `getTerrainHeightAtCoordinates` (see [runtime-helpers.md](runtime-helpers.md#terrains)).

```ts
import { loadScene } from "babylonjs-editor-tools";

import "babylonjs-editor-tools/loading/terrain";

await loadScene("/scene/", "example.babylon", scene, scriptsMap, {
    quality: "high",
    texturesQuality: "medium", // Terrain layer textures at half size.
});
```

## Typical bootstrap

This is how the templates wire it up (vanilla JS template, abridged):

```ts
import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import HavokPhysics from "@babylonjs/havok";

import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Loading/Plugins/babylonFileLoader";
// ... other side-effect imports for cameras, lights, materials, physics, etc.

import { loadScene } from "babylonjs-editor-tools";
import { scriptsMap } from "./scripts";

const engine = new Engine(canvas, true, { stencil: true, antialias: true, audioEngine: true });
const scene = new Scene(engine);

const havok = await HavokPhysics();
const physicsPlugin = new HavokPlugin(true, havok);
// Scenes are in centimeters: Havok limits the linear velocity to 200 units/s by default, which is only 2 m/s.
physicsPlugin.setVelocityLimits(200 * 100, 100);
scene.enablePhysics(new Vector3(0, -981, 0), physicsPlugin);

SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;
await loadScene("/scene/", "example.babylon", scene, scriptsMap, { quality: "high" });

scene.activeCamera?.attachControl();
engine.runRenderLoop(() => scene.render());
```

Notes:

- Gravity uses `-981` because the editor works in **centimeters** (≈ 9.81 m/s² → 981 cm/s²), and the
  velocity limits of Havok are raised for the same reason — without it, fast bodies are capped at 2 m/s.
- The many `import "@babylonjs/core/..."` side-effect imports register the engine features the saved scene
  needs; keep the ones your scene uses.
- `SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true` ensures meshes fully resolve their delayed
  load state.

## Loading sub-scenes / containers

To load a `.scene` you want to instantiate (rather than append into the main scene), use the `@sceneAsset`
decorator and the `AdvancedAssetContainer` API — see [scene-containers.md](scene-containers.md). Their terrains
are set up like the ones of the main scene, as are the terrain materials loaded with `loadMaterialFromFile`.
