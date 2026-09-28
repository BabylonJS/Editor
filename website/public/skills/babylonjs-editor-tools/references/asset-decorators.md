# Linking assets to scripts (`@visibleAsAsset`)

Project assets can be linked directly into scripts. The linked asset is **preloaded as part of the scene
loading process**, so it is ready by the time `onStart` runs. The property appears as a drop target in the
editor inspector — drag an asset from the **Assets Browser** onto it. Dropping an incompatible asset shows
an error. Class-based scripts only.

```ts
@visibleAsAsset(assetType, label?, configuration?)
```

`assetType` is one of:
`"json" | "material" | "gui" | "scene" | "nodeParticleSystemSet" | "navmesh" | "cinematic" | "ragdoll"`.

The most common are `json`, `material`, and `gui`. With `loadScene(..., { skipAssetsPreload: true })`, assets
are not preloaded and the properties decorated with `@visibleAsAsset` (and `@sceneAsset`) stay unset.

---

## JSON files

The `.json` file is parsed automatically; access its properties directly.

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { visibleAsAsset } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) {}

    @visibleAsAsset("json", "My JSON asset")
    private _json!: MyJsonTypeOrAny;

    public onStart(): void {
        console.log(this._json.name);
    }
}
```

## Material files

A `.material` asset is parsed into a Babylon.js material instance.

```ts
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { visibleAsAsset } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) {}

    @visibleAsAsset("material", "My material asset")
    private _material!: PBRMaterial;

    public onStart(): void {
        this.mesh.material = this._material;
    }
}
```

### Restricting the material type

By default any material is accepted. Pass `typeRestriction` to limit it to
`"PBRMaterial" | "StandardMaterial" | "AnyMaterial"`:

```ts
@visibleAsAsset("material", "My material asset", { typeRestriction: "PBRMaterial" })
private _material!: PBRMaterial;
```

## GUI files

A `.gui` asset is parsed into a fullscreen `AdvancedDynamicTexture` **only when the GUI plugin is imported**
once in the app (e.g. in `App.ts`). Without it, the property receives the raw JSON of the `.gui` file. Also import
the `@babylonjs/gui` controls the GUI uses.

```ts
// App.ts (once)
import "babylonjs-editor-tools/loading/script/preload/plugins/gui";
```

```ts
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { visibleAsAsset } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) {}

    @visibleAsAsset("gui", "My GUI asset")
    private _gui!: AdvancedDynamicTexture;

    public onStart(): void {
        // this._gui.addControl(...);
    }
}
```

## Other asset types

| Type | The property receives |
| --- | --- |
| `scene` | An `AdvancedAssetContainer` (see [scene-containers.md](scene-containers.md)). |
| `nodeParticleSystemSet` | A `NodeParticleSystemSet`, ready to build particle systems. |
| `cinematic` | The raw `ICinematic` data: play it with `parseCinematic` + `generateCinematicAnimationGroup` (see [runtime-helpers.md](runtime-helpers.md)). |
| `ragdoll` | An `IRagDollConfiguration`, for `new Ragdoll(...)` + `applyRagdollJointLimits` (see [runtime-helpers.md](runtime-helpers.md)). |
| `navmesh` | A `RecastNavigationHelper` (a `RecastNavigationJSPluginV2` with `refreshObstacles()`). Needs `@recast-navigation/core` and `@recast-navigation/generators` installed; the generated `src/scripts.ts` imports the navmesh plugin. |

```ts
import { Scene } from "@babylonjs/core/scene";
import { ICinematic, parseCinematic, generateCinematicAnimationGroup, visibleAsAsset } from "babylonjs-editor-tools";

export default class IntroComponent {
    @visibleAsAsset("cinematic", "Intro")
    private _intro!: ICinematic;

    public constructor(public scene: Scene) {}

    public onStart(): void {
        const cinematic = generateCinematicAnimationGroup(parseCinematic(this._intro, this.scene), this.scene);
        cinematic.play();
    }
}
```

## Custom asset types

`registerScriptAssetParser(extension, parser)` adds a loader for another file extension used with
`@visibleAsAsset`. The parser receives `{ key, rootUrl, scene }` (`key` is the path of the asset) and returns
the value given to the property. Register it before calling `loadScene`.

```ts
import { registerScriptAssetParser } from "babylonjs-editor-tools";

registerScriptAssetParser("dialog", async ({ key, rootUrl }) => {
    const response = await fetch(`${rootUrl}${key}`);
    return response.json();
});
```

---

## Deprecated: `@guiFromAsset`

`@guiFromAsset<T>(pathInAssets, onGuiCreated?)` loads a `.gui` file from a fixed path and (optionally) calls
a callback once the GUI is created. **Prefer `@visibleAsAsset("gui", ...)`** instead — `@guiFromAsset` is
deprecated and its creation is asynchronous (the property is not available immediately in `onStart`).

```ts
// ⚠️ deprecated
@guiFromAsset<MyScriptClass>("ui.gui", (instance, gui) => instance._onGuiLoaded(gui))
private _ui!: AdvancedDynamicTexture;
```

## Programmatic material loading

To load a material outside the decorator flow, use the helper:

```ts
import { loadMaterialFromFile } from "babylonjs-editor-tools";

const material = await loadMaterialFromFile<PBRMaterial>(rootUrl, "assets/materials/metal.material", scene);
```
