import { describe, expect, test, afterEach, vi } from "vitest";

vi.mock("electron", () => ({
	shell: {
		beep: vi.fn(),
	},
}));

import { registerSimpleUndoRedo, stack, undo, redo, clearUndoRedo, registerUndoRedo } from "../../src/tools/undoredo";

import { shell } from "electron";

describe("tools/undoredo", () => {
	afterEach(() => {
		clearUndoRedo();
	});

	describe("registerSimpleUndoRedo", () => {
		test("should register simple a undo/redo configuration", () => {
			expect(stack.length).toBe(0);

			const o = {
				a: 43,
			};

			registerSimpleUndoRedo({
				object: o,
				property: "a",
				oldValue: 42,
				newValue: 43,
			});

			expect(stack.length).toBe(1);
			expect(o.a).toBe(43);

			undo();
			expect(o.a).toBe(42);
			expect(stack.length).toBe(1);

			redo();
			expect(o.a).toBe(43);
			expect(stack.length).toBe(1);
		});
	});

	describe("registerUndoRedo", () => {
		test("should register a callback based undo/redo configuration", () => {
			expect(stack.length).toBe(0);

			registerUndoRedo({
				executeRedo: true,
				undo: vi.fn(),
				redo: vi.fn(),
				onLost: vi.fn(),
				action: vi.fn(),
			});

			expect(stack.length).toBe(1);
			const undoRedoConfiguration = stack[0];

			expect(undoRedoConfiguration.redo).toHaveBeenCalledTimes(1);
			expect(undoRedoConfiguration.action).toHaveBeenCalledTimes(1);

			expect(undoRedoConfiguration.undo).not.toHaveBeenCalled();
			expect(undoRedoConfiguration.onLost).not.toHaveBeenCalled();

			undo();

			expect(undoRedoConfiguration.undo).toHaveBeenCalledTimes(1);
			expect(undoRedoConfiguration.action).toHaveBeenCalledTimes(2);

			registerUndoRedo({
				executeRedo: true,
				undo: vi.fn(),
				redo: vi.fn(),
				onLost: vi.fn(),
				action: vi.fn(),
			});

			expect(stack.length).toBe(1);
			expect(undoRedoConfiguration.onLost).toHaveBeenCalledTimes(1);
		});

		test("should remove oldest undo/redo configuration if stack is too long", () => {
			expect(stack.length).toBe(0);

			registerUndoRedo({
				executeRedo: true,
				undo: vi.fn(),
				redo: vi.fn(),
				onLost: vi.fn(),
				action: vi.fn(),
			});

			const undoRedoConfiguration = stack[0];

			for (let i = 0; i < 200; ++i) {
				registerUndoRedo({
					executeRedo: true,
					undo: vi.fn(),
					redo: vi.fn(),
					onLost: vi.fn(),
					action: vi.fn(),
				});

				undo();
				redo();
			}

			expect(stack.length).toBe(200);
			expect(stack[0]).not.toBe(undoRedoConfiguration);
		});
	});

	describe("clearUndoRedo", () => {
		test("should clear the undo/redo stack", () => {
			expect(stack.length).toBe(0);

			const o = {
				a: 43,
			};

			registerSimpleUndoRedo({
				object: o,
				property: "a",
				oldValue: 42,
				newValue: 43,
				onLost: vi.fn(),
			});

			const undoRedoConfiguration = stack[0];

			expect(stack.length).toBe(1);
			clearUndoRedo();
			expect(stack.length).toBe(0);
			expect(undoRedoConfiguration.onLost).toHaveBeenCalled();
		});
	});

	describe("undo", () => {
		test("should call shell.beep if there is no undo", () => {
			undo();
			expect(shell.beep).toHaveBeenCalledTimes(1);
			redo();
			expect(shell.beep).toHaveBeenCalledTimes(2);
		});
	});
});
