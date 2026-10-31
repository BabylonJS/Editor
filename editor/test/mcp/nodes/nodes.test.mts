import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";

import {
	Animation,
	AnimationGroup,
	ClusteredLightContainer,
	DirectionalLight,
	FreeCamera,
	Mesh,
	MeshBuilder,
	NullEngine,
	ParticleSystem,
	PointLight,
	Scene,
	Skeleton,
	TransformNode,
	Vector3,
} from "babylonjs";

vi.mock("electron", () => ({
	shell: {
		beep: vi.fn(),
	},
}));

vi.mock("babylonjs-editor-tools", () => ({}));

import { Editor } from "../../../src/editor/main";
import { clearUndoRedo, redo, stack, undo } from "../../../src/tools/undoredo";

import { getSceneHierarchy } from "../../../src/mcp/scene/hierarchy";
import { cloneMesh, setMeshVisibility } from "../../../src/mcp/meshes/meshes";
import { cloneGraphNode, deleteNode, getNode, renameNode, selectNode, setNodeParent, setNodeProperties } from "../../../src/mcp/nodes/nodes";

class EditorCamera extends FreeCamera {
	public getClassName(): string {
		return "EditorCamera";
	}
}

function flatten(nodes: any[]): any[] {
	return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

describe("mcp/nodes", () => {
	let engine: NullEngine;
	let scene: Scene;
	let editor: Editor;
	let container: ClusteredLightContainer;
	let options: { editor: Editor };

	beforeEach(() => {
		engine = new NullEngine();
		scene = new Scene(engine);

		vi.spyOn(ClusteredLightContainer, "IsLightSupported").mockImplementation((light) => light.getClassName() === "PointLight");

		container = new ClusteredLightContainer("Clustered Light Container", [], scene);

		editor = {
			layout: {
				graph: {
					refresh: vi.fn(() => Promise.resolve()),
					setSelectedNode: vi.fn(),
					getSelectedNodes: vi.fn(() => []),
				},
				inspector: {
					forceUpdate: vi.fn(),
					setEditedObject: vi.fn(),
				},
				preview: {
					scene,
					clusteredLightContainer: container,
					setCameraPreviewActive: vi.fn(),
					gizmo: {
						setAttachedObject: vi.fn(),
					},
					selectionOutlineLayer: {
						clearSelection: vi.fn(),
					},
					play: {
						scene: null,
						state: {
							playing: false,
						},
					},
				},
			},
		} as any;

		options = { editor };
	});

	afterEach(() => {
		clearUndoRedo();
		vi.restoreAllMocks();

		scene.dispose();
		engine.dispose();
	});

	describe("get_scene_hierarchy", () => {
		test("should show what the graph shows", () => {
			const parent = new Mesh("parent", scene);

			const child = new TransformNode("child", scene);
			child.parent = parent;

			const light = new PointLight("light", Vector3.Zero(), scene);
			container.addLight(light);

			const particleSystem = new ParticleSystem("particles", 1, scene);
			particleSystem.id = "particles-id";
			particleSystem.emitter = parent;

			new Skeleton("skeleton", "skeleton-id", scene);

			const hierarchy = getSceneHierarchy(scene);

			expect(hierarchy.find((n: any) => n.name === "parent").children.map((n: any) => n.name)).toEqual(["child", "particles"]);
			expect(hierarchy.find((n: any) => n.name === container.name).children.map((n: any) => n.id)).toEqual([light.id]);
			expect(hierarchy.find((n: any) => n.id === "skeleton-id").type).toBe("Skeleton");
		});

		test("should hide the nodes internal to the editor", () => {
			const parent = new Mesh("parent", scene);

			new EditorCamera("Editor preview", Vector3.Zero(), scene);

			const hidden = new Mesh("hidden", scene);
			hidden.metadata = { notVisibleInGraph: true };
			hidden.parent = parent;

			const names = flatten(getSceneHierarchy(scene)).map((n) => n.name);

			expect(names).toContain("parent");
			expect(names).not.toContain("hidden");
			expect(names).not.toContain("Editor preview");
		});

		test("should hide the removed nodes", () => {
			const parent = new Mesh("parent", scene);
			const child = new Mesh("child", scene);
			child.parent = parent;

			deleteNode(scene, { nodeId: child.id }, options);
			expect(flatten(getSceneHierarchy(scene)).map((n) => n.name)).not.toContain("child");

			undo();
			expect(flatten(getSceneHierarchy(scene)).map((n) => n.name)).toContain("child");
		});
	});

	describe("rename_node", () => {
		test("should rename with undo/redo support", () => {
			const mesh = new Mesh("old", scene);

			expect(renameNode(scene, { nodeId: mesh.id, newName: "new" }, options).name).toBe("new");
			expect(mesh.name).toBe("new");

			undo();
			expect(mesh.name).toBe("old");

			redo();
			expect(mesh.name).toBe("new");
		});

		test("should rename the lights of the clustered light container", () => {
			const light = new PointLight("light", Vector3.Zero(), scene);
			container.addLight(light);

			renameNode(scene, { nodeId: light.id, newName: "new" }, options);
			expect(light.name).toBe("new");
		});

		test("should rename the objects of the graph which aren't nodes", () => {
			const particleSystem = new ParticleSystem("particles", 1, scene);
			particleSystem.id = "particles-id";

			expect(renameNode(scene, { nodeId: "particles-id", newName: "new" }, options)).toEqual({ id: "particles-id", name: "new", className: "ParticleSystem" });
			expect(particleSystem.name).toBe("new");
		});

		test("should refuse the nodes internal to the editor", () => {
			const camera = new EditorCamera("Editor preview", Vector3.Zero(), scene);

			expect(() => renameNode(scene, { nodeId: camera.id, newName: "new" }, options)).toThrow("internal to the editor");
			expect(camera.name).toBe("Editor preview");
		});
	});

	describe("set_node_parent", () => {
		test("should keep the world transform by default", () => {
			const parent = new Mesh("parent", scene);
			parent.position.set(100, 0, 0);

			const mesh = new Mesh("mesh", scene);
			mesh.position.set(10, 20, 30);

			setNodeParent(scene, { nodeId: mesh.id, parentId: parent.id }, options);

			expect(mesh.parent).toBe(parent);
			expect(mesh.position.asArray()).toEqual([-90, 20, 30]);

			undo();

			expect(mesh.parent).toBeNull();
			expect(mesh.position.asArray()).toEqual([10, 20, 30]);
		});

		test("should keep the local transform when asked", () => {
			const parent = new Mesh("parent", scene);
			parent.position.set(100, 0, 0);

			const mesh = new Mesh("mesh", scene);
			mesh.position.set(10, 20, 30);

			setNodeParent(scene, { nodeId: mesh.id, parentId: parent.id, preserveWorldTransform: false }, options);

			expect(mesh.parent).toBe(parent);
			expect(mesh.position.asArray()).toEqual([10, 20, 30]);
		});

		test("should move to the root of the scene without parent", () => {
			const parent = new Mesh("parent", scene);
			const mesh = new Mesh("mesh", scene);
			mesh.parent = parent;

			setNodeParent(scene, { nodeId: mesh.id }, options);

			expect(mesh.parent).toBeNull();
			expect(scene.rootNodes).toContain(mesh);
		});

		test("should move several nodes in a single undo step", () => {
			const parent = new Mesh("parent", scene);
			const a = new Mesh("a", scene);
			const b = new Mesh("b", scene);

			const result = setNodeParent(scene, { nodeIds: [a.id, b.id], parentId: parent.id }, options);

			expect(result.nodes.map((n: any) => n.name)).toEqual(["a", "b"]);
			expect(stack.length).toBe(1);

			undo();

			expect(a.parent).toBeNull();
			expect(b.parent).toBeNull();
		});

		test("should not add an undo step when there is nothing to do", () => {
			const parent = new Mesh("parent", scene);
			const mesh = new Mesh("mesh", scene);
			mesh.parent = parent;

			setNodeParent(scene, { nodeId: mesh.id, parentId: parent.id }, options);
			setNodeParent(scene, { nodeId: parent.id }, options);

			expect(stack.length).toBe(0);
		});

		// A node which becomes its own ancestor stops the rendering of the editor.
		test("should refuse to move a node under itself or its descendants", () => {
			const parent = new Mesh("parent", scene);
			const child = new Mesh("child", scene);
			child.parent = parent;
			const leaf = new Mesh("leaf", scene);
			leaf.parent = child;

			expect(() => setNodeParent(scene, { nodeId: child.id, parentId: child.id }, options)).toThrow("under itself");
			expect(() => setNodeParent(scene, { nodeId: parent.id, parentId: leaf.id }, options)).toThrow("descendants");

			expect(parent.parent).toBeNull();
			expect(child.parent).toBe(parent);
			expect(stack.length).toBe(0);
		});

		test("should move lights in and out of the clustered light container", () => {
			const parent = new Mesh("parent", scene);
			const light = new PointLight("light", Vector3.Zero(), scene);

			setNodeParent(scene, { nodeId: light.id, parentId: container.id }, options);
			expect(container.lights).toContain(light);

			setNodeParent(scene, { nodeId: light.id, parentId: parent.id }, options);
			expect(container.lights).not.toContain(light);
			expect(light.parent).toBe(parent);
		});

		test("should refuse what the clustered light container doesn't support", () => {
			const mesh = new Mesh("mesh", scene);
			const light = new DirectionalLight("light", Vector3.Down(), scene);

			expect(() => setNodeParent(scene, { nodeId: light.id, parentId: container.id }, options)).toThrow("point and spot lights");
			expect(() => setNodeParent(scene, { nodeId: mesh.id, parentId: container.id }, options)).toThrow("point and spot lights");
		});

		test("should move particle systems to meshes only", () => {
			const emitter = new Mesh("emitter", scene);
			const transformNode = new TransformNode("transformNode", scene);

			const particleSystem = new ParticleSystem("particles", 1, scene);
			particleSystem.id = "particles-id";

			setNodeParent(scene, { nodeId: "particles-id", parentId: emitter.id }, options);
			expect(particleSystem.emitter).toBe(emitter);

			expect(() => setNodeParent(scene, { nodeId: "particles-id", parentId: transformNode.id }, options)).toThrow("can only be moved to a mesh");
			expect(() => setNodeParent(scene, { nodeId: "particles-id" }, options)).toThrow("can only be moved to a mesh");
		});
	});

	describe("delete_node", () => {
		test("should remove the node and its descendants with undo/redo support", () => {
			const parent = new Mesh("parent", scene);
			const child = new Mesh("child", scene);
			child.parent = parent;

			expect(deleteNode(scene, { nodeId: parent.id }, options)).toEqual({ deleted: true });

			expect(scene.meshes).not.toContain(parent);
			expect(scene.meshes).not.toContain(child);
			expect(scene.rootNodes).not.toContain(parent);

			expect(editor.layout.preview.gizmo.setAttachedObject).toHaveBeenCalledWith(null);
			expect(editor.layout.inspector.setEditedObject).toHaveBeenCalledWith(scene);

			undo();

			expect(scene.meshes).toContain(parent);
			expect(scene.meshes).toContain(child);
			expect(child.parent).toBe(parent);

			redo();

			expect(scene.meshes).not.toContain(parent);
		});

		test("should take the removed node out of its parent", () => {
			const parent = new Mesh("parent", scene);
			const child = new Mesh("child", scene);
			child.parent = parent;

			deleteNode(scene, { nodeId: child.id }, options);

			expect(parent.getDescendants()).not.toContain(child);
			expect(scene.rootNodes).not.toContain(child);

			undo();

			expect(child.parent).toBe(parent);
			expect(parent.getDescendants()).toContain(child);
			expect(scene.rootNodes).not.toContain(child);
		});

		test("should remove what depends on the node", () => {
			const mesh = new Mesh("mesh", scene);
			const other = new Mesh("other", scene);

			const particleSystem = new ParticleSystem("particles", 1, scene);
			particleSystem.emitter = mesh;

			const animation = new Animation("animation", "position.x", 60, Animation.ANIMATIONTYPE_FLOAT);
			animation.setKeys([
				{ frame: 0, value: 0 },
				{ frame: 60, value: 1 },
			]);

			const group = new AnimationGroup("group", scene);
			group.addTargetedAnimation(animation, mesh);
			group.addTargetedAnimation(animation.clone(), other);

			deleteNode(scene, { nodeId: mesh.id }, options);

			expect(scene.particleSystems).not.toContain(particleSystem);
			expect(group.targetedAnimations.map((targetedAnimation) => targetedAnimation.target)).toEqual([other]);

			undo();

			expect(scene.particleSystems).toContain(particleSystem);
			expect(group.targetedAnimations.map((targetedAnimation) => targetedAnimation.target)).toContain(mesh);
		});

		test("should remove several nodes in a single undo step", () => {
			const a = new Mesh("a", scene);
			const b = new Mesh("b", scene);

			deleteNode(scene, { nodeIds: [a.id, b.id] }, options);

			expect(stack.length).toBe(1);
			expect(scene.meshes).toEqual([]);

			undo();

			expect(scene.meshes).toHaveLength(2);
		});

		test("should not restore twice a node listed with its ancestor", () => {
			const parent = new Mesh("parent", scene);
			const child = new Mesh("child", scene);
			child.parent = parent;

			deleteNode(scene, { nodeIds: [parent.id, child.id] }, options);
			undo();

			expect(scene.meshes.filter((mesh) => mesh === child)).toHaveLength(1);
		});

		test("should not restore twice an instance listed with its source mesh", () => {
			const source = MeshBuilder.CreateBox("source", {}, scene);
			const instance = source.createInstance("instance");

			deleteNode(scene, { nodeIds: [source.id, instance.id] }, options);
			undo();

			expect(scene.meshes.filter((mesh) => mesh === instance)).toHaveLength(1);
			expect(source.instances.filter((i) => i === instance)).toHaveLength(1);
		});

		test("should remove the lights of the clustered light container", () => {
			const light = new PointLight("light", Vector3.Zero(), scene);
			container.addLight(light);

			deleteNode(scene, { nodeId: light.id }, options);
			expect(container.lights).not.toContain(light);
			expect(scene.lights).not.toContain(light);

			undo();
			expect(container.lights).toContain(light);
		});

		test("should refuse the clustered light container and the nodes internal to the editor", () => {
			const camera = new EditorCamera("Editor preview", Vector3.Zero(), scene);

			expect(() => deleteNode(scene, { nodeId: container.id }, options)).toThrow("belongs to the editor");
			expect(() => deleteNode(scene, { nodeId: camera.id }, options)).toThrow("internal to the editor");

			expect(container.isDisposed()).toBe(false);
			expect(scene.cameras).toContain(camera);
		});

		test("should fail for an unknown node", () => {
			expect(() => deleteNode(scene, { nodeId: "unknown" }, options)).toThrow("Node not found: unknown");
		});
	});

	describe("clone_node", () => {
		test("should clone a node with its children, giving them their own ids, with undo/redo support", () => {
			const parent = new TransformNode("parent", scene);
			const child = new Mesh("child", scene);
			child.parent = parent;

			const summary = cloneGraphNode(scene, { nodeId: parent.id, name: "copy" }, options);
			const clone = scene.getTransformNodeById(summary.id)!;

			expect(clone.name).toBe("copy");
			expect(clone.id).not.toBe(parent.id);
			expect(clone.getDescendants(true)).toHaveLength(1);
			expect(clone.getDescendants(true)[0].id).not.toBe(child.id);

			undo();
			expect(scene.transformNodes).not.toContain(clone);

			redo();
			expect(scene.transformNodes).toHaveLength(2);
		});

		// Mesh.clone keeps the last parent it gave to a cloned child, and uses it for the next clone.
		test("should keep the parent of the source for each clone", () => {
			const root = new Mesh("root", scene);
			const child = new Mesh("child", scene);
			child.parent = root;

			const first = cloneGraphNode(scene, { nodeId: root.id }, options);
			const second = cloneGraphNode(scene, { nodeId: root.id }, options);

			expect(first.parentId).toBeNull();
			expect(second.parentId).toBeNull();
			expect(scene.rootNodes.map((node) => node.id)).toContain(second.id);
		});

		// InstancedMesh.clone erases the instanced buffers, and selecting the source mesh then throws.
		test("should keep the instanced buffers of the cloned instances", () => {
			const group = new Mesh("group", scene);

			const source = MeshBuilder.CreateBox("source", {}, scene);
			source.registerInstancedBuffer("selection", 1);

			const instance = source.createInstance("instance");
			instance.parent = group;

			const summary = cloneGraphNode(scene, { nodeId: group.id }, options);
			const clone = scene.getMeshById(summary.id)!.getDescendants(true)[0] as any;

			expect(clone.getClassName()).toBe("InstancedMesh");
			expect(clone.instancedBuffers).toBeTruthy();
			expect(() => source.registerInstancedBuffer("selection", 1)).not.toThrow();
		});

		test("should refuse what the graph can't clone", () => {
			new Skeleton("skeleton", "skeleton-id", scene);

			expect(() => cloneGraphNode(scene, { nodeId: container.id }, options)).toThrow("can't be cloned");
			expect(() => cloneGraphNode(scene, { nodeId: "skeleton-id" }, options)).toThrow("can't be cloned");
			expect(stack.length).toBe(0);
		});
	});

	describe("clone_mesh", () => {
		// The save of the scene names the file of each mesh after its id: clones with the same id overwrite each other.
		test("should give each clone its own id", () => {
			const mesh = new Mesh("mesh", scene);

			const a = cloneMesh(scene, { sourceNodeId: mesh.id, name: "clone" }, options);
			const b = cloneMesh(scene, { sourceNodeId: mesh.id, name: "clone" }, options);

			expect(a.id).not.toBe(b.id);
		});
	});

	describe("while the game plays", () => {
		// The undo/redo stack is disabled while playing: the changes would silently do nothing.
		test.each([
			["rename_node", (id: string) => renameNode(scene, { nodeId: id, newName: "new" }, options)],
			["set_node_parent", (id: string) => setNodeParent(scene, { nodeId: id }, options)],
			["delete_node", (id: string) => deleteNode(scene, { nodeId: id }, options)],
			["clone_node", (id: string) => cloneGraphNode(scene, { nodeId: id }, options)],
		])("%s should fail", (_, action) => {
			const mesh = new Mesh("mesh", scene);

			editor.layout.preview.play.scene = scene;

			expect(() => action(mesh.id)).toThrow("stop_scene");
			expect(scene.meshes).toEqual([mesh]);
		});
	});

	describe("reading and selecting", () => {
		test("get_node should find the clustered lights and summarize the other objects of the graph", () => {
			const light = new PointLight("light", Vector3.Zero(), scene);
			container.addLight(light);

			new Skeleton("skeleton", "skeleton-id", scene);

			expect(getNode(scene, { nodeId: light.id }).className).toBe("PointLight");
			expect(getNode(scene, { nodeId: "skeleton-id" })).toEqual({ id: "skeleton-id", name: "skeleton", className: "Skeleton" });
		});

		test("get_node should still read the nodes internal to the editor", () => {
			const camera = new EditorCamera("Editor preview", Vector3.Zero(), scene);

			expect(getNode(scene, { nodeId: camera.id }).className).toBe("EditorCamera");
		});

		test("select_node should select the objects of the graph which aren't nodes", () => {
			const particleSystem = new ParticleSystem("particles", 1, scene);
			particleSystem.id = "particles-id";

			expect(selectNode(scene, { nodeId: "particles-id" }, options)).toEqual({ selected: true });
			expect(editor.layout.graph.setSelectedNode).toHaveBeenCalledWith(particleSystem);
			expect(editor.layout.preview.gizmo.setAttachedObject).not.toHaveBeenCalled();
		});
	});

	describe("graph refresh", () => {
		test("set_node_properties should refresh the graph for what it shows, then select the node", async () => {
			const mesh = new Mesh("mesh", scene);

			setNodeProperties(scene, { nodeId: mesh.id, properties: { isEnabled: false } }, options);

			expect(mesh.isEnabled(false)).toBe(false);
			expect(editor.layout.graph.refresh).toHaveBeenCalledTimes(1);

			// Selected once refreshed: selecting earlier would restore the nodes of the graph from before the refresh.
			expect(editor.layout.graph.setSelectedNode).not.toHaveBeenCalled();
			await Promise.resolve();
			expect(editor.layout.graph.setSelectedNode).toHaveBeenCalledWith(mesh);
		});

		test("set_node_properties should set the flags of the graph on a node without metadata", () => {
			const transformNode = new TransformNode("transformNode", scene);

			expect(transformNode.metadata).toBeNull();
			setNodeProperties(scene, { nodeId: transformNode.id, properties: { "metadata.isLocked": true } }, options);
			expect(transformNode.metadata.isLocked).toBe(true);
		});

		test("set_node_properties should not refresh the graph for the rest", () => {
			const mesh = new Mesh("mesh", scene);

			setNodeProperties(scene, { nodeId: mesh.id, properties: { isVisible: false } }, options);

			expect(editor.layout.graph.refresh).not.toHaveBeenCalled();
			expect(editor.layout.graph.setSelectedNode).toHaveBeenCalledWith(mesh);
		});

		test("set_mesh_visibility should refresh the graph when the enabled state changes", () => {
			const mesh = new Mesh("mesh", scene);

			setMeshVisibility(scene, { nodeId: mesh.id, isVisible: false }, options);
			expect(editor.layout.graph.refresh).not.toHaveBeenCalled();

			setMeshVisibility(scene, { nodeId: mesh.id, isEnabled: false }, options);
			expect(editor.layout.graph.refresh).toHaveBeenCalledTimes(1);
		});
	});
});
