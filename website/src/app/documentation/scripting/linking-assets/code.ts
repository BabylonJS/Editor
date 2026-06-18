export const linkingJsonExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";

import { visibleAsAsset } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) { }

    @visibleAsAsset("json", "My JSON asset")
    private _json!: MyJsonTypeOrAny;

    public onStart(): void {
        console.log(this._json.name);
    }
}
`;

export const linkingMaterialExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";

import { visibleAsAsset } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) { }

    @visibleAsAsset("material", "My material asset")
    private _material!: PBRMaterial;

    public onStart(): void {
        this.mesh.material = this._material;
    }
}
`;

export const linkingRestrictedMaterialExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";

import { visibleAsAsset } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) { }

    @visibleAsAsset("material", "My material asset", {
        typeRestriction: "PBRMaterial",
    })
    private _material!: PBRMaterial;

    public onStart(): void {
        this.mesh.material = this._material;
    }
}
`;

export const linkingGuiExample = `
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

import { visibleAsAsset } from "babylonjs-editor-tools";

export default class MyMeshComponent {
    public constructor(public mesh: Mesh) { }

    @visibleAsAsset("gui", "My GUI asset")
    private _gui!: AdvancedDynamicTexture;

    public onStart(): void {
        this._gui.addControl(...);
    }
}
`;
