import { platform } from "os";
import { join } from "path/posix";
import { pathExists, readdir } from "fs-extra";

import { Editor } from "../../../editor/main";

import { CancellationToken } from "../../tools";
import { execNodePty } from "../../node-pty";

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

	const result = await new Promise<void>(async (resolve) => {
		const p = await execNodePty(`"${blenderExec}" ${options.command}`, {
			cwd: blenderDir || process.cwd(),
		});

		p.onGetDataObservable.add((data) => {
			console.log(data);
			options.onGetLog(`${data.replace("editor_log: ", "")}\n`);

			const matches = data.match(/Baking mesh: /g);
			if (matches) {
				options.onProgress?.((progress += step * matches.length));
			}
		});

		p.wait().then(() => resolve());

		setInterval(() => {
			if (options.cancellationToken?.isCancelled) {
				p.kill();
				resolve();
			}
		}, 500);
	});

	return result;
}
