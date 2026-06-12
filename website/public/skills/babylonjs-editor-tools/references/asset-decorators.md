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

The most common are `json`, `material`, and `gui`.

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

A `.gui` asset is parsed into an `AdvancedDynamicTexture`.

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

const material = await loadMaterialFromFile<PBRMaterial>(rootUrl, "materials/metal.material", scene);
```
