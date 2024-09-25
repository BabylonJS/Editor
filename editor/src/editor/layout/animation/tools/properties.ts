import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

/**
 * Returns all the possible animatable properties for the given object.
 * @param object defines the root object to check keys for animatable properties.
 * @param deep defines how deep the search should traverse objects to get properties (a.b.c.d.etc.).
 */
export function getAllAnimatableProperties(object: any, deep: number = 5, _processedObjects: any[] = []): string[] {
    const properties: string[] = [];

    for (let key of Object.keys(object)) {
        if (key.startsWith("_")) {
            key = key.substring(key.lastIndexOf("_") + 1);
        }

        const value = object[key];
        if (value === null || value === undefined) {
            continue;
        }

        const animationType = getAnimationTypeForObject(value);
        if (animationType !== null) {
            properties.push(key);
        }

        if (typeof value === "object" && !Array.isArray(value) && !_processedObjects.includes(value)) {
            _processedObjects.push(value);

            const otherProperties = deep > 0
                ? getAllAnimatableProperties(value, deep - 1, _processedObjects)
                : [];

            properties.push(...otherProperties.map((p) => `${key}.${p}`));
        }
    }

    return properties;
}
