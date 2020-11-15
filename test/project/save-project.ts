import * as assert from "assert";
import { NullEngine, Scene } from "babylonjs";
import "babylonjs-materials";

import { TestApp } from "../app";

describe("Editor - Save project and get same result when reload", async function() {
    this.timeout(600000);

    const testApp = new TestApp();
    const engine = new NullEngine();
    const scene = new Scene(engine);

    before(async function() {
        await testApp.start();
        await testApp.loadWorkspace();
    });

    after(async function() {
        await testApp.stop();

        scene.dispose();
        engine.dispose();
    });

    it("should generate the scene", async function() {
        await testApp.execute(`editor.scene.getMeshByName("cube").position.set(1, 1, 1)`);
        await testApp.execute(`editor.scene.getMeshByName("cube").rotation.set(0.5, 1, -0.25)`);
        
        await testApp.click("#toolbar-files");
        await testApp.click("#toolbar-save-project");
        await testApp.wait(4000);

        await testApp.click("#toolbar-files");
        await testApp.click("#toolbar-files-reload");
        await testApp.click("#confirm-yes-button");
        await testApp.click("#confirm-yes-button");
        
        await testApp.waitUntilRestart();
        await testApp.waitUntilProjectReady();

        assert.deepEqual(await testApp.execute(`editor.scene.getMeshByName("cube").position.asArray()`), [1, 1, 1]);
        assert.deepEqual(await testApp.execute(`editor.scene.getMeshByName("cube").rotation.asArray()`), [0.5, 1, -0.25]);
    });

    it("should have outputed scene with the previous modifications", async function() {
        await testApp.execute("editor.runProject(0)");
        await testApp.waitUntil("editor._activityIndicator.state.enabled === false");
        await testApp.wait(1000);

        // const rootUrl = "http://localhost:1338/scenes/scene/";
        // await SceneLoader.AppendAsync(rootUrl, "scene.babylon", scene);
    });
});
