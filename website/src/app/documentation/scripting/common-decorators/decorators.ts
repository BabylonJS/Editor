export const nodeFromScene = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

import { nodeFromScene } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @nodeFromScene("Other Mesh")
    private _otherMesh: Mesh | null = null;

    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        console.log(this.otherMesh);
    }
}
`;

export const nodeFromDescendants = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

import { nodeFromDescendants } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @nodeFromDescendants("Other Mesh")
    private _otherMesh: Mesh | null = null;

    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        console.log(this.otherMesh);
    }
}
`;

export const animationGroupFromScene = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

import { animationGroupFromScene } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @animationGroupFromScene("Idle")
    private _idle: AnimationGroup | null = null;

    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        this._idle.play();
    }
}
`;

export const sceneAsset = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

import { sceneAsset, AdvancedAssetContainer } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @sceneAsset("enemy.scene")
    private _enemy: AdvancedAssetContainer | null = null;

    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        // The container is instantiated by default. You can call .removeDefault() to remove the default instances.
        this._enemy.removeDefault();
        
        // Otherwise, you can keep the default instance and use it in your scene.
        // this._enemy.removeDefault();

        // If the container is used to instantiate multiple entities like enemies, you can call .instantiate().
        for (let i = 0; i < 10; i++) {
            const enemy = this._enemy.instantiate({
                doNotInstantiate: (node) => node.name === "DontInstantiateMe",
                predicate: (entity) => entity.name.startsWith("Enemy"),
            });

            // You can dispose the instantiated entries using .dispose
            enemy.dispose();
        }
    }
}
`;

export const componentFromScene = `
// my-component.ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";

import { nodeFromScene } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @componentFromScene(MyOtherComponentClass)
    private _myComponennt: MyOtherComponentClass;

    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        this._myComponennt.sayHello();
    }
}

// my-other-component.ts
export default class MyOtherComponentClass {
    ...

    public sayHello(): void {
        console.log("Hello!");
    }
}
`;
