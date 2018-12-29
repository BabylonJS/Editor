import { app, BrowserWindow, globalShortcut, Menu, MenuItemConstructorOptions } from 'electron';
import WebServer from './web-server';
import ScenePreview from './preview-scene';
import Settings from './settings/settings';

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
        this.Server = new WebServer(1337);

        // Create Scene Preview
        this.ScenePreview = new ScenePreview(this.Server);

        // Create short cuts
        this.CreateShortcutsAndMenu();

        // Finish, listen server
        this.Server.listen(1337);
    }

    /**
     * Creates a new window
     */
    public static CreateWindow (): Promise<void> {
        Settings.OpenedFile = process.argv[1];
        
        return new Promise<void>((resolve) => {
            this.Window = new BrowserWindow({
                width: 800,
                height: 600,
                title: 'Babylon.js Editor',
                webPreferences: {
                    scrollBounce: true,
                    nodeIntegration: false,
                    nativeWindowOpen: true
                }
            });

            this.Window.loadURL('file://' + __dirname + '/../../index-debug.html');

            if (process.env.DEBUG)
                this.Window.webContents.openDevTools();
            
            this.Window.webContents.once('did-finish-load', () => {
                resolve();
            });
            this.Window.maximize();
            this.Window.on('closed', () => app.quit());
        });
    }

    /**
     * Creates the short cuts
     */
    public static CreateShortcutsAndMenu (): void {
        // Short cuts
        globalShortcut.register('CommandOrControl+ALT+I', () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
                win.webContents.openDevTools({
                    mode: 'detach'
                });
            }
        });

        // Menu
        /*
        var template = <MenuItemConstructorOptions[]> [{
            label: 'Babylon.js Editor',
            submenu: [
                { label: 'About Application', selector: 'orderFrontStandardAboutPanel:' },
                { type: 'separator' },
                { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
            ]}, {
            label: 'Edit',
            submenu: [
                { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
                { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
                { type: 'separator' },
                { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
                { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
                { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
                { type: 'separator' },
                { label: 'Close', accelerator: 'CmdOrCtrl+W', click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win && win !== this.Window)
                        win.close();
                } }
            ]}
        ];
    
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
        */
        Menu.setApplicationMenu(null);
    }
}

/**
 * Make single instance
 */
const shouldQuit = app.makeSingleInstance((argv, wd) => {
    if (EditorApp.Window) {
        if (EditorApp.Window.isMinimized())
            EditorApp.Window.restore();

        EditorApp.Window.focus();

        const filename = argv[1];
        if (filename !== Settings.OpenedFile) {
            Settings.OpenedFile = filename;
            EditorApp.Window.reload();
        }
    }
});

/**
 * Events
 */
if (!shouldQuit) {
    app.on("window-all-closed", async () => {
        if (process.platform !== "darwin")
            app.quit();
    });

    app.on("ready", () => EditorApp.Create());
    app.on("activate", () => EditorApp.Window || EditorApp.Create());
}
