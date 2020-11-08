import * as assert from "assert";

import { TestApp } from "../app";

describe("Editor - Open Workspace", async function() {
    this.timeout(60000);

    const testApp = new TestApp();

    before(async function() {
        await testApp.start();
    });

    after(async function() {
        await testApp.stop();
    });

    beforeEach(async function() {
        await testApp.application.client.waitUntilWindowLoaded(10000);
        await testApp.waitUntilIsInitialized();
    });

    it("should open a workspace", async function() {
        testApp.setOpenDirectoryPath(testApp.workspacePath);
        await testApp.click("#welcome-open-workspace");

        await testApp.waitUntilRestart();
    });

    it("should have opened a workspace", async function() {
        const workspacePathRenderer = await testApp.application.webContents.executeJavaScript(`require("babylonjs-editor").WorkSpace.Path`);
        assert.equal(workspacePathRenderer, testApp.workspacePath);

        const meshesLength = await testApp.application.webContents.executeJavaScript("editor.scene.meshes.length");
        assert.equal(meshesLength > 0, true);

        await testApp.waitUntilProjectReady();
    });
});