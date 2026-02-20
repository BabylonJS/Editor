import { getUnityProp } from "./utils";

/**
 * Convert Unity ParticleSystem shape to our emitter shape.
 * Supports both property and m_Property names (Unity serialization).
 */
export function convertShape(shapeModule: any): any {
	if (!shapeModule) return { type: "point" };
	const enabled = getUnityProp(shapeModule, "enabled") ?? shapeModule.enabled;
	if (enabled !== "1") return { type: "point" };

	const shapeType = String(getUnityProp(shapeModule, "type") ?? shapeModule.type ?? "0");
	const radiusObj = getUnityProp(shapeModule, "radius") ?? shapeModule.radius;
	const radiusVal = radiusObj?.value ?? radiusObj?.m_Value ?? "1";
	const arcObj = getUnityProp(shapeModule, "arc") ?? shapeModule.arc;
	const arcVal = arcObj?.value ?? arcObj?.m_Value ?? "360";
	const thickness = parseFloat(getUnityProp(shapeModule, "radiusThickness") ?? shapeModule.radiusThickness ?? "1");
	const angleObj = getUnityProp(shapeModule, "angle") ?? shapeModule.angle;
	const angleVal = angleObj?.value ?? angleObj?.m_Value ?? "25";
	const boxThickness = getUnityProp(shapeModule, "boxThickness") ?? shapeModule.boxThickness;

	switch (shapeType) {
		case "0": // Sphere
			return {
				type: "sphere",
				radius: parseFloat(radiusVal),
				arc: (parseFloat(arcVal) / 180) * Math.PI,
				thickness,
			};
		case "4": // Cone
			return {
				type: "cone",
				radius: parseFloat(radiusVal),
				arc: (parseFloat(arcVal) / 180) * Math.PI,
				thickness,
				angle: (parseFloat(angleVal) / 180) * Math.PI,
			};
		case "5": // Box
			return {
				type: "box",
				width: parseFloat(boxThickness?.x ?? boxThickness?.m_X ?? "1"),
				height: parseFloat(boxThickness?.y ?? boxThickness?.m_Y ?? "1"),
				depth: parseFloat(boxThickness?.z ?? boxThickness?.m_Z ?? "1"),
			};
		case "10": // Circle
			return {
				type: "sphere",
				radius: parseFloat(radiusVal),
				arc: (parseFloat(arcVal) / 180) * Math.PI,
			};
		default:
			return { type: "point" };
	}
}
