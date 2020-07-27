import { BrowserWindow, WebContents } from "electron";
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";

export class DevTools {
    /**
     * Defines wether or not the extensions are enabled.
     */
    public static IsEnabled: boolean = false;

    /**
     * Applies the devtools.
     * @param enabled defines wehter or not the devtools are enabled.
     * @param webContents defines the reference to the webcontents of the main window used to open the devtools.
     */
    public static async Apply(enabled: boolean, webContents: WebContents): Promise<void> {
        try {
            if (enabled) {
                await installExtension(REACT_DEVELOPER_TOOLS);
                webContents.openDevTools({ mode: "right" });
            } else {
                BrowserWindow.removeDevToolsExtension("React Developer Tools");
                webContents.closeDevTools();
            }
        } catch (e) {
            // Catch silently;
        }

        this.IsEnabled = enabled;
    }
}
