import { dirname, join } from "path";
import { exec } from "child_process";
import { readFile, unlink } from "fs/promises";

export async function convertToGlbUsingAssimp(inputFilename: string) {
	if (!process.env.ASSIMP_BIN_PATH) {
		return null;
	}

	const inputFile = join(process.cwd(), "converter_temp", inputFilename);
	const outputFile = join(process.cwd(), "converter_temp", `${inputFilename}.glb`);
	const command = `./assimp export "${inputFile}" "${outputFile}"`;

	console.log(command);

	const result = await new Promise<boolean>((resolve) => {
		const p = exec(
			command,
			{
				cwd: dirname(process.env.ASSIMP_BIN_PATH as string),
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
