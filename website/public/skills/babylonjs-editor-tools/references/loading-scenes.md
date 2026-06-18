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
| `rootUrl` | Base URL/folder containing the scene and its assets (e.g. `"/scene/"`). |
| `sceneFilename` | The `.babylon` filename (e.g. `"example.babylon"`). |
| `scene` | An already-created Babylon.js `Scene`. |
| `scriptsMap` | The generated map from `src/scripts.ts` (see writing-scripts.md). |
| `options` | Optional `SceneLoaderOptions` (quality, progress, post-processing). |

## What it does

Beyond appending the file, `loadScene`:

- Registers parsers for audio, textures, shadow generators, morph targets, sprite managers/maps, and node
  particle system sets.
- Waits until the scene is fully ready (textures, delayed-load items).
- Preloads all assets linked to scripts (e.g. via `@visibleAsAsset`), looping until none remain — unless
  `skipAssetsPreload` is set.
- Configures clustered lights, shadow map refresh/render-list predicates, mesh LOD quality, and
  distance/screen-coverage LOD switching.
- Applies the saved rendering/post-processing configuration to the active camera.
- Applies physics gravity from scene metadata.
- Instantiates and attaches every script to the scene, transform nodes, meshes, lights, cameras and sprites.

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

Lower quality levels reduce memory and improve performance (especially on mobile): the editor precomputes
`high` (untouched), `medium` (half-size textures), and `low` (quarter-size). `very-low` is even more
aggressive on shadows and LODs.

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
scene.enablePhysics(new Vector3(0, -981, 0), new HavokPlugin(true, havok));

SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;
await loadScene("/scene/", "example.babylon", scene, scriptsMap, { quality: "high" });

scene.activeCamera?.attachControl();
engine.runRenderLoop(() => scene.render());
```

Notes:

- Gravity uses `-981` because the editor works in **centimeters** (≈ 9.81 m/s² → 981 cm/s²).
- The many `import "@babylonjs/core/..."` side-effect imports register the engine features the saved scene
  needs; keep the ones your scene uses.
- `SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true` ensures meshes fully resolve their delayed
  load state.

## Loading sub-scenes / containers

To load a `.scene` you want to instantiate (rather than append into the main scene), use the `@sceneAsset`
decorator and the `AdvancedAssetContainer` API — see [scene-containers.md](scene-containers.md).
