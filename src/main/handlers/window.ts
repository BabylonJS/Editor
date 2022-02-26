import { BrowserWindowConstructorOptions, BrowserWindow } from "electron";
import { Nullable, Undefinable } from "../../shared/types";

export interface IWindowDefinition {
	/**
	 * Defines the Url of the html file to load for the browser window.
	 */
	url: string;
	/**
	 * Defines wether or not the newly created browser window shoud be added as
	 * a tab in the main window.
	 * @platform `darwin`
	 */
	tabbed: boolean;
	/**
	 * Defines wether or not the newly created browser window is automatically focused.
	 */
	autofocus: boolean;
	/**
	 * Defines the options of the browser window to created.
	 */
	options: BrowserWindowConstructorOptions;
}

export class WindowsHandler {
	/**
	 * Defines the reference to the main window. This reference may be used to store the main window and add tabs to it when supported.
	 */
	public static MainWindow: Nullable<BrowserWindow> = null;

	private static _Windows: BrowserWindow[] = [];

	/**
	 * Creates a new window on demand taking the following definition.
	 * @param definition defines the definition of the window (page url, dimensiosn, etc.)
	 */
	public static async CreateWindowOnDemand(definition: IWindowDefinition): Promise<BrowserWindow> {
		const window = this._CreateWindow(definition);
		await this._SetWindowURL(window, definition.url);

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
	private static _CreateWindow(definition: IWindowDefinition): BrowserWindow {
		definition.options.backgroundColor = "#fff";

		let window = new BrowserWindow(definition.options);
		this._Windows.push(window);

		window.on("closed", () => this._RemoveWindow(window));

		if (definition.tabbed) {
			this.MainWindow?.addTabbedWindow?.(window);
		}
		
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
