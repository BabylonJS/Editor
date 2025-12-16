import { Particle, SolidParticle } from "babylonjs";
import type { OrbitOverLifeBehavior } from "../types/behaviors";
import { extractNumberFromValue, interpolateGradientKeys } from "./utils";
import { ValueUtils } from "../utils/valueParser";
import type { Value } from "../types/values";

/**
 * Apply OrbitOverLife behavior to Particle
 * Gets lifeRatio from particle (age / lifeTime)
 */
export function applyOrbitOverLifePS(particle: Particle, behavior: OrbitOverLifeBehavior): void {
	if (!behavior.radius || particle.lifeTime <= 0) {
		return;
	}

	// Get lifeRatio from particle
	const lifeRatio = particle.age / particle.lifeTime;

	// Parse radius (can be Value with keys or constant/interval)
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
		// Parse as Value (number, ConstantValue, or IntervalValue)
		const parsedRadius = ValueUtils.parseIntervalValue(radiusValue as Value);
		radius = parsedRadius.min + (parsedRadius.max - parsedRadius.min) * lifeRatio;
	}

	const speed = behavior.speed !== undefined ? ValueUtils.parseConstantValue(behavior.speed) : 1;
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
 * Gets lifeRatio from particle (age / lifeTime)
 */
export function applyOrbitOverLifeSPS(particle: SolidParticle, behavior: OrbitOverLifeBehavior): void {
	if (!behavior.radius || particle.lifeTime <= 0) {
		return;
	}

	// Get lifeRatio from particle
	const lifeRatio = particle.age / particle.lifeTime;

	// Parse radius (can be Value with keys or constant/interval)
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
		// Parse as Value (number, ConstantValue, or IntervalValue)
		const parsedRadius = ValueUtils.parseIntervalValue(radiusValue as Value);
		radius = parsedRadius.min + (parsedRadius.max - parsedRadius.min) * lifeRatio;
	}

	const speed = behavior.speed !== undefined ? ValueUtils.parseConstantValue(behavior.speed) : 1;
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
