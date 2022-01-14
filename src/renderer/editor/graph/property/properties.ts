export interface IObjectProperty {
	/**
	 * Defines the name of the property.
	 */
    name: string;
	/**
	 * Defines the type of the property.
	 */
    type: string;
}

export const objectProperties: Record<string, IObjectProperty[]> = {
    "Vector2": [
        { name: "x", type: "number" },
        { name: "y", type: "number" },
    ],
    "Vector3": [
        { name: "x", type: "number" },
        { name: "y", type: "number" },
        { name: "z", type: "number" },
    ],
    "Node": [
        { name: "name", type: "string" },
    ],
    "TransformNode": [
        { name: "position", type: "Vector3" },
        { name: "rotation", type: "Vector3" },
        { name: "scaling", type: "Vector3" },
    ],
    "AbstractMesh": [
        { name: "material", type: "Material" },
    ],
};
