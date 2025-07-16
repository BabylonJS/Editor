/**
 * Sets the given value (`newValue`) to the property located in the given object.
 * @param object defines the root object where to parse the property and set its value.
 * @param property defines the path of the property to set its value.
 * @param newValue defines the new value to set to the property.
 */
export function setInspectorEffectivePropertyValue(object: any, property: string, newValue: any): void {
	const parts = property.split('.');

	let value = object;

	for (let i = 0; i < parts.length - 1; ++i) {
		value = value[parts[i]];
	}

	value[parts[parts.length - 1]] = newValue;
}

/**
 * Returns the current value of the given property of the given object.
 * @param object defines the root object where to parse the property and return its value.
 * @param property defines the path of the property to get its value.
 * @example getInspectorPropertyValue(scene, "ambientColor");
 * @example getInspectorPropertyValue(scene, "ambientColor.r");
 */
export function getInspectorPropertyValue(object: any, property: string) {
	const parts = property.split('.');

	let value = object;

	for (let i = 0; i < parts.length; ++i) {
		value = value[parts[i]];
	}

	return value;
}
