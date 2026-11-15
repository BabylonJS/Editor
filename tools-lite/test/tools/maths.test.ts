import { describe, expect, test } from "vitest";

import { babylonEulerToQuaternion, quaternionToBabylonEuler } from "../../src/tools/maths";

function expectArrayCloseTo(actual: number[], expected: number[]): void {
	expect(actual.length).toBe(expected.length);
	actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 5));
}

describe("tools/maths", () => {
	describe("babylonEulerToQuaternion", () => {
		test("should convert Euler angles using the Babylon.js convention (yaw, pitch, roll)", () => {
			const s = Math.sin(Math.PI / 4);
			const c = Math.cos(Math.PI / 4);

			expectArrayCloseTo(babylonEulerToQuaternion(0, Math.PI / 2, 0), [0, s, 0, c]);
			expectArrayCloseTo(babylonEulerToQuaternion(Math.PI / 2, 0, 0), [s, 0, 0, c]);
			expectArrayCloseTo(babylonEulerToQuaternion(0, 0, Math.PI / 2), [0, 0, s, c]);

			// Same as Babylon.js Quaternion.RotationYawPitchRoll(0.3, 0.2, 0.1).
			expectArrayCloseTo(babylonEulerToQuaternion(0.2, 0.3, 0.1), [0.1060205, 0.1435722, 0.0342708, 0.9833474]);
		});
	});

	describe("quaternionToBabylonEuler", () => {
		test("should convert back the quaternions to the Euler angles", () => {
			const angles: [number, number, number][] = [
				[0.2, 0.3, 0.1],
				[-0.5, 1.2, 0.7],
				[0, -2, 0.4],
			];

			angles.forEach((euler) => {
				const q = babylonEulerToQuaternion(euler[0], euler[1], euler[2]);
				expectArrayCloseTo(quaternionToBabylonEuler(q[0], q[1], q[2], q[3]), euler);
			});
		});
	});
});
