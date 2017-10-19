import electron = require("electron");
import path = require('path');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow: Electron.BrowserWindow;

var createWindow = () => {
    // Create window
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            scrollBounce: true
        }
    });
    mainWindow.loadURL("file://" + __dirname + "/../index-debug.html");
    mainWindow.webContents.openDevTools();

    mainWindow.maximize();
    
    mainWindow.on("closed", () => {
        app.quit();
    });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});

app.on("activate", () => {
    if (mainWindow === null)
        createWindow();
});
