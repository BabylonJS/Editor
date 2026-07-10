import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";

import { NullEngine, Scene, TransformNode } from "babylonjs";

vi.mock("babylonjs-editor-tools", () => ({}));

import { Editor } from "../../../../src/editor/main";
import { getObjectScene, isPlaySceneObject, isScenePlaying } from "../../../../src/tools/scene/play/runtime";

describe("tools/scene/play/runtime", () => {
	let engine: NullEngine;
	let scene: Scene;
	let playScene: Scene;
	let editor: Editor;

	beforeEach(() => {
		engine = new NullEngine();
		scene = new Scene(engine);
		playScene = new Scene(engine);

		editor = {
			layout: {
				preview: {
					scene,
					play: null,
				},
			},
		} as any;
	});

	afterEach(() => {
		scene.dispose();
		playScene.dispose();
		engine.dispose();
	});

	function setPlayComponent(options: { playing: boolean; loading?: boolean; preparingPlay?: boolean; scene?: Scene | null }): void {
		(editor.layout.preview as any).play = {
			state: {
				playing: options.playing,
				loading: options.loading ?? false,
				preparingPlay: options.preparingPlay ?? false,
			},
			scene: options.scene ?? null,
		};
	}

	describe("isScenePlaying", () => {
		test("should return false when the editor layout is not assigned yet", () => {
			expect(isScenePlaying({} as Editor)).toBe(false);
		});

		test("should return false when the play component is not available", () => {
			expect(isScenePlaying(editor)).toBe(false);
		});

		test("should return true when playing", () => {
			setPlayComponent({ playing: true, scene: playScene });
			expect(isScenePlaying(editor)).toBe(true);
		});

		test("should return true while the play is being prepared", () => {
			setPlayComponent({ playing: true, preparingPlay: true, scene: null });
			expect(isScenePlaying(editor)).toBe(true);
		});

		test("should return false when stopped", () => {
			setPlayComponent({ playing: false, scene: null });
			expect(isScenePlaying(editor)).toBe(false);
		});
	});

	describe("getObjectScene", () => {
		test("should return null when the object is null or undefined", () => {
			expect(getObjectScene(null)).toBeNull();
			expect(getObjectScene(undefined)).toBeNull();
		});

		test("should return null when the scene cannot be determined", () => {
			expect(getObjectScene({})).toBeNull();
		});

		test("should return the scene itself when the object is a scene", () => {
			expect(getObjectScene(scene)).toBe(scene);
		});

		test("should return the scene of a node", () => {
			const node = new TransformNode("node", scene);
			expect(getObjectScene(node)).toBe(scene);
		});

		test("should return the scene of a sound through its private reference", () => {
			const sound = {
				_scene: scene,
			};

			expect(getObjectScene(sound)).toBe(scene);
		});

		test("should return the scene of a sprite through its manager", () => {
			const sprite = {
				manager: {
					scene,
				},
			};

			expect(getObjectScene(sprite)).toBe(scene);
		});
	});

	describe("isPlaySceneObject", () => {
		test("should return false when the editor layout is not assigned yet", () => {
			const node = new TransformNode("node", scene);
			expect(isPlaySceneObject({} as Editor, node)).toBe(false);
		});

		test("should return false when no play scene is available", () => {
			const node = new TransformNode("node", scene);
			expect(isPlaySceneObject(editor, node)).toBe(false);

			setPlayComponent({ playing: true, scene: null });
			expect(isPlaySceneObject(editor, node)).toBe(false);
		});

		test("should return true for objects belonging to the play scene", () => {
			setPlayComponent({ playing: true, scene: playScene });

			const node = new TransformNode("node", playScene);
			expect(isPlaySceneObject(editor, node)).toBe(true);
		});

		test("should return false for objects of the edited scene while playing", () => {
			setPlayComponent({ playing: true, scene: playScene });

			const node = new TransformNode("node", scene);
			expect(isPlaySceneObject(editor, node)).toBe(false);
		});

		test("should return false for objects whose scene cannot be determined", () => {
			setPlayComponent({ playing: true, scene: playScene });

			expect(isPlaySceneObject(editor, {})).toBe(false);
			expect(isPlaySceneObject(editor, null)).toBe(false);
		});
	});
});
