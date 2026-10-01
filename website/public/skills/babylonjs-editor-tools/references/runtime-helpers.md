# Runtime helpers

Functions and types exported by `babylonjs-editor-tools` besides the decorators. They are used from scripts
(usually in `onStart`/`onUpdate`) or from the app bootstrap.

---

## Finding and attaching scripts

```ts
getScriptByClassForObject(object, ScriptClass): InstanceType<ScriptClass> | null
getAllScriptsByClassForObject(object, ScriptClass): InstanceType<ScriptClass>[]
applyScriptOnObject(object, ScriptClass, scene?): InstanceType<ScriptClass>
```

- `getScriptByClassForObject` returns the instance of the script of that class attached to the given object
  (a mesh, a transform node, the scene...). Use it to talk to the script of a specific object; use
  `@componentFromScene` for a script that exists once in the scene.
- `applyScriptOnObject` attaches a script **at runtime** (e.g. to a mesh spawned by code) and returns its
  instance. `onStart` runs before the next frame and `onUpdate` every frame, both without arguments. There are no
  editor values for this object: `@visibleAs*` properties keep their initializers.
- `scriptsDictionary` (`Map<object, registered scripts>`) holds every script instance by object.

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { applyScriptOnObject, getScriptByClassForObject, nodeFromScene } from "babylonjs-editor-tools";

import DoorComponent from "./door";
import EnemyAIComponent from "./enemy-ai";

export default class LevelComponent {
    @nodeFromScene("Door")
    private _door: Mesh | null = null;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        getScriptByClassForObject(this._door, DoorComponent)?.open();

        const enemy = this.mesh.clone("enemy", null)!;
        applyScriptOnObject(enemy, EnemyAIComponent);
    }
}
```

## Cinematics

A `.cinematic` asset (made in the editor's cinematic editor) is linked with `@visibleAsAsset("cinematic", ...)`,
which gives the raw data. Turn it into a playable `Cinematic` (an `AnimationGroup` that also raises the events
of the cinematic):

```ts
parseCinematic(data: ICinematic, scene: Scene): ICinematic
generateCinematicAnimationGroup(cinematic: ICinematic, scene: Scene, options?: { ignoreSounds?: boolean }): Cinematic
```

```ts
const cinematic = generateCinematicAnimationGroup(parseCinematic(this._intro, scene), scene);
cinematic.onEvent("explosion", () => this._shakeCamera());
cinematic.onAnimationGroupEndObservable.addOnce(() => this._startGame());
cinematic.play();
```

## Sprites

- `playSpriteAnimationFromName(sprite, animationName, onAnimationEnd?)` plays an animation defined on the sprite
  in the editor.
- Types: `ISpriteAnimation` (`{ name, from, to, loop, delay }`), `SpriteManagerNode` and `SpriteMapNode` (the
  transform nodes holding a sprite manager / sprite map in the editor).

```ts
playSpriteAnimationFromName(this.sprite, "run", () => playSpriteAnimationFromName(this.sprite, "idle"));
```

## Sounds

Sounds placed in the editor are `SoundNode`s (transform nodes, retrieved with `@soundFromScene` or
`@visibleAsEntity("sound", ...)`):

| Member | Description |
| --- | --- |
| `play(options?)`, `pause()`, `resume()`, `stop(options?)` | Playback. |
| `isPlaying()`, `isPaused()`, `isStopped()` | State. |
| `volume`, `setVolume(volume, rampOptions?)` | Volume, optionally with a fade. |
| `playbackRate` | Speed / pitch. |
| `setSoundSpatial(spatial)` | Toggles 3D positioning (async). |
| `onSoundLoadedObservable` | Notified once the sound is loaded. |

## Post-processes

The post-processes configured in the editor are created by `loadScene` for the active camera. Get them to change
them at runtime:

`getDefaultRenderingPipeline()`, `getSSAO2RenderingPipeline()`, `getSSRRenderingPipeline()`,
`getTAARenderingPipeline()`, `getMotionBlurPostProcess()`, `getVLSPostProcess()`,
`getVolumetricLightingRenderingPipeline()` — each returns `null` when that effect is not enabled.

```ts
const pipeline = getDefaultRenderingPipeline();
if (pipeline) {
    pipeline.depthOfFieldEnabled = true;
}
```

After switching to another camera, `applyRenderingConfigurationForCamera(camera, rootUrl, options?)` applies the
post-processes saved for that camera (`options` like `postProcessConfiguration` of `loadScene`).

## Physics ragdolls

A `.ragdoll` asset (made in the editor's ragdoll editor) is linked with `@visibleAsAsset("ragdoll", ...)` as an
`IRagDollConfiguration`. Create the Babylon.js `Ragdoll` with its `runtimeConfiguration`, then call
`applyRagdollJointLimits`: Babylon.js stores the joint limits but never applies them.

```ts
const ragdoll = new Ragdoll(skeleton, rootTransformNode, this._ragdoll.runtimeConfiguration);
applyRagdollJointLimits(ragdoll, this._ragdoll.runtimeConfiguration);
ragdoll.ragdoll(); // When the character dies.
```

## Navigation meshes

`@visibleAsAsset("navmesh", ...)` gives a `RecastNavigationHelper`: a `RecastNavigationJSPluginV2` (paths,
crowd agents) with `refreshObstacles()` to update the obstacles after moving them. It needs
`@recast-navigation/core` and `@recast-navigation/generators` in the dependencies of the project.

## Decals

Decals painted in the editor (or created by an agent with the `create_decal` MCP tool) are meshes projected on
other meshes. The static ones are merged per material when the scene is saved.

- `isDecalMesh(mesh)` tells if a mesh is a decal.
- `setStaticDecalsEnabled(enabled, scene)` shows or hides the static decals — e.g. to save draw calls on
  low-end devices.

## Terrains

Terrains are the `TerrainMesh` nodes sculpted and painted in the editor's Terrain tab (or by an agent with the
terrain MCP tools). They are exported as a `GroundMesh` flagged with `isTerrainMesh` when the scene is loaded (the
`TerrainMesh` interface of `babylonjs-editor-tools`). Their relief (holes included) is regular geometry; their texture
layers come from a `TerrainMaterialPlugin` on a PBR material. Both need `babylonjs-editor-tools/loading/terrain` to be
imported once in the app (see [loading-scenes.md](loading-scenes.md#terrains)).

```ts
getTerrainHeightAtCoordinates(mesh, x, z): number | null
getTerrainNormalAtCoordinatesToRef(mesh, x, z, result: Vector3): boolean
invalidateTerrainHeightCache(mesh): void
isTerrainMesh(mesh): mesh is TerrainMesh
getTerrainMaterialPlugin(material): TerrainMaterialPlugin | null
```

- `x` and `z` are **world** coordinates in centimeters. The height is the world Y (cm) of the rendered surface,
  or `null` outside the terrain, over a hole, or when the mesh is not a terrain.
- `getTerrainNormalAtCoordinatesToRef` writes the world normal of the surface into `result` and returns `false`
  (`result` untouched) where the height would be `null`. Slope in degrees: `Math.acos(normal.y) * 180 / Math.PI`.
- Both work for every terrain, its clones (they keep the flag) and its instances, moved, rotated or scaled. The first call caches the heights (a few ms at 1024 subdivisions); the next calls are O(1). Call
  `invalidateTerrainHeightCache(mesh)` after editing the vertex data of a terrain in place at runtime.
- **Never** use `getHeightAtCoordinates` / `getNormalAtCoordinates` (inherited from `GroundMesh`) on terrains: they
  ignore holes and return the terrain's `position.y` outside of it instead of `null`.
- `isTerrainMesh(mesh)` is `true` for the terrains and their clones (`mesh.isTerrainMesh`; `getClassName()` stays
  `"GroundMesh"`, `"Mesh"` for a clone; for an instance, test its `sourceMesh`).
- `getTerrainMaterialPlugin(mesh.material)?.data.layers` lists the texture layers as configured in the editor
  (`id`, `name`, texture paths, `tileSize` in cm, `tint`, `roughness`, `metallic`...). `plugin.updateLayer(id,
  patch)` changes a layer at runtime: tint, tiling and PBR values apply at once, a new texture path rebuilds the
  layer textures. There is no runtime sculpting or painting API: sculpt and paint in the editor.

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { getTerrainHeightAtCoordinates, getTerrainNormalAtCoordinatesToRef, visibleAsEntity } from "babylonjs-editor-tools";

export default class FollowTerrainComponent {
    @visibleAsEntity("node", "Terrain")
    private _terrain: Mesh | null = null;

    /** Slope under the mesh in degrees (0 = flat), e.g. read by a movement script to slow down on steep slopes. */
    public slopeDegrees: number = 0;

    private _normal: Vector3 = new Vector3();

    public constructor(public mesh: Mesh) {}

    public onUpdate(): void {
        if (!this._terrain) {
            return;
        }

        // World centimeters (this mesh has no parent). null: outside the terrain or over a hole.
        const position = this.mesh.position;
        const y = getTerrainHeightAtCoordinates(this._terrain, position.x, position.z);
        if (y === null) {
            return;
        }

        position.y = y;

        if (getTerrainNormalAtCoordinatesToRef(this._terrain, position.x, position.z, this._normal)) {
            this.slopeDegrees = Math.acos(Math.min(1, this._normal.y)) * (180 / Math.PI);
        }
    }
}
```

## Textures, materials & performance

- `forceCompileAllSceneMaterials(scene)` compiles the shaders of all materials up front, to avoid hitches the
  first time an object is seen.
- `loadMaterialFromFile(rootUrl, "assets/materials/metal.material", scene)` loads a `.material` asset.
- Compressed textures generated by the editor, enabled before `loadScene`:
  - `.ktx2` textures: `setUseKtx2CompressedTextures(true)` loads them instead of the original images.
  - Per-GPU-format `.ktx` textures (`-dxt.ktx`, `-astc.ktx`, `-etc2.ktx`...): `configureEngineToUseCompressedTextures(engine)`,
    and `addExcludedCompressedTexture(engine, url)` to keep a texture uncompressed.

## Offline assets database

Cache the assets of the exported scenes in IndexedDB so the game loads faster (and offline) after the first
visit:

```ts
setupOfflineProvider("my-game"); // Before loading: Babylon.js reads the files from the database.

await preloadAssetsToDatabase("my-game", "/scene/", {
    scenesFilter: ["menu.babylon"], // Only the scenes needed first.
    onProgress: (progress) => console.log(progress),
});
```

`preloadAssetsToDatabase` reads the `scenes-used-files.json` generated with the exported scenes.
`createAndOpenDatabase(name, urlToScene)` opens the database directly.

## Type guards

`isMesh`, `isInstancedMesh`, `isAbstractMesh`, `isTransformNode`, `isNode`, `isLight` (and `isPointLight`,
`isDirectionalLight`, `isSpotLight`, `isHemisphericLight`), `isCamera`, `isScene`, `isTexture`, `isSprite`,
`isSpriteManagerNode`, `isSoundNode`, `isAnyParticleSystem`, `isParticleSystem`, `isGPUParticleSystem`,
`isShadowGenerator`, `isClusteredLightContainer`, … — useful in scripts that accept any object. For terrains,
`isTerrainMesh(mesh)` (see [Terrains](#terrains)).
