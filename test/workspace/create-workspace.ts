import { join } from "path";
import * as assert from "assert";
import { mkdir, pathExists } from "fs-extra";

import { TestApp } from "../app";

describe("Editor - Create Workspace", async function() {
    this.timeout(600000);

    const testApp = new TestApp();
    const distPath = join(testApp.workspaceDir, "dist");
    const scenePath = join(testApp.workspaceDir, "scenes/scene");

    before(async function() {
        await testApp.start();
        await mkdir(testApp.workspaceDir);

        console.log("Workspace available at: ", testApp.workspaceDir);
    });

    after(async function() {
        await testApp.stop();
    });

    beforeEach(async function() {
        await testApp.application.client.waitUntilWindowLoaded(10000);
        await testApp.waitUntilIsInitialized();
    });

    it("should create a new empty workspace", async function() {
        await testApp.click("#workspace.zip");
        await testApp.click("#wizard-next-0");

        testApp.setOpenDirectoryPath(testApp.workspaceDir);
        await testApp.click("#wizard-next-1");

        await testApp.waitUntilRestart();
    });

    it("should have loaded workspace and performed first build", async function() {
        const fileExists = await pathExists(testApp.workspacePath);
        assert.equal(fileExists, true);

        await testApp.waitUntilProjectReady();

        assert.equal(await pathExists(distPath), true);
        assert.equal(await pathExists(scenePath), true);
    });
});
