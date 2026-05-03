import { describe, expect, test, vi } from "vitest";

import { getNodeByName, getNodeById } from "../../src/tools/scene";

describe("tools/scene", () => {
	const sceneGetNodeResult = {};
	const clusteredLightContainerResult = {
		lights: [
			{
				id: "lightId",
				name: "lightName",
			},
		],
		getClassName: () => "ClusteredLightContainer",
	};

	const scene = {
		lights: [clusteredLightContainerResult],
		getNodeById: vi.fn().mockImplementation((id) => id === "node" && sceneGetNodeResult),
		getNodeByName: vi.fn().mockImplementation((name) => name === "node" && sceneGetNodeResult),
	} as any;

	describe("getNodeByName", () => {
		test("should return the node identified by the given name", () => {
			expect(getNodeByName("node", scene)).toBe(sceneGetNodeResult);
		});

		test("should return the light contained in a clustered light container if its name is the given one", () => {
			expect(getNodeByName("lightName", scene)).toBe(clusteredLightContainerResult.lights[0]);
		});

		test("should return null when node not found", () => {
			expect(getNodeByName("unknown", scene)).toBeNull();
		});
	});

	describe("getNodeById", () => {
		test("should return the node identified by the given name", () => {
			expect(getNodeById("node", scene)).toBe(sceneGetNodeResult);
		});

		test("should return the light contained in a clustered light container if its name is the given one", () => {
			expect(getNodeById("lightId", scene)).toBe(clusteredLightContainerResult.lights[0]);
		});

		test("should return null when node not found", () => {
			expect(getNodeById("unknown", scene)).toBeNull();
		});
	});
});
