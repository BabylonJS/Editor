# Retrieving scene objects (decorators)

These decorators link a class property to an object that exists elsewhere in the scene. The loader resolves
them **after** the script's constructor runs, so the values are available from `onStart` onward — never in
the constructor. All require the **class-based** script form.

They are roughly equivalent to calling `scene.getMeshById(...)`, `scene.getTransformNodeById(...)`, etc.,
but resolved automatically by the editor's loader.

---

## `@nodeFromScene(nodeName)`

Retrieve the first **Mesh**, **TransformNode**, **Light** or **Camera** with the given name by traversing
the entire scene graph.

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { nodeFromScene } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @nodeFromScene("Other Mesh")
    private _otherMesh: Mesh | null = null;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        console.log(this._otherMesh);
    }
}
```

## `@nodeFromDescendants(nodeName, directDescendantsOnly = false)`

Same as `@nodeFromScene`, but the search is restricted to the **descendants** of the object the script is
attached to. Pass `true` for `directDescendantsOnly` to consider only direct children (otherwise the search
is recursive).

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { nodeFromDescendants } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @nodeFromDescendants("Other Mesh")
    private _otherMesh: Mesh | null = null;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        console.log(this._otherMesh);
    }
}
```

## `@animationGroupFromScene(animationGroupName)`

Retrieve an `AnimationGroup` from the scene by name.

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { animationGroupFromScene } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @animationGroupFromScene("Idle")
    private _idle: AnimationGroup | null = null;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        this._idle?.play();
    }
}
```

## `@particleSystemFromScene(name, directDescendantsOnly = false)`

Retrieve a particle system by name. With `directDescendantsOnly = false` (default), both descendants and
global particle systems are considered.

```ts
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { particleSystemFromScene } from "babylonjs-editor-tools";

export default class MyScriptComponent {
    @particleSystemFromScene("particles")
    private _particleSystem: ParticleSystem | null = null;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        this._particleSystem?.start();
    }
}
```

## `@soundFromScene(soundName)`

Retrieve a `SoundNode` by name.

```ts
import { soundFromScene, SoundNode } from "babylonjs-editor-tools";

export default class MyScriptComponent {
    @soundFromScene("running")
    private _mySound: SoundNode | null = null;

    public constructor(public object: TransformNode) {}

    public onStart(): void {
        this._mySound?.play();
    }
}
```

## `@spriteFromSpriteManager(name)` and `@animationFromSprite(name)`

For scripts attached to a `SpriteManagerNode`: link a property to a sprite, or to a named sprite animation.

```ts
import { spriteFromSpriteManager, animationFromSprite } from "babylonjs-editor-tools";

export default class MySpriteManagerComponent {
    @spriteFromSpriteManager("player")
    private _player = null;

    @animationFromSprite("walk")
    private _walk = null;

    public constructor(public manager: any) {}
}
```

## `@componentFromScene(OtherScriptClass)`

Retrieve the **single** instance of another script class attached somewhere in the scene. This lets scripts
talk to each other directly.

> **Important:** exactly one instance of the target class must exist in the scene. If multiple instances are
> found, an error is thrown at load time and the project won't run (it can't decide which one to link).

```ts
// my-component.ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { componentFromScene } from "babylonjs-editor-tools";
import MyOtherComponentClass from "./my-other-component";

export default class MyMeshComponent {
    @componentFromScene(MyOtherComponentClass)
    private _myComponent: MyOtherComponentClass | null = null;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        this._myComponent?.sayHello();
    }
}

// my-other-component.ts
export default class MyOtherComponentClass {
    public sayHello(): void {
        console.log("Hello!");
    }
}
```

## `@sceneAsset(sceneName)`

Load a `.scene` asset as an `AdvancedAssetContainer` and link it to the property. Used both for one-shot
scenes (e.g. a map) and for sub-scenes you instantiate many times (e.g. enemies). See
[scene-containers.md](scene-containers.md) for the container API.

```ts
import { sceneAsset, AdvancedAssetContainer } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @sceneAsset("enemy.scene")
    private _enemy: AdvancedAssetContainer | null = null;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        // The container auto-instantiates once. Remove those default nodes if you only
        // want to instantiate on demand:
        this._enemy?.removeDefault();

        for (let i = 0; i < 10; i++) {
            const enemy = this._enemy?.instantiate();
        }
    }
}
```
