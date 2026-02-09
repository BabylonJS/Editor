/**
 * Convert Unity ParticleSystem shape to our emitter shape
 */
export function convertShape(shapeModule: any): any {
	if (!shapeModule || shapeModule.enabled !== "1") {
		return { type: "point" }; // Default to point emitter
	}

	const shapeType = shapeModule.type;

	switch (shapeType) {
		case "0": // Sphere
			return {
				type: "sphere",
				radius: parseFloat(shapeModule.radius?.value || "1"),
				arc: (parseFloat(shapeModule.arc?.value || "360") / 180) * Math.PI,
				thickness: parseFloat(shapeModule.radiusThickness || "1"),
			};
		case "4": // Cone
			return {
				type: "cone",
				radius: parseFloat(shapeModule.radius?.value || "1"),
				arc: (parseFloat(shapeModule.arc?.value || "360") / 180) * Math.PI,
				thickness: parseFloat(shapeModule.radiusThickness || "1"),
				angle: (parseFloat(shapeModule.angle?.value || "25") / 180) * Math.PI,
			};
		case "5": // Box
			return {
				type: "box",
				width: parseFloat(shapeModule.boxThickness?.x || "1"),
				height: parseFloat(shapeModule.boxThickness?.y || "1"),
				depth: parseFloat(shapeModule.boxThickness?.z || "1"),
			};
		case "10": // Circle
			return {
				type: "sphere", // Use sphere with arc for circle
				radius: parseFloat(shapeModule.radius?.value || "1"),
				arc: (parseFloat(shapeModule.arc?.value || "360") / 180) * Math.PI,
			};
		default:
			return { type: "point" };
	}
}
