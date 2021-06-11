import * as assert from "assert";

import { Tools } from "../../../../src/renderer/editor/tools/tools";
import { undoRedo, IUndoRedoAction } from "../../../../src/renderer/editor/tools/undo-redo";

describe("editor/tools/undo-redo", function() {
    let commonCalled: number;
    let undoCalled: number;
    let redoCalled: number;

    const createAction = () => ({
        common: () => commonCalled++,
        undo: () => undoCalled++,
        redo: () => redoCalled++,
        stackId: Tools.RandomId(),
    } as IUndoRedoAction);

    const createAsyncAction = () => ({
        common: () => new Promise<void>((resolve) => setTimeout(() =>{ commonCalled++; resolve(); }, 100)),
        undo: () => new Promise<void>((resolve) => setTimeout(() =>{ undoCalled++; resolve(); }, 100)),
        redo: () => new Promise<void>((resolve) => setTimeout(() =>{ redoCalled++; resolve(); }, 100)),
        stackId: Tools.RandomId(),
    } as IUndoRedoAction);

    beforeEach(function() {
        undoRedo.clear();

        commonCalled = 0;
        undoCalled = 0;
        redoCalled = 0;
    });

    it("should be empty by default", function() {
        assert.equal(undoRedo.stack.length, 0);
        assert.equal(undoRedo._position, -1);
    });

    it("should push a new element in the stack", async function() {        
        await undoRedo.push(createAction());
        assert.equal(redoCalled, 1);
        assert.equal(commonCalled, 1);
        assert.equal(undoCalled, 0);
    });

    it("should undo a pushed action", async function() {
        await undoRedo.push(createAction());
        await undoRedo.undo();

        assert.equal(undoCalled, 1);
    });

    it("should redo a pushed action", async function() {
        await undoRedo.push(createAction());
        await undoRedo.undo();

        await undoRedo.redo();

        assert.equal(redoCalled, 2);
    });

    it("should wait for async actions", async function() {
        this.timeout(5000);

        await undoRedo.push(createAsyncAction());
        await undoRedo.undo();

        assert.equal(redoCalled, 1);
        assert.equal(undoCalled, 1);
    });
});
