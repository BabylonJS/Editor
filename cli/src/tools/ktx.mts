import os from "node:os";
import { join } from "node:path/posix";

import { normalizedGlob } from "./fs.mjs";

export let pvrTexToolAbsolutePath: string | undefined;

export function setPVRTexToolAbsolutePath(absolutePath: string) {
	pvrTexToolAbsolutePath = absolutePath;
}

export async function locatePVRTexTool() {
	if (process.env.PVRTexToolCLI) {
		return (pvrTexToolAbsolutePath = process.env.PVRTexToolCLI);
	}

	const platform = os.platform();

	let absolutePathToCheck: string | null = null;
	switch (platform) {
		case "darwin":
			absolutePathToCheck = "/Applications/Imagination/";
			break;
		case "win32":
			absolutePathToCheck = "C:/Imagination Technologies/";
			break;
		default:
			break;
	}

	if (!absolutePathToCheck) {
		return undefined;
	}

	const files = await normalizedGlob(join(absolutePathToCheck, "**"), {
		nodir: true,
	});

	switch (platform) {
		case "darwin":
			return (pvrTexToolAbsolutePath = files.find((file) => file.endsWith("macOS/PVRTexToolCLI")));
		case "win32":
			return (pvrTexToolAbsolutePath = files.find((file) => file.endsWith("Windows_x86_64/PVRTexToolCLI.exe")));
	}

	return undefined;
}
