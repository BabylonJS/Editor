import type { Particle } from "@babylonjs/core/Particles/particle";
import type { SolidParticle } from "@babylonjs/core/Particles/solidParticle";
import type { VFXOrbitOverLifeBehavior } from "../types/behaviors";
import { extractNumberFromValue, interpolateGradientKeys } from "./utils";
import { VFXValueParser } from "../parsers/VFXValueParser";

/**
 * Apply OrbitOverLife behavior to Particle
 */
export function applyOrbitOverLifePS(particle: Particle, behavior: VFXOrbitOverLifeBehavior, lifeRatio: number, valueParser: VFXValueParser): void {
	if (!behavior.radius) {
		return;
	}

	// Parse radius (can be VFXValue with keys or constant/interval)
	let radius = 1;
	const radiusValue = behavior.radius;

	// Check if radius is an object with keys (gradient)
	if (
		radiusValue !== undefined &&
		radiusValue !== null &&
		typeof radiusValue === "object" &&
		"keys" in radiusValue &&
		Array.isArray(radiusValue.keys) &&
		radiusValue.keys.length > 0
	) {
		radius = interpolateGradientKeys(radiusValue.keys, lifeRatio, extractNumberFromValue);
	} else if (radiusValue !== undefined && radiusValue !== null) {
		// Parse as VFXValue (number, VFXConstantValue, or VFXIntervalValue)
		const parsedRadius = valueParser.parseIntervalValue(radiusValue as import("../types/values").VFXValue);
		radius = parsedRadius.min + (parsedRadius.max - parsedRadius.min) * lifeRatio;
	}

	const speed = behavior.speed !== undefined ? valueParser.parseConstantValue(behavior.speed) : 1;
	const angle = lifeRatio * speed * Math.PI * 2;

	// Calculate orbit offset relative to center
	const centerX = behavior.center?.x ?? 0;
	const centerY = behavior.center?.y ?? 0;
	const centerZ = behavior.center?.z ?? 0;

	const orbitX = Math.cos(angle) * radius;
	const orbitY = Math.sin(angle) * radius;
	const orbitZ = 0; // 2D orbit

	// Apply orbit offset to particle position
	if (particle.position) {
		particle.position.x = centerX + orbitX;
		particle.position.y = centerY + orbitY;
		particle.position.z = centerZ + orbitZ;
	}
}

/**
 * Apply OrbitOverLife behavior to SolidParticle
 */
export function applyOrbitOverLifeSPS(particle: SolidParticle, behavior: VFXOrbitOverLifeBehavior, lifeRatio: number, valueParser: VFXValueParser): void {
	if (!behavior.radius) {
		return;
	}

	// Parse radius (can be VFXValue with keys or constant/interval)
	let radius = 1;
	const radiusValue = behavior.radius;

	// Check if radius is an object with keys (gradient)
	if (
		radiusValue !== undefined &&
		radiusValue !== null &&
		typeof radiusValue === "object" &&
		"keys" in radiusValue &&
		Array.isArray(radiusValue.keys) &&
		radiusValue.keys.length > 0
	) {
		radius = interpolateGradientKeys(radiusValue.keys, lifeRatio, extractNumberFromValue);
	} else if (radiusValue !== undefined && radiusValue !== null) {
		// Parse as VFXValue (number, VFXConstantValue, or VFXIntervalValue)
		const parsedRadius = valueParser.parseIntervalValue(radiusValue as import("../types/values").VFXValue);
		radius = parsedRadius.min + (parsedRadius.max - parsedRadius.min) * lifeRatio;
	}

	const speed = behavior.speed !== undefined ? valueParser.parseConstantValue(behavior.speed) : 1;
	const angle = lifeRatio * speed * Math.PI * 2;

	// Calculate orbit offset relative to center
	const centerX = behavior.center?.x ?? 0;
	const centerY = behavior.center?.y ?? 0;
	const centerZ = behavior.center?.z ?? 0;

	const orbitX = Math.cos(angle) * radius;
	const orbitY = Math.sin(angle) * radius;
	const orbitZ = 0; // 2D orbit

	// Apply orbit offset to particle position
	particle.position.x = centerX + orbitX;
	particle.position.y = centerY + orbitY;
	particle.position.z = centerZ + orbitZ;
}
