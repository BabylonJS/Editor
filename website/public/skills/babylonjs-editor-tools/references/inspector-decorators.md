# Customizable inspector fields (`@visibleAs*`)

The same script can be attached to many objects, each with its own configuration. Decorating a property with
a `@visibleAs*` decorator exposes it as an editable field in the editor's inspector, **per object and per
script**. The value the user sets in the editor is applied to the property at runtime before `onStart`.

Every decorator takes an optional **label** (shown in the inspector; defaults to the property name) and an
optional **configuration** object. The configuration always supports a `description` (tooltip), plus
type-specific options listed below. Class-based scripts only.

---

## `@visibleAsBoolean(label?, config?)`

Checkbox. Config: `{ description? }`.

```ts
import { visibleAsBoolean } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsBoolean("Rotation Enabled", { description: "Enables or disables rotation of the object." })
    private _rotationEnabled: boolean = true;

    public constructor(public mesh: Mesh) {}

    public onUpdate(): void {
        if (this._rotationEnabled) {
            this.mesh.rotation.y += 0.04 * this.mesh.getScene().getAnimationRatio();
        }
    }
}
```

## `@visibleAsNumber(label?, config?)`

Number field. Config: `{ description?, min?, max?, step? }` (`step` is the slider increment).

```ts
import { visibleAsNumber } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsNumber("Rotation Speed", { min: 0, max: 10, step: 0.1 })
    private _rotationSpeed: number = 1;

    public constructor(public mesh: Mesh) {}

    public onUpdate(): void {
        this.mesh.rotation.y += this._rotationSpeed * this.mesh.getScene().getAnimationRatio();
    }
}
```

## `@visibleAsString(label?, config?)`

Text input. Config: `{ description?, multiline? }`.

```ts
import { visibleAsString } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsString("Text", { description: "Defines the text drawn in the textblock." })
    private _text: string = "";

    public constructor(public mesh: Mesh) {}
}
```

## `@visibleAsVector2(label?, config?)` / `@visibleAsVector3(label?, config?)`

2D (X, Y) or 3D (X, Y, Z) vector field. Config: `{ description?, min?, max?, step?, asDegrees? }`.
`asDegrees` converts radians ⇄ degrees in the UI for easier editing.

```ts
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { visibleAsVector3 } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsVector3("Rotation Speed XYZ")
    private _rotationSpeed: Vector3 = Vector3.Zero();

    public constructor(public mesh: Mesh) {}

    public onUpdate(): void {
        const ratio = this.mesh.getScene().getAnimationRatio();
        this.mesh.rotation.x += this._rotationSpeed.x * ratio;
        this.mesh.rotation.y += this._rotationSpeed.y * ratio;
        this.mesh.rotation.z += this._rotationSpeed.z * ratio;
    }
}
```

## `@visibleAsColor3(label?, config?)` / `@visibleAsColor4(label?, config?)`

Color field (RGB, or RGBA for Color4) with a built-in color picker. Config:
`{ description?, noClamp?, noColorPicker? }`. `noClamp` disables clamping of channels to `[0, 1]`;
`noColorPicker` hides the picker.

```ts
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { visibleAsColor4 } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsColor4("Clear Color")
    private _clearColor: Color4 = new Color4(0, 0, 0, 1);

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        this.mesh.getScene().clearColor.copyFrom(this._clearColor);
    }
}
```

## `@visibleAsEntity(entityType, label?, config?)`

A field that accepts an entity dragged from the editor's scene graph, creating a link resolved at runtime.
`entityType` is one of `"node" | "sound" | "animationGroup" | "particleSystem"`.

```ts
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { visibleAsEntity } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsEntity("particleSystem", "Fire Particle System", {
        description: "The particle system used to start the fire effect.",
    })
    private _fireParticleSystem!: ParticleSystem;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        this._fireParticleSystem.start();
    }
}
```

To assign: select the entity in the editor's graph and drag it onto the field in the inspector.

## `@visibleAsTexture(label?, config?)`

A field that accepts a texture. Config: `{ description?, acceptCubes?, onlyCubes? }`.

```ts
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { visibleAsTexture } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsTexture("Diffuse", { acceptCubes: false })
    private _texture!: Texture;

    public constructor(public mesh: Mesh) {}
}
```

## `@visibleAsKeyMap(label?, config?)`

A key-binding field (lets the user pick a keyboard key). Config: `{ description? }`. Pairs well with
`@onKeyboardEvent` (see [event-decorators.md](event-decorators.md)).

```ts
import { visibleAsKeyMap } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsKeyMap("Jump Key")
    private _jumpKey: string = " ";

    public constructor(public mesh: Mesh) {}
}
```

---

## Linking assets

For linking project **assets** (JSON / material / GUI / scene / …), use `@visibleAsAsset` — see
[asset-decorators.md](asset-decorators.md).
