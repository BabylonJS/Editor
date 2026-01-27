import os from "node:os";
import { normalizedGlob } from "./fs.mjs";
import { join } from "node:path/posix";

export let pvrTexToolAbsolutePath: string | undefined;

export async function locatePVRTexTool() {
	if (process.env.PVRTexToolCLI) {
		return (pvrTexToolAbsolutePath = process.env.PVRTexToolCLI);
	}

	const platform = os.platform();

	let absolutePathToCheck: string | null = null;
	switch (platform) {
		case "darwin":
			absolutePathToCheck = "/Applications/Imagination/";
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
	}

	return undefined;
}
