import { describe, expect, test, vi } from "vitest";

import { createTransformNode } from "@babylonjs/lite";

import { createTestScene, stepTestScene } from "../helpers";
import { registerSceneNode } from "../../src/tools/scene";
import { isNodeEnabled } from "../../src/tools/node";
import { parseCinematic } from "../../src/cinematic/parse";
import { ICinematic } from "../../src/cinematic/typings";
import { generateCinematicAnimationGroup } from "../../src/cinematic/generate";

describe("cinematic", () => {
	test("should animate the properties and raise the events of the cinematic", () => {
		const { engine, scene } = createTestScene();

		const node = createTransformNode("node");
		node.id = "nodeId";
		registerSceneNode(scene, node, "transformNode");

		const data: ICinematic = {
			name: "cinematic",
			framesPerSecond: 60,
			outputFramesPerSecond: 60,
			tracks: [
				{
					node: "nodeId",
					propertyPath: "position",
					keyFrameAnimations: [
						{ type: "key", frame: 0, value: [0, 0, 0] },
						{ type: "key", frame: 60, value: [60, 0, 0] },
					],
				},
				{
					keyFrameEvents: [
						{ type: "event", frame: 20, data: { type: "event", eventName: "hello" } },
						{ type: "event", frame: 10, data: { type: "set-enabled", node: "nodeId", value: false } },
					],
				},
			],
		};

		const cinematic = generateCinematicAnimationGroup(parseCinematic(data, scene), scene);

		const onHello = vi.fn();
		cinematic.onEvent("hello", onHello);

		cinematic.play();
		stepTestScene(engine, scene, 30);

		expect(node.position.x).toBeCloseTo(30, 0);
		expect(onHello).toHaveBeenCalledTimes(1);
		expect(isNodeEnabled(node)).toBeFalsy();
	});

	test("should use the Babylon.js Euler convention for the rotation tracks", () => {
		const { engine, scene } = createTestScene();

		const node = createTransformNode("node");
		node.id = "nodeId";
		registerSceneNode(scene, node, "transformNode");

		const data: ICinematic = {
			name: "cinematic",
			framesPerSecond: 60,
			outputFramesPerSecond: 60,
			tracks: [
				{
					node: "nodeId",
					propertyPath: "rotation",
					keyFrameAnimations: [
						{ type: "key", frame: 0, value: [0, 0, 0] },
						{ type: "key", frame: 60, value: [0, Math.PI / 2, 0] },
					],
				},
			],
		};

		const cinematic = generateCinematicAnimationGroup(parseCinematic(data, scene), scene);
		cinematic.play();
		stepTestScene(engine, scene, 61);

		const q = node.rotationQuaternion;
		expect(q.y).toBeCloseTo(Math.sin(Math.PI / 4), 4);
		expect(q.w).toBeCloseTo(Math.cos(Math.PI / 4), 4);
	});
});
