import {
    PBRMaterial, DynamicTexture, serializeAsTexture, Nullable,
    SerializationHelper, Scene, RegisterClass,
} from "babylonjs";

/**
 * This class is used to mix materials using the materialx mixer. It extends the PBR material
 * of Babylon.JS and is not intended to be used direectly.
 */
export class MixedMaterial extends PBRMaterial {
    /**
     * Defines the list of all materials to mix together. It is limited to 4 materials.
     */
    public readonly mixedMaterials: PBRMaterial[] = new Array<PBRMaterial>(4);

    /**
     * Defines the reference to the mix map used while paiting weights in the editor.
     * Each material uses its own channel (R, G, B and A).
     */
    @serializeAsTexture()
    public readonly mixMap: Nullable<DynamicTexture>;

    /**
     * Returns the name of this material class.
     */
    public getClassName(): string {
        return "MixedMaterial";
    }

    /**
     * Serializes this material and returns its JSON representation.
     */
    public serialize(): any {
        return SerializationHelper.Serialize(this, {
            customType: "BABYLON.MixedMaterial",
            mixedMaterials: this.mixedMaterials.map((m) => m?.id ?? null),
        });
    }

    /**
     * Parses the given material from its JSON representation.
     * @param source defines the reference to the JSON representation of the serialized material.
     * @param scene defines the reference to the scene the material should be added to.
     * @param rootUrl defines the root Url used to apply on Urls for lodable resources.
     */
    public static Parse(source: any, scene: Scene, rootUrl: string): MixedMaterial {
        const material = SerializationHelper.Parse(() => new MixedMaterial(source.name, scene), source, scene, rootUrl);

        const mixedMaterials = source.mixedMaterials.map((m) => scene.getMaterialByID(m)).filter((m) => m);
        mixedMaterials.forEach((m, index) => {
            material.mixedMaterials[index] = m;
        });

        return material;
    }
}

RegisterClass("BABYLON.MixedMaterial", MixedMaterial);
