import { BrowserWindowConstructorOptions, BrowserWindow } from "electron";
import { Undefinable } from "../shared/types";

export interface IWindowDefinition {
	options: BrowserWindowConstructorOptions;
	url: string;
	autofocus: boolean;
}

export class WindowController {
	private static _Windows: BrowserWindow[] = [];

	/**
	 * Creates a new window on demand.
	 * @param definition the definition object that describes the new window being created.
	 */
	public static async WindowOnDemand(definition: IWindowDefinition): Promise<BrowserWindow> {
		const window = this._createWindow(definition.options);
		await this._setWindowURL(window, definition.url);

		if (process.env.DEBUG) {
			window.webContents.openDevTools();
		}

		if (definition.autofocus) {
			window.focus();
		}

		return window;
	}

	/**
	 * Finds the window according to the given id.
	 * @param id the id of the window to find.
	 */
	public static GetWindowByID(id: number): Undefinable<BrowserWindow> {
		return this._Windows.find((w) => w.id === id);
	}

	/**
	 * Closes the window identified by the given id.
	 * @param id the id of the window to close.
	 */
	public static CloseWindow(id: number): void {
		const index = this._Windows.findIndex((w) => w.id === id);
		if (index === -1) { return; }

		this._Windows[index].close();
		this._Windows.splice(index, 1);
	}

	private static _setWindowURL(window: BrowserWindow, url: string): Promise<void> {
		window.loadURL(url);
		return new Promise((resolve) => window.webContents.once('did-finish-load', resolve));
	}

	private static _createWindow(options: BrowserWindowConstructorOptions): BrowserWindow {
		let window = new BrowserWindow(options);
		this._Windows.push(window);
		window.on('closed', () => this._removeWindow(window));
		return window;
	}

	private static _removeWindow(window: BrowserWindow): void {
		const index = this._Windows.findIndex((e) => e === window);
		this._Windows.splice(index, 1);
	}
}
