import electron = require("electron");

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow: Electron.BrowserWindow;

var createWindow = () => {
    // Create window
    mainWindow = new BrowserWindow({ width: 800, height: 600 });
    mainWindow.loadURL("file://" + __dirname + "/../index.html");

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
