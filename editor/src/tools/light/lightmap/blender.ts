import { platform } from "os";
import { join } from "path/posix";
import { spawn } from "child_process";
import { pathExists, readdir } from "fs-extra";

import { Editor } from "../../../editor/main";

import { CancellationToken } from "../../tools";

let blenderExec = "";
let blenderDir = "";

export async function locateBlenderApp(editor: Editor) {
	switch (platform()) {
		case "darwin":
			if (await pathExists("/Applications/Blender.app/Contents/MacOS/Blender")) {
				blenderExec = "./Blender";
				blenderDir = "/Applications/Blender.app/Contents/MacOS";
				editor.layout.console.log("Blender found at /Applications/Blender.app");
			}
			break;

		case "win32":
			const directories = await readdir("C:/Program Files/Blender Foundation");
			const blenderPath = directories.find((name) => name.startsWith("Blender"));
			if (blenderPath && (await pathExists(join("C:/Program Files/Blender Foundation", blenderPath, "blender.exe")))) {
				blenderExec = "blender.exe";
				blenderDir = join("C:/Program Files/Blender Foundation", blenderPath);
				editor.layout.console.log(`Blender found at ${blenderDir}`);
			}
			break;

		case "linux":
			// TODO
			break;
	}
}

export interface ILightmapBlenderExecuteOptions {
	command: string;
	meshesToComputeCount: number;
	cancellationToken: CancellationToken;

	onGetLog: (log: string) => void;
	onProgress: (progress: number) => void;
}

export async function executeBlender(editor: Editor, options: ILightmapBlenderExecuteOptions) {
	if (!blenderDir || !blenderExec) {
		await locateBlenderApp(editor);
	}

	if (!blenderDir || !blenderExec) {
		editor.layout.console.error("Failed to locate Blender executable.");
		return false;
	}

	let progress = 0;
	const step = 1 / options.meshesToComputeCount;

	const result = await new Promise<void>((resolve) => {
		const p = spawn(`"${blenderExec}"`, [options.command], {
			shell: true,
			windowsHide: true,
			cwd: blenderDir || process.cwd(),
		});

		p.on("close", () => {
			resolve();
		});

		p.stdout.on("data", (data) => {
			const logValues = data?.toString().trim().split("\n") as string[] | undefined;
			logValues?.forEach((value) => {
				const matches = value.match(/editor_log: /g);
				if (matches) {
					options.onGetLog(`${value.replace("editor_log: ", "")}\n`);
					options.onProgress?.((progress += step * matches.length));
				}
			});
		});

		setInterval(() => {
			if (options.cancellationToken?.isCancelled) {
				p.kill(0);
				resolve();
			}
		}, 500);
	});

	return result;
}
