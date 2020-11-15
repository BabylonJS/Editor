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

    const wait = () => new Promise<void>((resolve) => setTimeout(() => resolve(), 0));

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

    it("should undo/redo a full stack linearly", async function() {
        this.timeout(5000);

        undoRedo.push(createAction());
        undoRedo.push(createAsyncAction());
        undoRedo.push(createAction());

        await wait();
        await undoRedo._waitForPromise();
        assert.equal(redoCalled, 3);
        
        undoRedo.undo();
        undoRedo.undo();
        undoRedo.undo();
        await wait();
        await undoRedo._waitForPromise();
        assert.equal(undoRedo._position, -1);
        
        undoRedo.undo();
        await wait();
        await undoRedo._waitForPromise();
        assert.equal(undoCalled, 3);
        assert.equal(undoRedo._position, -1);
        
        undoRedo.redo();
        undoRedo.redo();
        await wait();
        await undoRedo._waitForPromise();
        assert.equal(redoCalled, 5);
        assert.equal(undoRedo._position, 1);

        undoRedo.undo();
        undoRedo.undo();
        undoRedo.undo();
        undoRedo.undo();
        undoRedo.undo();
        undoRedo.undo();
        undoRedo.undo();
        undoRedo.undo();
        undoRedo.undo();
        undoRedo.undo();
        await wait();
        await undoRedo._waitForPromise();
        assert.equal(undoRedo._position, -1);
    });

    it("should undo/redo modifying the stack on the fly", async function() {
        this.timeout(5000);

        undoRedo.push(createAction());
        undoRedo.push(createAsyncAction());
        undoRedo.push(createAction());

        await wait();
        await undoRedo._waitForPromise();

        undoRedo.undo();
        undoRedo.undo();
        await wait();
        await undoRedo._waitForPromise();

        assert.equal(undoCalled, 2);
        assert.equal(undoRedo._position, 0);
        assert.equal(undoRedo.stack.length, 3);

        await undoRedo.push(createAction());
        assert.equal(undoRedo._position, 1);
        assert.equal(undoRedo.stack.length, 2);

        undoRedo.undo();
        undoRedo.undo();
        undoRedo.push(createAction());
        await wait();
        await undoRedo._waitForPromise();

        assert.equal(undoRedo._position, 0);
        assert.equal(undoRedo.stack.length, 1);
    });
});
