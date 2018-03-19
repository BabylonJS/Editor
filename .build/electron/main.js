"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const web_server_1 = require("./web-server");
const preview_scene_1 = require("./preview-scene");
class EditorApp {
    /**
     * Creates a new Electron window
     */
    static Create() {
        return __awaiter(this, void 0, void 0, function* () {
            // Create window
            yield this.CreateWindow();
            // Create web server
            this.Server = new web_server_1.default(1338);
            // Create Scene Preview
            this.ScenePreview = new preview_scene_1.default(this.Server);
            // Create short cuts
            this.CreateShortcutsAndMenu();
        });
    }
    /**
     * Creates a new window
     */
    static CreateWindow() {
        return new Promise((resolve) => {
            this.Window = new electron_1.BrowserWindow({
                width: 800,
                height: 600,
                title: 'Babylon.js Editor',
                webPreferences: {
                    scrollBounce: true,
                    nodeIntegration: false,
                    nativeWindowOpen: true
                }
            });
            this.Window.loadURL('file://' + __dirname + '/../../index.html');
            //this.Window.webContents.openDevTools();
            this.Window.webContents.once('did-finish-load', () => {
                resolve();
            });
            this.Window.maximize();
            this.Window.on('closed', () => electron_1.app.quit());
        });
    }
    /**
     * Creates the short cuts
     */
    static CreateShortcutsAndMenu() {
        // Short cuts
        electron_1.globalShortcut.register('CommandOrControl+ALT+I', () => {
            const win = electron_1.BrowserWindow.getFocusedWindow();
            if (win) {
                win.webContents.openDevTools({
                    mode: 'detach'
                });
            }
        });
        // Menu
        var template = [{
                label: 'Babylon.js Editor',
                submenu: [
                    { label: 'About Application', selector: 'orderFrontStandardAboutPanel:' },
                    { type: 'separator' },
                    { label: 'Quit', accelerator: 'Command+Q', click: () => electron_1.app.quit() }
                ]
            }, {
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
                            const win = electron_1.BrowserWindow.getFocusedWindow();
                            if (win && win !== this.Window)
                                win.close();
                        } }
                ]
            }
        ];
        electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(template));
    }
}
// Static members
EditorApp.Window = null;
EditorApp.Server = null;
EditorApp.ScenePreview = null;
exports.default = EditorApp;
/**
 * Events
 */
electron_1.app.on("window-all-closed", () => __awaiter(this, void 0, void 0, function* () {
    if (process.platform !== "darwin")
        electron_1.app.quit();
}));
electron_1.app.on("ready", () => EditorApp.Create());
electron_1.app.on("activate", () => EditorApp.Window || EditorApp.Create());
//# sourceMappingURL=main.js.map