---
name: babylonjs-editor-tools
description: >-
  Write and attach TypeScript scripts, load scenes, and use the editor decorators and runtime helpers in projects
  created with the Babylon.js Editor (the babylonjs-editor-tools runtime package). Use when working with files
  like src/scripts/*.ts, src/scripts.ts, or App.ts that import from "babylonjs-editor-tools", or whenever the task
  mentions editor scripts, IScript onStart/onUpdate, loadScene, AdvancedAssetContainer, the @nodeFromScene /
  @visibleAs* / @onPointerEvent / @sceneAsset / @visibleAsAsset decorators, or runtime helpers such as
  getScriptByClassForObject, applyScriptOnObject, cinematics, sprites, sounds, ragdolls, navmeshes, decals,
  terrains (getTerrainHeightAtCoordinates, getTerrainNormalAtCoordinatesToRef, TerrainMaterialPlugin layers),
  post-processes or the offline assets database.
---

# babylonjs-editor-tools

`babylonjs-editor-tools` is the runtime library bundled into every project exported or packaged by the
Babylon.js Editor. It is what user game code (`src/scripts/*.ts`) and the app bootstrap (`App.ts` /
`page.tsx` / `app.vue`) import. It provides:

1. **A scene loader** (`loadScene`) that reconstructs everything the editor saved and re-attaches scripts.
2. **A script contract** (`IScript`: `onStart` / `onUpdate` / `onStop`).
3. **Decorators** used inside scripts to retrieve scene objects, expose customizable inspector fields,
   link assets, and listen to input events.
4. **Runtime helpers** to find or attach scripts, play cinematics and sprite animations, drive sounds,
   post-processes, ragdolls, navmeshes and decals, read the relief and layers of terrains, and cache assets
   offline.

Everything is imported from the package root:

```ts
import { loadScene, nodeFromScene, visibleAsNumber, onPointerEvent } from "babylonjs-editor-tools";
```

## Mental model (read this first)

- A **script** is a default-exported class (recommended) or a set of exported functions, attached to a scene
  object in the editor (mesh, transform node, light, camera, sprite, or the scene itself).
- The object the script is attached to is passed to the **constructor** (class) or as the **first argument**
  (functions). Conventionally the parameter is named after the type, e.g. `public mesh: Mesh`.
- Decorators are applied by the loader **right after construction**, before `onStart`. **Inside the
  constructor, decorated properties still hold their initializer values** (the values set in the editor and the
  linked objects/assets are not assigned yet) — only use them from `onStart` onward.
- Decorators only work on **class-based** scripts, not function-based scripts.
- The editor works in **centimeters** and auto-scales glTF/GLB imports ×100 — keep that in mind for any
  positions, speeds, or distances you compute (gravity is `-981`).

## When the editor's MCP tools are available

In the editor's AI assistant (or any agent connected to the `babylonjs-editor` MCP server), **author the
scene with the MCP tools** — meshes, materials, instances, lights, cameras, particles, physics, decals,
terrains — so the user can edit the result by hand. Scripts written with this package are for runtime
**behavior** only (input, game rules, AI, reacting to events, spawning copies of authored assets). Write them
under `src/`, attach them with the MCP script tools, and set their `@visibleAs*` values from the editor rather
than hard-coding them.

Never displace ground vertices or replace ground geometry in scripts to make hills: create a terrain with
`create_terrain` (grounds can't be sculpted), sculpt and paint it with the terrain tools (`generate_terrain`,
`sculpt_terrain`, `modify_terrain`, `set_terrain_layer`, `paint_terrain`), and place objects
on it with `snap_nodes_to_terrain` (or read heights with `sample_terrain`). At runtime, scripts read the relief with `getTerrainHeightAtCoordinates` /
`getTerrainNormalAtCoordinatesToRef` (see [references/runtime-helpers.md](references/runtime-helpers.md#terrains)).

## Quick reference

### Lifecycle (`IScript`)

| Method | Called |
| --- | --- |
| `onStart(object)` | Once, before the first frame after the script loads and the scene is ready. |
| `onUpdate(object)` | Every rendered frame. Use `scene.getAnimationRatio()` for frame-rate independence. |
| `onStop(object)` | When the script is stopped or the object is disposed. |

### Retrieving scene objects — see [references/scene-decorators.md](references/scene-decorators.md)

| Decorator | Retrieves |
| --- | --- |
| `@nodeFromScene(name)` | First node (Mesh / TransformNode / Light / Camera) with that name, anywhere in the scene. |
| `@nodeFromDescendants(name, directOnly?)` | Same, but only among descendants of the attached object. |
| `@animationGroupFromScene(name)` | An `AnimationGroup` by name. |
| `@particleSystemFromScene(name, directOnly?)` | A particle system by name (`directOnly`: only the ones emitted by the attached object). |
| `@soundFromScene(name)` | A `SoundNode` by name. |
| `@spriteFromSpriteManager(name)` | A sprite of the manager (scripts on a `SpriteManagerNode`). |
| `@animationFromSprite(name)` | An `ISpriteAnimation` of the sprite (scripts on a `Sprite`). |
| `@componentFromScene(OtherScriptClass)` | The single instance of another script class in the scene. |
| `@sceneAsset(file)` | A `.scene` loaded as an `AdvancedAssetContainer` (instantiate on demand). |

### Customizable inspector fields — see [references/inspector-decorators.md](references/inspector-decorators.md)

`@visibleAsBoolean`, `@visibleAsNumber`, `@visibleAsString`, `@visibleAsVector2`, `@visibleAsVector3`,
`@visibleAsColor3`, `@visibleAsColor4`, `@visibleAsEntity`, `@visibleAsTexture`, `@visibleAsKeyMap`.
Each makes a property editable per-object in the editor inspector; `{ group }` sorts fields into sections.

### Linking assets — see [references/asset-decorators.md](references/asset-decorators.md)

`@visibleAsAsset(type, label, config?)` links a property to a project asset (`json`, `material`, `gui`,
`scene`, `nodeParticleSystemSet`, `navmesh`, `cinematic`, `ragdoll`). Preloaded during scene load.

### Input events — see [references/event-decorators.md](references/event-decorators.md)

`@onPointerEvent(type | type[], { mode })` and `@onKeyboardEvent(type | type[])` call the decorated method
when the event fires. Pointer `mode` can be `global` (default), `attachedMeshOnly`, or `includeDescendants`.

### Loading scenes — see [references/loading-scenes.md](references/loading-scenes.md)

`await loadScene(rootUrl, sceneFilename, scene, scriptsMap, options?)` appends a saved `.babylon` scene,
preloads script assets, configures lights/shadows/LODs/physics/post-processing, and attaches every script.

### Instantiating sub-scenes — see [references/scene-containers.md](references/scene-containers.md)

`AdvancedAssetContainer` (from `@sceneAsset` or `@visibleAsAsset("scene")`) — `.removeDefault()`,
`.instantiate(options?)`, `.getRootNodeByName()`, `.getScriptByClassByObjectName()`.

### Runtime helpers — see [references/runtime-helpers.md](references/runtime-helpers.md)

| Need | Helper |
| --- | --- |
| Get the script instance on an object | `getScriptByClassForObject(object, Class)` / `getAllScriptsByClassForObject` |
| Attach a script at runtime | `applyScriptOnObject(object, Class)` |
| Play a cinematic | `parseCinematic` + `generateCinematicAnimationGroup` → `Cinematic.onEvent(...)` |
| Play a sprite animation by name | `playSpriteAnimationFromName(sprite, name, onEnd?)` |
| Tune a post-process | `getDefaultRenderingPipeline()`, `getSSAO2RenderingPipeline()`, … |
| Ragdolls / navmeshes / decals | `applyRagdollJointLimits`, `RecastNavigationHelper`, `setStaticDecalsEnabled` |
| Terrain height, normal and layers | `getTerrainHeightAtCoordinates`, `getTerrainNormalAtCoordinatesToRef`, `isTerrainMesh`, `getTerrainMaterialPlugin` (never `getHeightAtCoordinates` on terrains) |
| Load assets offline / faster | `setupOfflineProvider`, `preloadAssetsToDatabase`, `forceCompileAllSceneMaterials` |

## Minimal class-based script

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { visibleAsNumber } from "babylonjs-editor-tools";

export default class RotateScript {
    @visibleAsNumber("Rotation Speed", { min: 0, max: 10, step: 0.1 })
    private _speed: number = 1;

    public constructor(public mesh: Mesh) {
        // ⚠️ _speed is still 1 here: the value set in the editor is applied after the constructor.
    }

    public onStart(): void {
        // ✅ decorated properties are now resolved.
    }

    public onUpdate(): void {
        this.mesh.rotation.y += this._speed * this.mesh.getScene().getAnimationRatio();
    }
}
```

## Conventions to follow when authoring scripts

- Default-export **one class per file**; name the file in kebab-case (e.g. `rotate-script.ts`).
- Type decorated reference properties as nullable (`Mesh | null = null`) and guard before use, since they
  resolve only after construction.
- Never read decorated properties in the `constructor`.
- Never edit the generated `src/scripts.ts`: the editor rewrites it.
- Match the repo's Prettier style: **tabs**, double quotes, semicolons, `printWidth` 180.
- Import Babylon.js symbols from deep paths (`@babylonjs/core/Meshes/mesh`) to keep tree-shaking working,
  exactly like the templates and documentation examples do.

For full details and runnable examples, open the matching file under `references/`.
