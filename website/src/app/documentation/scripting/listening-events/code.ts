export const onPointerEventBasicExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";

import { onPointerEvent } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) { }

    @onPointerEvent(PointerEventTypes.POINTERTAP)
    public pointerTap(): void {
        console.log("A pointer tap has been raised in the scene!");
    }
}
`;

export const onPointerEventArrayBasicExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PointerEventTypes, PointerInfo } from "@babylonjs/core/Events/pointerEvents";

import { onPointerEvent } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) { }

    @onPointerEvent([
        PointerEventTypes.POINTERTAP,
        PointerEventTypes.POINTERDOUBLETAP
    ])
    public pointerTap(info: PointerInfo): void {
        console.log("A pointer tap has been raised in the scene!", info.type);
    }
}
`;

export const onPointerEventMeshOnlyExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";

import { onPointerEvent } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) { }

    /**
     * Listen for double tap event only if the mesh over the pointer is the attached mesh of this script.
     */
    @onPointerEvent(PointerEventTypes.POINTERTAP, {
        mode: "attachedMeshOnly"
    })
    public pointerTap(): void {
        console.log("The attached mesh has been tapped!", this.mesh.name);
    }
}
`;

export const onPointerEventDescendantsExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PointerEventTypes, PointerInfo } from "@babylonjs/core/Events/pointerEvents";

import { onPointerEvent } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) { }

    /**
     * Listen for double tap event only if the mesh over the pointer is the attached mesh of this script.
     */
    @onPointerEvent(PointerEventTypes.POINTERTAP, {
        mode: "includeDescendants"
    })
    public pointerTap(info: PointerInfo): void {
        console.log("The attached mesh or one of its descendants has been tapped!", this.mesh.name);
    }
}
`;

export const onKeyboardEventBasicExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { KeyboardEventTypes, KeyboardInfo } from "@babylonjs/core/Events/keyboardEvents";

import { onKeyboardEvent } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) { }

    @onKeyboardEvent(KeyboardEventTypes.KEYDOWN)
    public keyDown(info: KeyboardInfo): void {
        console.log("A key down event has been raised in the scene!", info.event.key);
    }
}
`;

export const onKeyboardEventArrayBasicExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { KeyboardEventTypes, KeyboardInfo } from "@babylonjs/core/Events/keyboardEvents";

import { onKeyboardEvent } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) { }

    @onKeyboardEvent([
        KeyboardEventTypes.KEYUP,
        KeyboardEventTypes.KEYDOWN
    ])
    public keyDown(info: KeyboardInfo): void {
        console.log("A key down event has been raised in the scene!", info.type, " with key: ", info.event.key);
    }
}
`;
