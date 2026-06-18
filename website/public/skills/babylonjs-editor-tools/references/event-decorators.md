# Listening to input events

Decorate a **method** so it is called whenever a pointer or keyboard event of the given type(s) is raised in
the scene. Class-based scripts only. The loader wires these up when the scene is loaded.

You can listen to one event type or several at once by passing an array.

---

## `@onPointerEvent(eventType | eventType[], options?)`

`eventType` comes from `PointerEventTypes` (`@babylonjs/core/Events/pointerEvents`). The decorated method
receives a `PointerInfo` argument with details about the event.

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PointerEventTypes, PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import { onPointerEvent } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) {}

    @onPointerEvent([PointerEventTypes.POINTERTAP, PointerEventTypes.POINTERDOUBLETAP])
    public pointerTap(info: PointerInfo): void {
        console.log("A pointer tap was raised in the scene!", info.type);
    }
}
```

### Listening modes (`options.mode`)

By default the decorator listens **globally** (anywhere in the scene). Set `mode` to scope it:

| Mode | Behavior |
| --- | --- |
| `"global"` (default) | Fires for the event anywhere in the scene. |
| `"attachedMeshOnly"` | Fires only when the event targets the script's attached mesh. **Requires the attached object to be a `Mesh`** — otherwise an error is thrown at load time. |
| `"includeDescendants"` | Fires when the event targets the attached object **or any of its descendants**. Works for any node type (TransformNode, Light, …), useful for imported GLB hierarchies. |

```ts
@onPointerEvent(PointerEventTypes.POINTERTAP, { mode: "attachedMeshOnly" })
public pointerTap(): void {
    console.log("The attached mesh was tapped!", this.mesh.name);
}
```

```ts
@onPointerEvent(PointerEventTypes.POINTERTAP, { mode: "includeDescendants" })
public pointerTap(info: PointerInfo): void {
    console.log("The attached mesh or one of its descendants was tapped!", this.mesh.name);
}
```

---

## `@onKeyboardEvent(eventType | eventType[])`

`eventType` comes from `KeyboardEventTypes` (`@babylonjs/core/Events/keyboardEvents`). The decorated method
receives a `KeyboardInfo` argument.

```ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { KeyboardEventTypes, KeyboardInfo } from "@babylonjs/core/Events/keyboardEvents";
import { onKeyboardEvent } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) {}

    @onKeyboardEvent([KeyboardEventTypes.KEYUP, KeyboardEventTypes.KEYDOWN])
    public keyEvent(info: KeyboardInfo): void {
        console.log("Keyboard event:", info.type, "key:", info.event.key);
    }
}
```

Combine with `@visibleAsKeyMap` (see [inspector-decorators.md](inspector-decorators.md)) to let the user
configure which key triggers an action.
