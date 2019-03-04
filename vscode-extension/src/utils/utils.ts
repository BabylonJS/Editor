import { networkInterfaces } from 'os';
import { join } from 'path';
import { readFile } from 'fs';

import { WebviewPanel, Uri, window } from 'vscode';

export default class Utils {
    // Public members
    public static ExtensionPath: string = '';

    /**
     * Returns the current Ip of the user
     */
    public static GetIp (): string {
        const interfaces = networkInterfaces();

        if (interfaces['Wi-Fi']) { // Wi-fi?
            for (const j of interfaces['Wi-Fi']) {
                if (!j.internal && j.family === 'IPv4') {
                    return j.address;
                }
            }
        }

        for (const i in interfaces) { // Other?
            for (const j of interfaces[i]) {
                if (!j.internal && j.family === 'IPv4') {
                    return j.address;
                }
            }
        }
    }

    /**
     * Generates a nonce for scripts and styles in webviews
     */
    public static GetNonce (): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < 32; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    /**
     * Sets html of the given webview panel
     * @param panel the panel to setup
     * @param url the url of the webview page
     */
    public static async SetWebViewHtml (panel: WebviewPanel, url: string): Promise<void> {
        const basePath = Uri.parse(join(this.ExtensionPath)).with({ scheme: 'vscode-resource' });
        const content = await new Promise<string>((resolve, reject) => {
            readFile(join(this.ExtensionPath, url), (err, buffer) => {
                if (err) return reject(err);
                resolve(buffer.toString()
                              .replace(/{{base}}/g, basePath.toString())
                              .replace(/{{nonce}}/g, this.GetNonce())
                              .replace(/{{ip}}/g, Utils.GetIp())
                );
            });
        });
        panel.webview.html = content;
    }

    /**
     * Listens for common commands of the given webview panel
     * @param panel the panel to setup
     * @param url the url of the webview page
     */
    public static SetWebViewCommands (panel: WebviewPanel, url: string): void {
        panel.webview.onDidReceiveMessage(m => {
            switch (m.command) {
                case 'notify': return window.showInformationMessage(m.text);
                case 'notifyError': return window.showInformationMessage(m.text);
                case 'refresh': return this.SetWebViewHtml(panel, url);
                default: break;
            }
        });
    }
}
