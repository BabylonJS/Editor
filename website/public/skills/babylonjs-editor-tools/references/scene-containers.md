# Instantiating sub-scenes (`AdvancedAssetContainer`)

`AdvancedAssetContainer` extends Babylon.js' `AssetContainer` to add editor-specific features — most
importantly, **scripts attached to the contained nodes are re-applied to instantiated/cloned copies**.

You get one from the `@sceneAsset(file)` decorator (see [scene-decorators.md](scene-decorators.md)), or from
`@visibleAsAsset("scene", ...)` to let the user choose the `.scene` in the inspector. The raw Babylon.js
`AssetContainer` is available as `.container`.

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { sceneAsset, AdvancedAssetContainer } from "babylonjs-editor-tools";

export default class Spawner {
    @sceneAsset("enemy.scene")
    private _enemy: AdvancedAssetContainer | null = null;

    public constructor(public mesh: Mesh) {}
    // ...
}
```

## Two usage patterns

1. **One-shot scene (e.g. a map):** load it and keep the default instance that was added to the scene.
2. **Repeated scene (e.g. enemies):** call `removeDefault()` to drop the auto-added instance, then
   `instantiate()` as many times as needed.

> When a scene is loaded as a container, **its own nodes are added to the main scene** (with their scripts),
> so they appear once. Call `removeDefault()` if you don't want them there.

## API

### `removeDefault(): void`

Removes the default (auto-added) nodes from the scene, unregistering their scripts. Use this when the
container exists only to be instantiated on demand.

### `instantiate(options?): AdvancedAssetContainerInstantiatedEntries`

Instantiates (or clones) all meshes, skeletons and animation groups, adds them to the scene, and re-applies
any attached scripts to the new nodes. Returns an `AdvancedAssetContainerInstantiatedEntries`:

| Member | Description |
| --- | --- |
| `rootNodes`, `skeletons`, `animationGroups` | The instantiated entities. |
| `namingId` | The unique id appended to the names of this copy. |
| `getRootNodeByName(name)` | A root node of this copy, by its **original** name. |
| `getNodeByName(name)` | Any node of this copy (searched recursively), by its **original** name. |
| `getScriptByClassByObjectName(name, Class)` | The script instance of `Class` on the node of this copy named `name`. |
| `dispose()` | Removes this copy from the scene. |

```ts
interface IAdvancedAssetContainerInstantiateOptions {
    /** Clone instead of instantiate — boolean, or a predicate per node. */
    doNotInstantiate?: boolean | ((node: Node) => boolean);
    /** Filter which entities are instantiated/cloned. */
    predicate?: (entity: any) => boolean;
}
```

```ts
public onStart(): void {
    this._enemy?.removeDefault();

    for (let i = 0; i < 10; i++) {
        const enemy = this._enemy?.instantiate({
            doNotInstantiate: (node) => node.name === "DontInstantiateMe",
            predicate: (entity) => entity.name.startsWith("Enemy"),
        });

        // Later, to remove this instance:
        // enemy?.dispose();
    }
}
```

Each instantiated copy gets unique ids, and **names suffixed with `-<namingId>`** (`"Enemy"` becomes
`"Enemy-XyZ12"`), so `scene.getNodeByName("Enemy")` doesn't find the copies: use the `getNodeByName` of the
returned entries instead. Entity links inside its scripts are remapped to the new copy — `@visibleAsEntity`
references, animation-group links, and decorators like `@nodeFromScene("Weapon")` resolve to the node of the same
copy (`"Weapon-XyZ12"`).

```ts
const enemy = this._enemy!.instantiate();
const weapon = enemy.getNodeByName("Weapon");
const ai = enemy.getScriptByClassByObjectName("EnemyRoot", EnemyAIComponent);
```

### `getRootNodeByName(name): Node | null`

Find a node among the container's root nodes (the default nodes added to the scene) by name. Useful when you
keep the default instance and never call `removeDefault()`.

### `getScriptByClassByObjectName(name, ClassType): InstanceType | null`

Find the single script instance of `ClassType` attached to a node named `name` within the container. Returns
`null` if not found (or if not exactly one match).

```ts
const ai = this._enemy?.getScriptByClassByObjectName("EnemyRoot", EnemyAIComponent);
ai?.startPatrol();
```

## See also

For background on instantiating vs. cloning, see the Babylon.js docs on
[duplicating models with asset containers](https://doc.babylonjs.com/features/featuresDeepDive/importers/assetContainers#duplicating-the-models).

The editor's convention is to **prefer instancing/cloning over duplicating geometry** for performance —
instantiate a single container many times rather than importing the same model repeatedly.
