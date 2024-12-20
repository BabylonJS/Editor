import { Material } from "babylonjs";

import { isNodeMaterial, isPBRMaterial, isStandardMaterial } from "../guards/material";

/**
 * Configures the given material to receive up to 32 lights simultaneously.
 * @param material defines the reference to the material to configure.
 */
export function configureSimultaneousLightsForMaterial(material: Material) {
    if (isPBRMaterial(material) || isStandardMaterial(material) || isNodeMaterial(material)) {
        material.maxSimultaneousLights = 32;
    }
}
