import { Scene, Material, SerializationHelper, PBRMaterial } from 'babylonjs';

export default class ProjectHelpers {
    /**
     * Parses the existing material using the given serialized values
     * @param material the material to parse.
     * @param serializedValues the previously serialized values.
     * @param scene the scene containing the material.
     * @param rootUrl the root URL used while parsing.
     */
    public static ParseExistingMaterial(material: Material, serializedValues: any, scene: Scene, rootUrl: string): Material {
        SerializationHelper.Parse(() => material, serializedValues, scene, 'file:');

        if (material instanceof PBRMaterial) {
            if (serializedValues.clearCoat) material.clearCoat.parse(serializedValues.clearCoat, scene, rootUrl);
            if (serializedValues.anisotropy) material.anisotropy.parse(serializedValues.anisotropy, scene, rootUrl);
            if (serializedValues.brdf) material.brdf.parse(serializedValues.brdf, scene, rootUrl);
            if (serializedValues.sheen) material.sheen.parse(serializedValues.sheen, scene, rootUrl);
            if (serializedValues.subSurface) material.subSurface.parse(serializedValues.subSurface, scene, rootUrl);
        }

        return material;
    }
}
