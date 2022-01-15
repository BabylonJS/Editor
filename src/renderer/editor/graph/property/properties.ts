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

    "TargetCamera": [
        { name: "speed", type: "number" },
    ],
    "FreeCamera": [
        { name: "angularSensibility", type: "number" },
    ],
    "TouchCamera": [
        { name: "touchAngularSensibility", type: "number" },
    ],
    "UniversalCamera": [
        { name: "gamepadAngularSensibility", type: "number" },
    ],

    "AbstractMesh": [
        { name: "material", type: "Material" },
    ],

    "Light": [
        { name: "diffuse", type: "Color3" },
        { name: "specular", type: "Color3" },
        { name: "intensity", type: "number" },
        { name: "range", type: "number" },
        { name: "radius", type: "number" },
        { name: "shadowEnabled", type: "boolean" },
    ],
    "ShadowLight": [
        { name: "position", type: "Vector3" },
        { name: "direction", type: "Vector3" },
        { name: "shadowMinZ", type: "number" },
        { name: "shadowMaxZ", type: "number" },
    ],
    "SpotLight": [
        { name: "angle", type: "number" },
        { name: "innerAngle", type: "number" },
        { name: "shadowAngleScale", type: "number" },
        { name: "exponent", type: "number" },
        { name: "projectionTexture", type: "BaseTexture" },
    ],
    "DirectionalLight": [
        { name: "shadowFrustumSize", type: "number" },
        { name: "shadowOrthoScale", type: "number" },
        { name: "autoUpdateExtends", type: "boolean" },
        { name: "autoCalcShadowZBounds", type: "boolean" },
    ],
};
