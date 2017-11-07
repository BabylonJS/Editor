import { app, BrowserWindow } from 'electron';
import WebServer from './web-server';
import ScenePreview from './preview-scene';

export default class EditorApp {
    // Static members
    public static Window: BrowserWindow = null;
    public static Server: WebServer = null;
    public static ScenePreview: ScenePreview = null;

    /**
     * Creates a new Electron window
     */
    public static async Create (): Promise<void> {
        // Create window
        await this.CreateWindow();

        // Create web server
        this.Server = new WebServer(1337, {
            cache: 0,
            root: process.cwd()
        });

        // Create Scene Preview
        this.ScenePreview = new ScenePreview(this.Server);
    }

    /**
     * Creates a new window
     */
    public static CreateWindow (): Promise<void> {
        return new Promise<void>((resolve) => {
            this.Window = new BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                    scrollBounce: true,
                    nodeIntegration: false
                }
            });

            this.Window.loadURL("file://" + __dirname + "/../../index.html");
            //this.Window.webContents.openDevTools();
            this.Window.webContents.once('did-finish-load', () => {
                resolve();
            });
            this.Window.maximize();
            this.Window.on("closed", () => app.quit());
        });
    }
}

/**
 * Events
 */
app.on("window-all-closed", async () => {
    await EditorApp.Server.stop();
    
    if (process.platform !== "darwin")
        app.quit();
});

app.on("ready", () => EditorApp.Create());
app.on("activate", () => EditorApp.Window || EditorApp.Create());
