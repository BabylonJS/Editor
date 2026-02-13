/**
 * Helper utilities for Unity converter
 */

/**
 * Helper to get component by type from GameObject
 */
export function getComponentByType(gameObject: any, componentType: string, components: Map<string, any>): any | null {
	if (!gameObject.m_Component) {
		return null;
	}

	for (const compRef of gameObject.m_Component) {
		const compId = compRef.component?.fileID || compRef.component;
		const comp = components.get(compId);
		if (comp && comp[componentType]) {
			return comp[componentType];
		}
	}

	return null;
}

/**
 * Find root GameObject in hierarchy (Transform with no parent)
 * Based on original Unity converter logic
 */
export function findRootGameObject(components: Map<string, any>): string | null {
	// Look for Transform component with m_Father.fileID === "0"
	let transformCount = 0;
	let gameObjectCount = 0;

	for (const [_id, comp] of components) {
		if (comp.Transform) {
			transformCount++;
		}
		if (comp.GameObject) {
			gameObjectCount++;
		}

		// Check if this component is a Transform
		if (comp.Transform) {
			// Check if Transform has m_Father with fileID === "0" (no parent = root)
			if (comp.Transform.m_Father !== undefined && comp.Transform.m_Father !== null) {
				const fatherFileID = typeof comp.Transform.m_Father === "object" ? comp.Transform.m_Father.fileID : comp.Transform.m_Father;
				const fatherFileIDStr = String(fatherFileID);

				if (fatherFileIDStr === "0") {
					// Found root Transform, get the GameObject it belongs to
					const gameObjectRef = comp.Transform.m_GameObject;
					if (gameObjectRef) {
						const gameObjectFileID = typeof gameObjectRef === "object" ? gameObjectRef.fileID : gameObjectRef;
						const gameObjectFileIDStr = String(gameObjectFileID);

						// IMPORTANT: Return the component ID (key in Map) that contains this GameObject
						// The gameObjectFileIDStr is the fileID reference, but we need to find the component with that ID
						// Components are stored with their YAML anchor ID as the key (e.g., "195608")
						const gameObjectComponent = components.get(gameObjectFileIDStr);
						if (gameObjectComponent && gameObjectComponent.GameObject) {
							return gameObjectFileIDStr; // This is the component ID/key
						}
					}
				}
			} else if (comp.Transform.m_GameObject) {
				// If no m_Father, it might be root (check if it's the only Transform)
				const gameObjectRef = comp.Transform.m_GameObject;
				const gameObjectFileID = typeof gameObjectRef === "object" ? gameObjectRef.fileID : gameObjectRef;
				// Try this as root if we don't find one with m_Father === "0"
				const candidate = String(gameObjectFileID);
				// But first check if there's a Transform with explicit m_Father === "0"
				let hasExplicitRoot = false;
				for (const [_id2, comp2] of components) {
					if (comp2.Transform && comp2.Transform.m_Father !== undefined && comp2.Transform.m_Father !== null) {
						const fatherFileID2 = typeof comp2.Transform.m_Father === "object" ? comp2.Transform.m_Father.fileID : comp2.Transform.m_Father;
						if (String(fatherFileID2) === "0") {
							hasExplicitRoot = true;
							break;
						}
					}
				}
				if (!hasExplicitRoot) {
					return candidate;
				}
			}
		}
	}

	// Fallback: find first GameObject if no root Transform found
	for (const [_id, comp] of components) {
		if (comp.GameObject) {
			return _id; // Use component ID as GameObject ID
		}
	}

	return null;
}

/**
 * Unity to Babylon.js coordinate system conversion
 * Unity: Y-up, left-handed → Babylon.js: Y-up, left-handed (same!)
 * But Quarks was Three.js (right-handed), so no conversion needed for us
 */
export function convertVector3(unityVec: { x: string; y: string; z: string }): [number, number, number] {
	return [parseFloat(unityVec.x), parseFloat(unityVec.y), parseFloat(unityVec.z)];
}
