import { describe, expect, test } from "vitest";

import { createTransformNode } from "@babylonjs/lite";

import { createTestScene, stepTestScene } from "../helpers";
import { getAnimationGroupByName, getNodeById, getNodeByName, getNodeScene, getSceneData, getSceneNodes, registerSceneNode } from "../../src/tools/scene";
import { EditorAnimationGroup } from "../../src/animation/animation-group";

describe("tools/scene", () => {
	test("should register the nodes of the scene and find them by name and id", () => {
		const { scene } = createTestScene();

		const node = createTransformNode("node");
		node.id = "nodeId";
		registerSceneNode(scene, node, "transformNode");

		const light = createTransformNode("lightName");
		light.id = "lightId";
		registerSceneNode(scene, light, "light");

		expect(getSceneData(scene).transformNodes).toContain(node);
		expect(getSceneData(scene).lights).toContain(light);
		expect(getSceneNodes(scene)).toEqual([node, light]);
		expect(getNodeScene(node)).toBe(scene);

		expect(getNodeByName("node", scene)).toBe(node);
		expect(getNodeByName("lightName", scene)).toBe(light);
		expect(getNodeByName("unknown", scene)).toBeNull();

		expect(getNodeById("nodeId", scene)).toBe(node);
		expect(getNodeById("lightId", scene)).toBe(light);
		expect(getNodeById("unknown", scene)).toBeNull();
	});

	test("should not register the same node twice", () => {
		const { scene } = createTestScene();

		const node = createTransformNode("node");
		registerSceneNode(scene, node, "transformNode");
		registerSceneNode(scene, node, "transformNode");

		expect(getSceneData(scene).transformNodes.length).toBe(1);
	});

	test("should notify the observables in order each frame", () => {
		const { engine, scene } = createTestScene();
		const sceneData = getSceneData(scene);

		const calls: string[] = [];
		sceneData.onBeginFrameObservable.add(() => calls.push("begin"));
		sceneData.onAfterAnimationsObservable.add(() => calls.push("afterAnimations"));
		sceneData.onBeforeRenderObservable.add(() => calls.push("beforeRender"));

		stepTestScene(engine, scene, 2);

		expect(calls).toEqual(["begin", "afterAnimations", "beforeRender", "begin", "afterAnimations", "beforeRender"]);
		expect(sceneData.frameId).toBe(2);
	});

	test("should find the animation groups by name", () => {
		const { scene } = createTestScene();
		const animationGroup = new EditorAnimationGroup("MyAnimationGroup", scene);

		expect(getAnimationGroupByName("MyAnimationGroup", scene)).toBe(animationGroup);
		expect(getAnimationGroupByName("unknown", scene)).toBeNull();
	});
});
