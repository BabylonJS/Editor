import { Application } from "spectron";
import { DialogAddon } from "spectron-dialog-addon";

import { join } from "path";
import { tmpdir, platform } from "os";

export class TestApp {
    /**
     * Defines the absolute path of the App.
     */
    public readonly appPath: string = join(__dirname, "..", "..");
    /**
     * Defines the absolute path to the workspace directory.
     */
    public readonly workspaceDir: string = join(tmpdir(), "babylonjs-editor-test");
    /**
     * Defines the absolute path to the workspace file.
     */
    public readonly workspacePath: string = join(this.workspaceDir, "workspace.editorworkspace");
    /**
     * Defines the reference to the application being driven.
     */
    public readonly application: Application = new Application({
        path: join(this.appPath, platform() === "darwin" ? "./node_modules/.bin/electron" : "./node_modules/.bin/electron.cmd"),
        args: [join(this.appPath)],
        env: {
            DRIVEN_TESTS: this.appPath,
        },
    });
    /**
     * Defines the reference to the dialog addon used to mock dialogs.
     */
    public readonly dialogAddon: DialogAddon = new DialogAddon();

    private _started: boolean = false;
    private _startPromise: Promise<Application>;

    /**
     * Constructor.
     */
    public constructor() {
        this.dialogAddon.apply(this.application);
    }

    /**
     * Starts the application.
     */
    public async start(): Promise<Application> {
        if (this._started) { return this._startPromise; }
        this._started = true;

        this._startPromise = this.application.start();
        await this._startPromise;

        return this.application;
    }

    /**
     * Stops the application.
     */
    public async stop(): Promise<Application> {
        await this.application.webContents.executeJavaScript(`require("babylonjs-editor").Confirm.Show = function() { return true; }`);
        return this.application.stop();
    }

    /**
     * Waits the given time in milliseconds.
     * @param timeMs defines the time in milliseconds to wait.
     */
    public async wait(timeMs: number): Promise<void> {
        return new Promise<void>((resolve) => {
            setTimeout(() => resolve(), timeMs);
        });
    }

    /**
     * Waits until the given request returns true.
     * @param request defines the javascript request to wait until the returned value is true.
     */
    public async waitUntil(request: string): Promise<void> {
        if (request.indexOf("editor.") === 0) {
            await this.waitUntil("window.editor !== undefined");
        }
        
        let isTrue = false;
        while (!isTrue) {
            isTrue = await this.application.webContents.executeJavaScript(request) ?? false;
            if (!isTrue) {
                await this.wait(1000);
            }
        }
    }

    /**
     * Waits until the editor restarts.
     */
    public waitUntilRestart(): Promise<void> {
        return this.waitUntil("window.editor === undefined");
    }

    /**
     * Waits until the editor is initialized.
     */
    public waitUntilIsInitialized(): Promise<void> {
        return this.waitUntil("editor.isInitialized");
    }

    /**
     * Waits until the editor has loaded the project.
     */
    public waitUntilProjectReady(): Promise<void> {
        return this.waitUntil("editor.isProjectReady");
    }

    /**
     * Loads the workspace.
     */
    public async loadWorkspace(): Promise<void> {
        await this.waitUntilIsInitialized();

        this.setOpenDirectoryPath(this.workspacePath);
        this.application.client.touchClick("#welcome-open-workspace");

        await this.waitUntilRestart();
        await this.waitUntilProjectReady();
    }

    /**
     * Closes all windows.
     */
    public async closeAllWindows(): Promise<void> {
        await this.application.webContents.executeJavaScript(`
            editor._pluginWindows.forEach((id) => require("babylonjs-editor").IPCTools.Send("closewindow", id));
            editor._pluginWindows = [];
        `);
        await this.wait(5000);
    }

    /**
     * Executes the given code.
     * @param request defines the javascript code to execute.
     */
    public async execute<T>(code: string): Promise<T> {
        return this.application.webContents.executeJavaScript(code);
    }

    /**
     * Performs a click on the given element.
     * @param query defines the query to get the element where to click.
     */
    public async click(query: string): Promise<void> {
        this.application.client.touchClick(query);
        return this.wait(1000);
    }

    /**
     * Mocks the open directory dialog.
     * @param path defines the path returned by the dialog.
     */
    public async setOpenDirectoryPath(path: string): Promise<void> {
        this.dialogAddon.mock([{ method: "showOpenDialog", value: { filePaths: [path] } }]);
    }

    /**
     * Mocks the open fome dialog.
     * @param path defines the path returned by the dialog.
     */
    public async setOpenFilePath(path: string): Promise<void> {
        this.dialogAddon.mock([{ method: "showOpenDialog", value: { filePaths: [path] } }]);
    }
}
