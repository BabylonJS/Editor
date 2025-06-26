import { join } from "path";
import { platform } from "os";
import { exec } from "child_process";
import { readFile, unlink } from "fs/promises";

export async function convertFbx2GltfUsingBlender(filename: string) {
	return executeBlender("fbx2gltf.py", filename, `${filename}.glb`);
}

export async function convertBlender2GltfUsingBlender(filename: string) {
	return executeBlender("blender2gltf.py", filename, `${filename}.glb`);
}

export async function executeBlender(pythonScript: string, inputFilename: string, outputFilename: string) {
	let blenderDir = "";
	let blenderExec = "blender";

	switch (platform()) {
	case "darwin":
		blenderExec = "./Blender";
		blenderDir = "/Applications/Blender.app/Contents/MacOS";
		break;

	case "win32":
		blenderExec = "blender.exe";
		blenderDir = "C:/Program Files/Blender Foundation/Blender 4.1";
		break;
	}

	const script = join(process.cwd(), "scripts", pythonScript);
	const inputFile = join(process.cwd(), "converter_temp", inputFilename);
	const outputFile = join(process.cwd(), "converter_temp", outputFilename);
	const command = `${blenderExec} --background --python "${script}" -- "${inputFile}" "${outputFile}"`;

	console.log(command);

	const result = await new Promise<boolean>((resolve) => {
		const p = exec(
			command,
			{
				windowsHide: true,
				cwd: blenderDir || process.cwd(),
			},
			async (error) => {
				if (error) {
					console.error(error);
					resolve(false);
				} else {
					resolve(true);
				}
			});

		p.stdout?.pipe(process.stdout);
		p.stderr?.pipe(process.stderr);
	});

	try {
		await unlink(inputFile);
	} catch (e) {
		// Catch silently.
	}

	if (!result) {
		return null;
	}

	try {
		const buffer = await readFile(outputFile);
		await unlink(outputFile);
		return buffer;
	} catch (e) {
		return null;
	}
}
