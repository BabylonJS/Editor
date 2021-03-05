import { BrowserWindowConstructorOptions, BrowserWindow } from "electron";
import { Undefinable } from "../../shared/types";

export interface IWindowDefinition {
	options: BrowserWindowConstructorOptions;
	url: string;
	autofocus: boolean;
}

export class WindowsHandler {
	private static _Windows: BrowserWindow[] = [];

	/**
	 * Creates a new window on demand taking the following definition.
	 * @param definition defines the definition of the window (page url, dimensiosn, etc.)
	 */
	public static async CreateWindowOnDemand(definition: IWindowDefinition): Promise<BrowserWindow> {
		const window = this._CreateWindow(definition.options);
		await this._SetWindowURL(window, definition.url);

		if (process.env.DEBUG) {
			window.webContents.openDevTools();
		}

		if (definition.autofocus) {
			window.focus();
		}

		window.setMenuBarVisibility(false);

		return window;
	}

	/**
	 * Finds the window according to the given id and returns its reference.
	 * @param id defines the id of the window to find.
	 */
	public static GetWindowById(id: number): Undefinable<BrowserWindow> {
		return this._Windows.find((w) => w.id === id);
	}

	/**
	 * Finds the window according to the given web contents id and returns its reference.
	 * @param id defines the id of the webcontents to find.
	 */
	public static GetWindowByWebContentsId(id: number): Undefinable<BrowserWindow> {
		return this._Windows.find((w) => w.webContents?.id === id);
	}

	/**
	 * Closes the window identified by the given id.
	 * @param id defines the id of the window to close.
	 */
	public static CloseWindow(id: number): void {
		const index = this._Windows.findIndex((w) => w.id === id);
		if (index === -1) { return; }

		this._Windows[index].close();
		this._Windows.splice(index, 1);
	}

	/**
	 * Sets the Url of the given window and waits until it finished loading.
	 */
	private static _SetWindowURL(window: BrowserWindow, url: string): Promise<void> {
		window.loadURL(url);
		return new Promise((resolve) => window.webContents.once("did-finish-load", resolve));
	}

	/**
	 * Creates a new window according to the given options/definitions.
	 */
	private static _CreateWindow(options: BrowserWindowConstructorOptions): BrowserWindow {
		let window = new BrowserWindow(options);
		this._Windows.push(window);

		window.on("closed", () => this._RemoveWindow(window));

		return window;
	}

	/**
	 * Removes the given window from the existing opened windows.
	 */
	private static _RemoveWindow(window: BrowserWindow): void {
		const index = this._Windows.findIndex((e) => e === window);
		this._Windows.splice(index, 1);
	}
}
