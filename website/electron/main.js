"use strict";
var electron = require("electron");
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var mainWindow;
var createWindow = function () {
    // Create window
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            scrollBounce: true
        }
    });
    mainWindow.loadURL("file://" + __dirname + "/../index.html");
    mainWindow.webContents.openDevTools();
    mainWindow.maximize();
    mainWindow.on("closed", function () {
        app.quit();
    });
};
app.on("ready", createWindow);
app.on("window-all-closed", function () {
    if (process.platform !== "darwin")
        app.quit();
});
app.on("activate", function () {
    if (mainWindow === null)
        createWindow();
});
