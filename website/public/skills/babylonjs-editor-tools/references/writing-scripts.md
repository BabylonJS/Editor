# Writing & attaching scripts

Scripts add interactivity to a scene. They are written in TypeScript and attached to objects in the editor.
Multiple scripts can be attached to the same object, and the same script can be attached to many objects.

## The `IScript` contract

Every script may implement up to three lifecycle methods (all optional):

```ts
export interface IScript {
    /** Called once, before the first frame after the script loads and the scene is ready. */
    onStart?(object: any): void;
    /** Called every rendered frame. */
    onUpdate?(object: any): void;
    /** Called when the script is stopped or the attached object is disposed. */
    onStop?(object: any): void;
}
```

Each method receives the object the script is attached to, for class-based scripts too (they usually read it
from the property set by the constructor instead).

Use `scene.getAnimationRatio()` inside `onUpdate` so movement is frame-rate independent.

## Class-based scripts (recommended)

The attached object is passed to the **constructor**. Decorators only work with this form.

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";

export default class MyScriptComponent {
    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        // Do something when the script is loaded.
    }

    public onUpdate(): void {
        this.mesh.rotation.y += 0.04 * this.mesh.getScene().getAnimationRatio();
    }
}
```

The constructor parameter type should match the kind of object the script is attached to: `Mesh`,
`InstancedMesh`, `TransformNode`, `Camera`, a `Light` subclass, `Sprite`, or `Scene` — or one of the editor's
node types exported by the package: `SpriteManagerNode`, `SpriteMapNode`, `SoundNode` (transform nodes) and
`NodeParticleSystemMesh`.

To attach a script at runtime (e.g. to a spawned copy) or to get the script instance of another object, see
`applyScriptOnObject` and `getScriptByClassForObject` in [runtime-helpers.md](runtime-helpers.md).

## Function-based scripts

The attached object is passed as the first argument of each exported function. **Decorators are not
available** in this form (it is still a work-in-progress feature).

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";

export function onStart(mesh: Mesh): void {
    // Do something when the script is loaded.
}

export function onUpdate(mesh: Mesh): void {
    mesh.rotation.y += 0.04 * mesh.getScene().getAnimationRatio();
}
```

## Creating a script in the editor

In the **Assets Browser**, right-click inside the `src` folder of the project and choose
**Add → Script → Class based** (or **Function based**). This generates a new `.ts` file with the boilerplate.

## Attaching a script to an object

1. Select an object in the scene (the inspector shows its properties).
2. Drag the script file from the **Assets Browser** onto the **Scripts** section of the inspector.

The script is then executed automatically when the project runs.

## The generated `scriptsMap`

The editor maintains `src/scripts.ts`, a generated map of every script in the project keyed by its path
relative to `src`. This map is handed to `loadScene` so the loader can re-attach scripts to the objects
they were attached to in the editor. **Never edit it by hand**: the editor rewrites it when scripts are added,
moved or removed, and leaves out of release builds the scripts flagged as debug only.

```ts
// src/scripts.ts (generated — abridged)
import {
    loadScene,
    scriptsDictionary,
    // ... internal helpers and the get*RenderingPipeline / get*PostProcess getters
} from "babylonjs-editor-tools";

// Request all plugins
import "babylonjs-editor-tools/loading/gaussian-splatting";
import "babylonjs-editor-tools/loading/script/preload/plugins/navmesh";

import * as scripts_box from "./scripts/box";

export const scriptsMap = {
    "scripts/box.ts": scripts_box,
};

export { loadScene, scriptsDictionary /* , ... */ };
```

The `ScriptMap` type each entry conforms to:

```ts
export type ScriptMap = Record<
    string,
    { default?: new (object: any) => IScript } & IScript
>;
```

— i.e. the module's `default` export (the class) and/or its exported `onStart` / `onUpdate` / `onStop`
functions.

## Gotchas

- **Decorated properties are not available in the constructor.** They still hold their initializer values
  there: the loader assigns them right after construction. Read them from `onStart` onward.
- Decorators require the **class-based** form.
- If a documented decorator is missing at runtime, the project's `babylonjs-editor-tools` dependency is
  out of date — update `package.json`.
