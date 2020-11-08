import { join } from "path";
import rimraf from "rimraf";
import * as assert from "assert";
import { pathExists } from "fs-extra";

import { TestApp } from "../app";

describe("Editor - Generate", async function() {
    this.timeout(600000);

    const testApp = new TestApp();
    const distPath = join(testApp.workspaceDir, "dist");
    const scenePath = join(testApp.workspaceDir, "scenes/scene");

    before(async function() {
        await testApp.start();
        await testApp.loadWorkspace();

        rimraf.sync(distPath);
    });

    after(async function() {
        await testApp.stop();
    });

    it("should generate the scene", async function() {
        rimraf.sync(scenePath);

        await testApp.click("#generate-scene");
        await testApp.wait(4000);

        assert.equal(await pathExists(scenePath), true);
    });

    it("should generate the scene when saving project", async function() {
        rimraf.sync(scenePath);

        await testApp.click("#toolbar-files");
        await testApp.click("#toolbar-save-project");

        await testApp.wait(4000);

        assert.equal(await pathExists(scenePath), true);
    });

    it("should generate the scene when running the project", async function() {
        rimraf.sync(scenePath);

        await testApp.click("#play-game");
        await testApp.wait(4000);

        assert.equal(await pathExists(scenePath), true);
        await testApp.closeAllWindows();
    });

    it("should build project", async function() {
        await testApp.click("#toolbar-files");
        await testApp.click("#toolbar-build-project");
        await testApp.waitUntil("editor._activityIndicator.state.enabled === false");

        assert.equal(await pathExists(distPath), true);
    });

    it("should build and run project", async function() {
        rimraf.sync(distPath);
        rimraf.sync(scenePath);

        await testApp.click("#toolbar-files");
        await testApp.click("#toolbar-build-and-run-project");
        await testApp.waitUntil("editor._activityIndicator.state.enabled === false");

        await testApp.wait(5000);

        assert.equal(await pathExists(distPath), true);
        assert.equal(await pathExists(scenePath), true);

        await testApp.closeAllWindows();
    });
});
