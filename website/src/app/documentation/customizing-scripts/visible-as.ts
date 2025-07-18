export const visibleAsBooleanDecoratorsExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

import { visibleAsBoolean } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsBoolean("Rotation Enabled", {
        description: "Enables or disables rotation of the object."
    })
    private _rotationEnabled: boolean = true;

    public constructor(public mesh: Mesh) { }

    public onUpdate(): void {
        if (this._rotationEnabled) {
            this.mesh.rotation.y += 0.04 * this.mesh.getScene().getAnimationRatio();
        }
    }
}
`;

export const visibleAsNumberDecoratorsExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

import { visibleAsNumber } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsNumber("Rotation Speed", {
        min: 0,
        max: 10,
        step: 0.1,
    })
    private _rotationSpeed: number = 1;

    public constructor(public mesh: Mesh) { }

    public onUpdate(): void {
        this.mesh.rotation.y += this._rotationSpeed * this.mesh.getScene().getAnimationRatio();
    }
}
`;

export const visibleAsVector2DecoratorsExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector2 } from "@babylonjs/core/Maths/math.vector";

import { visibleAsVector2 } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsVector2("Rotation Speed XY")
    private _rotationSpeed: Vector2 = Vector2.Zero();

    public constructor(public mesh: Mesh) { }

    public onUpdate(): void {
        this.mesh.rotation.x += this._rotationSpeed.x * this.mesh.getScene().getAnimationRatio();
        this.mesh.rotation.y += this._rotationSpeed.y * this.mesh.getScene().getAnimationRatio();
    }
}
`;

export const visibleAsVector3DecoratorsExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { visibleAsVector3 } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsVector3("Rotation Speed XYZ")
    private _rotationSpeed: Vector3 = Vector3.Zero();

    public constructor(public mesh: Mesh) { }

    public onUpdate(): void {
        this.mesh.rotation.x += this._rotationSpeed.x * this.mesh.getScene().getAnimationRatio();
        this.mesh.rotation.y += this._rotationSpeed.y * this.mesh.getScene().getAnimationRatio();
        this.mesh.rotation.z += this._rotationSpeed.z * this.mesh.getScene().getAnimationRatio();
    }
}
`;

export const visibleAsColor3DecoratorsExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Color3 } from "@babylonjs/core/Maths/math.color";

import { visibleAsColor3 } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsColor3("Clear Color RGB")
    private _clearColor: Color3 = Color3.Black();

    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        const scene = this.mesh.getScene();
        scene.clearColor.r = this._clearColor.r;
        scene.clearColor.g = this._clearColor.g;
        scene.clearColor.b = this._clearColor.b;
    }
}
`;

export const visibleAsColor4DecoratorsExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Color4 } from "@babylonjs/core/Maths/math.color";

import { visibleAsColor4 } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    @visibleAsColor4("Clear Color")
    private _clearColor: Color4 = new Color4(0, 0, 0, 1);

    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        const scene = this.mesh.getScene();
        scene.clearColor.copyFrom(this._clearColor);
    }
}
`;

export const visibleAsEntityDecoratorsExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

import { visibleAsEntity } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    visibleAsEntity("particleSystem", "Fire Particle System", {
        description: "The particle system used to start the fire effect.",
    });
    private _fireParticleSystem!: ParticleSystem;

    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        this._fireParticleSystem.start();
    }
}
`;
