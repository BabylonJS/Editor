import { platform } from "os";
import { ipcMain, shell } from "electron";
import { exec } from "child_process";
import { statSync } from "fs";

ipcMain.on("editor:trash-items", async (ev, items) => {
	const isWindows = platform() === "win32";
	items = items.map((item) => (isWindows ? item.replace(/\//g, "\\") : item.replace(/\\/g, "/")));

	try {
		await Promise.all(items.map((item) => shell.trashItem(item)));
		ev.returnValue = true;
	} catch (e) {
		console.error(e);
		ev.returnValue = false;
	}
});

ipcMain.on("editor:show-item", (_, item) => {
	const isWindows = platform() === "win32";
	item = isWindows ? item.replace(/\//g, "\\") : item.replace(/\\/g, "/");

	shell.showItemInFolder(item);
});

ipcMain.on("editor:open-in-external-editor", (_, item) => {
	const isWindows = platform() === "win32";
	item = isWindows ? item.replace(/\//g, "\\") : item.replace(/\\/g, "/");

	shell.openPath(item);
});

async function checkCommandAvailable(command: string): Promise<boolean> {
	return new Promise((resolve) => {
		exec(`${command} --version`, (error) => {
			resolve(!error);
		});
	});
}

async function openInIde(path: string, isDirectory: boolean): Promise<void> {
	const isWindows = platform() === "win32";
	const normalizedPath = isWindows ? path.replace(/\//g, "\\") : path.replace(/\\/g, "/");

	if (isDirectory) {
		// Try to open directory in IDEs
		const ideCommands = [
			{ command: "code", args: [normalizedPath] },
			{ command: "cursor", args: [normalizedPath] },
			{ command: "subl", args: [normalizedPath] }, // Sublime Text
		];

		// Try each IDE in order
		for (const ide of ideCommands) {
			if (await checkCommandAvailable(ide.command)) {
				const fullCommand = `${ide.command} "${normalizedPath}"`;
				exec(fullCommand, (error) => {
					if (error) {
						console.error(`Failed to open with ${ide.command}:`, error);
					}
				});
				return;
			}
		}

		// On macOS, try JetBrains IDEs (PhpStorm, WebStorm, IntelliJ IDEA)
		if (platform() === "darwin") {
			exec(`open -a "PhpStorm" "${normalizedPath}"`, (error) => {
				if (!error) return;
				exec(`open -a "WebStorm" "${normalizedPath}"`, (error) => {
					if (!error) return;
					exec(`open -a "IntelliJ IDEA" "${normalizedPath}"`, (error) => {
						if (!error) return;
						exec(`open -a "IntelliJ IDEA CE" "${normalizedPath}"`, (error) => {
							if (!error) return;
							// Fallback to shell.openPath
							shell.openPath(normalizedPath);
						});
					});
				});
			});
			return;
		}

		// On Windows, try JetBrains IDEs via CLI
		if (isWindows) {
			if (await checkCommandAvailable("phpstorm")) {
				exec(`phpstorm "${normalizedPath}"`, (error) => {
					if (error) {
						console.error("Failed to open with PhpStorm:", error);
					}
				});
				return;
			}
			if (await checkCommandAvailable("webstorm")) {
				exec(`webstorm "${normalizedPath}"`, (error) => {
					if (error) {
						console.error("Failed to open with WebStorm:", error);
					}
				});
				return;
			}
			if (await checkCommandAvailable("idea")) {
				exec(`idea "${normalizedPath}"`, (error) => {
					if (error) {
						console.error("Failed to open with IntelliJ IDEA:", error);
						shell.openPath(normalizedPath);
					}
				});
				return;
			}
		}

		// Fallback: open with default application
		shell.openPath(normalizedPath);
	} else {
		// For files, use shell.openPath which uses OS default application
		shell.openPath(normalizedPath);
	}
}

ipcMain.on("editor:open-with", async (_, item) => {
	try {
		const stats = statSync(item);
		const isDirectory = stats.isDirectory();
		await openInIde(item, isDirectory);
	} catch (e) {
		// If stat fails, try as directory first, then as file
		await openInIde(item, true);
	}
});
