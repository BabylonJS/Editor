import { describe, expect, test, vi } from "vitest";

import { createTransformNode, SceneNode } from "@babylonjs/lite";

import { createTestScene } from "../helpers";
import { registerSceneNode, getSceneData } from "../../src/tools/scene";
import { disposeNode, getNodeDescendants, getOnDisposeObservable, isNodeDisposed, isNodeEnabled, setNodeEnabled } from "../../src/tools/node";

function createHierarchy(): { root: SceneNode; child: SceneNode; grandChild: SceneNode } {
	const root = createTransformNode("root");
	const child = createTransformNode("child");
	const grandChild = createTransformNode("grandChild");

	child.parent = root;
	root.children.push(child);

	grandChild.parent = child;
	child.children.push(grandChild);

	return { root, child, grandChild };
}

describe("tools/node", () => {
	test("should return the descendants of a node", () => {
		const { root, child, grandChild } = createHierarchy();

		expect(getNodeDescendants(root)).toEqual([child, grandChild]);
		expect(getNodeDescendants(root, true)).toEqual([child]);
		expect(getNodeDescendants(root, false, (node) => node.name === "grandChild")).toEqual([grandChild]);
	});

	test("should handle the enabled state of the nodes and their ancestors", () => {
		const { root, child, grandChild } = createHierarchy();

		expect(isNodeEnabled(grandChild)).toBeTruthy();

		setNodeEnabled(root, false);

		expect(isNodeEnabled(root)).toBeFalsy();
		expect(isNodeEnabled(child)).toBeFalsy();
		expect(isNodeEnabled(child, false)).toBeTruthy();
		expect(grandChild.visible).toBe(false);

		setNodeEnabled(root, true);

		expect(isNodeEnabled(grandChild)).toBeTruthy();
		expect(grandChild.visible).toBe(true);
	});

	test("should dispose the nodes and notify the observers", () => {
		const { scene } = createTestScene();
		const { root, child, grandChild } = createHierarchy();

		[root, child, grandChild].forEach((node) => registerSceneNode(scene, node, "transformNode"));

		const onDispose = vi.fn();
		getOnDisposeObservable(grandChild).add(onDispose);

		disposeNode(scene, root);

		expect(onDispose).toHaveBeenCalledTimes(1);
		expect(isNodeDisposed(root)).toBeTruthy();
		expect(isNodeDisposed(grandChild)).toBeTruthy();
		expect(getSceneData(scene).transformNodes.length).toBe(0);
	});

	test("should keep and detach the descendants when disposing without recursion", () => {
		const { scene } = createTestScene();
		const { root, child } = createHierarchy();

		[root, child].forEach((node) => registerSceneNode(scene, node, "transformNode"));

		disposeNode(scene, root, true);

		expect(isNodeDisposed(root)).toBeTruthy();
		expect(isNodeDisposed(child)).toBeFalsy();
		expect(child.parent).toBeNull();
		expect(getSceneData(scene).transformNodes).toEqual([child]);
	});
});
